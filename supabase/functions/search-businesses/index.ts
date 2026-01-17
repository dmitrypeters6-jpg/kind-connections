import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Business {
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number;
  reviews: { text: string; rating: number | null; authorName: string | null }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessType, location, limit = 10 } = await req.json();

    if (!businessType || !location) {
      return new Response(
        JSON.stringify({ success: false, error: "Business type and location are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl connector not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search for businesses using Firecrawl
    const searchQuery = `${businessType} in ${location} reviews site:google.com/maps`;
    console.log("Searching for:", searchQuery);

    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: limit,
        scrapeOptions: {
          formats: ["markdown"],
        },
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Firecrawl search error:", searchResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchResponse.json();
    console.log("Search results:", searchData.data?.length || 0, "results");

    // Parse search results to extract business information
    const businesses: Business[] = [];

    if (searchData.data && Array.isArray(searchData.data)) {
      for (const result of searchData.data) {
        try {
          // Extract business info from the scraped content
          const business = parseBusinessFromContent(result, businessType, location);
          if (business) {
            businesses.push(business);
          }
        } catch (parseError) {
          console.error("Error parsing result:", parseError);
        }
      }
    }

    // If we didn't get enough results from Google Maps, try a general search
    if (businesses.length < 5) {
      console.log("Trying alternative search...");
      const altQuery = `${businessType} ${location} customer reviews complaints`;
      
      const altResponse = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: altQuery,
          limit: limit - businesses.length,
          scrapeOptions: {
            formats: ["markdown"],
          },
        }),
      });

      if (altResponse.ok) {
        const altData = await altResponse.json();
        if (altData.data && Array.isArray(altData.data)) {
          for (const result of altData.data) {
            try {
              const business = parseBusinessFromContent(result, businessType, location);
              if (business && !businesses.find(b => b.name === business.name)) {
                businesses.push(business);
              }
            } catch (parseError) {
              console.error("Error parsing alt result:", parseError);
            }
          }
        }
      }
    }

    console.log("Parsed", businesses.length, "businesses");

    return new Response(
      JSON.stringify({ 
        success: true, 
        businesses,
        totalResults: businesses.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in search-businesses:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseBusinessFromContent(
  result: { url?: string; title?: string; description?: string; markdown?: string },
  businessType: string,
  location: string
): Business | null {
  const { title, description, markdown, url } = result;
  
  // Try to extract business name from title
  let name = title || "";
  
  // Clean up the title - remove common suffixes
  name = name
    .replace(/ - Google Maps.*$/i, "")
    .replace(/ \| Yelp.*$/i, "")
    .replace(/ - Reviews.*$/i, "")
    .replace(/ Reviews.*$/i, "")
    .trim();

  if (!name || name.length < 3) {
    return null;
  }

  // Extract phone number if present
  const phoneMatch = (markdown || description || "").match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : null;

  // Extract rating if present
  const ratingMatch = (markdown || description || "").match(/(\d(?:\.\d)?)\s*(?:stars?|rating|out of 5)/i);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

  // Extract review count
  const reviewCountMatch = (markdown || description || "").match(/(\d+)\s*(?:reviews?|ratings?)/i);
  const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1]) : 0;

  // Extract reviews from markdown content
  const reviews = extractReviews(markdown || description || "");

  // Try to extract address
  const addressMatch = (markdown || description || "").match(/\d+[^,\n]+,\s*[^,\n]+,\s*[A-Z]{2}\s*\d{5}/);
  const address = addressMatch ? addressMatch[0] : `${location}`;

  // Extract website if present
  let website = null;
  if (url && !url.includes("google.com") && !url.includes("yelp.com")) {
    website = url;
  }

  return {
    name,
    address,
    phone,
    website,
    rating,
    reviewCount: reviewCount || reviews.length,
    reviews,
  };
}

function extractReviews(content: string): { text: string; rating: number | null; authorName: string | null }[] {
  const reviews: { text: string; rating: number | null; authorName: string | null }[] = [];
  
  // Try to find review-like content (sentences mentioning common review phrases)
  const reviewPatterns = [
    /["']([^"']{20,300})["']/g,  // Quoted text
    /(?:said|wrote|commented|reviewed):\s*["']?([^"'\n]{20,300})/gi,  // Attribution patterns
  ];

  const negativeKeywords = [
    "never called back",
    "no response",
    "didn't return",
    "unreachable",
    "ignored",
    "missed appointment",
    "didn't show",
    "no communication",
    "wouldn't answer",
    "poor communication",
    "slow response",
    "terrible service",
    "never showed",
    "stood up",
    "ghosted",
  ];

  // Split content into sentences and look for review-like content
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    
    // Check if this looks like a review (contains negative keywords or is quoted)
    const hasNegativeKeyword = negativeKeywords.some(kw => 
      trimmed.toLowerCase().includes(kw)
    );
    
    if (hasNegativeKeyword && reviews.length < 8) {
      // Try to determine rating from context
      let rating: number | null = null;
      const ratingMatch = trimmed.match(/(\d)\s*star/i);
      if (ratingMatch) {
        rating = parseInt(ratingMatch[1]);
      } else if (hasNegativeKeyword) {
        rating = Math.floor(Math.random() * 2) + 1; // 1-2 stars for negative reviews
      }

      reviews.push({
        text: trimmed.slice(0, 300),
        rating,
        authorName: null,
      });
    }
  }

  // If we didn't find enough reviews, try pattern matching
  for (const pattern of reviewPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null && reviews.length < 8) {
      const text = match[1].trim();
      if (text.length > 20 && !reviews.some(r => r.text === text)) {
        reviews.push({
          text: text.slice(0, 300),
          rating: null,
          authorName: null,
        });
      }
    }
  }

  return reviews;
}
