import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

// Allow up to 60 seconds for Whisper transcription
export const maxDuration = 60;

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    timeout: 55_000, // 55s timeout to stay within Vercel's 60s limit
  });
}

/**
 * POST /api/transcribe
 * Accepts a FormData body with an "audio" file.
 * Converts to buffer and sends to OpenAI Whisper for transcription.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Convert the Web API File to a buffer, then to an OpenAI-compatible file
    // This avoids streaming issues in Vercel's serverless environment
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const file = await toFile(buffer, "recording.webm", {
      type: "audio/webm",
    });

    const transcription = await getOpenAI().audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (err: unknown) {
    console.error("Transcription error:", err);
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
