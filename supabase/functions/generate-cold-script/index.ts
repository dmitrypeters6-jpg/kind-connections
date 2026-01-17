import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateScriptRequest {
  business: {
    name: string;
    phone: string | null;
    address: string | null;
    problemType: string | null;
    summary: string | null;
  };
  userServices: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business, userServices } = await req.json() as GenerateScriptRequest;

    if (!business) {
      return new Response(
        JSON.stringify({ error: "Business data is required" }),
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

    const servicesText = userServices.length > 0 
      ? `The caller offers these services: ${userServices.join(", ")}.` 
      : "The caller offers communication and marketing solutions.";

    const systemPrompt = `You are an expert cold call script writer for agencies that help local businesses improve their customer communication. Write scripts that are:
- Natural and conversational (not robotic)
- Focused on helping, not selling
- Addressing specific pain points found in reviews
- Structured with clear stages: opener, problem acknowledgment, value proposition, soft close

${servicesText}

Create a cold call script with these sections:
1. **Opening** - Friendly intro, state who you are
2. **Hook** - Reference their specific communication issue
3. **Value Prop** - How you can help (briefly)
4. **Qualifying Question** - Engage them in conversation
5. **Soft Close** - Suggest next step (meeting, demo, etc.)
6. **Handle Objections** - 2-3 common objections with responses

Keep it natural and conversational. Include placeholders like [YOUR NAME] and [YOUR COMPANY].`;

    const userPrompt = `Generate a cold call script for calling:

Business: ${business.name}
${business.phone ? `Phone: ${business.phone}` : ''}
${business.address ? `Location: ${business.address}` : ''}
${business.problemType ? `Communication Issue: ${business.problemType}` : ''}
${business.summary ? `Details from reviews: ${business.summary}` : ''}

Create a personalized script that addresses their specific communication problems.`;

    console.log(`Generating cold call script for: ${business.name}`);

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
        temperature: 0.7,
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
        JSON.stringify({ error: "Script generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const script = aiResponse.choices?.[0]?.message?.content;

    if (!script) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "No script generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Script generated for ${business.name}`);

    return new Response(
      JSON.stringify({ script }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-cold-script function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
