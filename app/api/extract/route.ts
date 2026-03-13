import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Allow up to 60 seconds for GPT-4 extraction
export const maxDuration = 60;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

const SYSTEM_PROMPT = `You are a hospice marketing visit note parser.
Extract the following information from the note and return JSON only — no explanation, no markdown.

Fields:
- facility_name (string)
- facility_address (string — the full address including city and state of the facility. If not explicitly stated, use your knowledge to provide the most likely address for the facility mentioned. If you cannot determine it, use an empty string.)
- contact_name (string)
- contact_role (string)
- discussion_summary (string, 1-2 sentences)
- referral_signal (boolean — true if a potential patient referral is mentioned)
- follow_up_date (string — the date/time mentioned, or empty string if none)
- sentiment (one of: "positive", "neutral", "negative")

If a field cannot be determined, use an empty string (or false for referral_signal).`;

/**
 * POST /api/extract
 * Accepts JSON { transcription: string }.
 * Sends to GPT-4 and returns structured call log data.
 */
export async function POST(req: NextRequest) {
  try {
    const { transcription } = await req.json();

    if (!transcription) {
      return NextResponse.json(
        { error: "No transcription provided" },
        { status: 400 }
      );
    }

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: transcription },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0].message.content;
    const data = JSON.parse(content || "{}");

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("Extraction error:", err);
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
