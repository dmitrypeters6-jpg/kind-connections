import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Review {
  text: string;
  rating: number | null;
  authorName: string | null;
}

interface Business {
  name: string;
  reviews: Review[];
}

interface AnalysisResult {
  problemType: string | null;
  urgencyScore: number;
  summary: string;
  outreachMessage: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business } = await req.json() as { business: Business };
    
    if (!business || !business.reviews || business.reviews.length === 0) {
      return new Response(
        JSON.stringify({ error: "No business or reviews provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare reviews for analysis
    const reviewsText = business.reviews
      .map((r, i) => `Review ${i + 1} (${r.rating ? r.rating + '/5 stars' : 'no rating'}): "${r.text}"`)
      .join("\n\n");

    const systemPrompt = `You are an expert at analyzing business reviews to identify communication and responsiveness issues. Your job is to help sales agencies find businesses that need help with their customer communication.

Analyze the reviews and identify ANY of these communication red flags:
- Unanswered phone calls
- No callbacks or follow-ups
- Slow response times
- Missed appointments
- Poor communication about delays
- Unresponsive to emails/messages
- Difficulty reaching the business

Respond with a JSON object (no markdown, just raw JSON) with these fields:
- problemType: The main communication issue category (e.g., "No Callback", "Slow Response", "Missed Appointments", "Unreachable", "Poor Communication") or null if no issues found
- urgencyScore: A number from 1-10 indicating how urgent/severe the communication problem is (10 = extremely bad, 1 = minor issue, 5 = no clear issues)
- summary: A 1-2 sentence summary of the communication problems found (or a note if no issues)
- outreachMessage: A short, personalized cold outreach message (2-3 sentences) that an agency could send to this business, addressing their specific communication pain point. Make it helpful, not salesy.`;

    const userPrompt = `Analyze these reviews for "${business.name}":

${reviewsText}

Return your analysis as a JSON object.`;

    console.log(`Analyzing reviews for: ${business.name}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "No analysis returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response (handle potential markdown wrapping)
    let analysis: AnalysisResult;
    try {
      // Remove potential markdown code blocks
      const cleanContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a fallback analysis
      analysis = {
        problemType: null,
        urgencyScore: 5,
        summary: "Unable to analyze reviews automatically.",
        outreachMessage: `Hi! I noticed ${business.name} has some customer feedback. Would you be interested in discussing ways to improve your customer experience?`,
      };
    }

    console.log(`Analysis complete for ${business.name}:`, analysis);

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-reviews function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
