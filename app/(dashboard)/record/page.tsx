"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { formatDuration } from "@/utils/formatDuration";
import PageHeader from "@/components/PageHeader";
import type { ExtractedCallData } from "@/lib/types";

type Step = "record" | "processing" | "review" | "saved";

export default function RecordPage() {
  const recorder = useAudioRecorder();
  const router = useRouter();
  const [step, setStep] = useState<Step>("record");
  const [transcription, setTranscription] = useState("");
  const [extracted, setExtracted] = useState<ExtractedCallData | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Upload audio, transcribe, extract, and save to Supabase. */
  async function handleSubmit() {
    if (!recorder.audioBlob) return;
    setError(null);
    setStep("processing");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Upload audio to Supabase Storage
      const filename = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("voice-notes")
        .upload(filename, recorder.audioBlob, {
          contentType: "audio/webm",
        });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("voice-notes").getPublicUrl(filename);

      // 2. Transcribe via Whisper
      const audioFormData = new FormData();
      audioFormData.append(
        "audio",
        new File([recorder.audioBlob], "recording.webm", {
          type: "audio/webm",
        })
      );
      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: audioFormData,
      });
      const transcribeData = await transcribeRes.json();
      if (!transcribeRes.ok) throw new Error(transcribeData.error);
      setTranscription(transcribeData.text);

      // 3. Extract structured data via GPT-4
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription: transcribeData.text }),
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok) throw new Error(extractData.error);
      setExtracted(extractData);

      // 4. Save voice note
      const { data: voiceNote } = await supabase
        .from("voice_notes")
        .insert({
          user_id: user.id,
          audio_url: publicUrl,
          transcription: transcribeData.text,
        })
        .select()
        .single();

      // 5. Save call log
      await supabase.from("call_logs").insert({
        user_id: user.id,
        voice_note_id: voiceNote?.id,
        facility_name: extractData.facility_name || null,
        contact_name: extractData.contact_name || null,
        contact_role: extractData.contact_role || null,
        discussion_summary: extractData.discussion_summary || null,
        referral_signal: extractData.referral_signal ?? false,
        follow_up_date: extractData.follow_up_date || null,
        sentiment: extractData.sentiment || null,
      });

      setStep("review");
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("record");
    }
  }

  function handleDone() {
    setStep("saved");
    router.push("/calllogs");
  }

  function handleNewRecording() {
    recorder.reset();
    setTranscription("");
    setExtracted(null);
    setStep("record");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Record Visit"
        description="Record a voice note after your referral visit. AI will extract structured data automatically."
      />

      {/* Recording UI */}
      {step === "record" && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          {/* Timer */}
          <div className="mb-6 text-5xl font-mono font-light text-gray-700">
            {formatDuration(recorder.duration)}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {!recorder.isRecording && !recorder.audioBlob && (
              <button
                onClick={recorder.start}
                className="rounded-full bg-red-500 px-8 py-3 text-sm font-medium text-white shadow-md hover:bg-red-600"
              >
                Start Recording
              </button>
            )}

            {recorder.isRecording && (
              <button
                onClick={recorder.stop}
                className="rounded-full bg-gray-800 px-8 py-3 text-sm font-medium text-white shadow-md hover:bg-gray-900"
              >
                Stop Recording
              </button>
            )}

            {recorder.audioBlob && !recorder.isRecording && (
              <>
                <button
                  onClick={handleNewRecording}
                  className="rounded-full border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Re-record
                </button>
                <button
                  onClick={handleSubmit}
                  className="rounded-full bg-brand-600 px-8 py-3 text-sm font-medium text-white shadow-md hover:bg-brand-700"
                >
                  Submit Note
                </button>
              </>
            )}
          </div>

          {/* Playback */}
          {recorder.audioUrl && (
            <div className="mt-6">
              <audio src={recorder.audioUrl} controls className="mx-auto" />
            </div>
          )}

          {/* Recording indicator */}
          {recorder.isRecording && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-red-500">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
              Recording...
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Processing state */}
      {step === "processing" && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-sm text-gray-600">
            Transcribing and extracting call log data...
          </p>
        </div>
      )}

      {/* Review extracted data */}
      {step === "review" && extracted && (
        <div className="space-y-6">
          {/* Transcription */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-500 uppercase">
              Transcription
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              {transcription}
            </p>
          </div>

          {/* Extracted fields */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase">
              Extracted Call Log
            </h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-medium text-gray-500">Facility</dt>
                <dd className="text-gray-900">
                  {extracted.facility_name || "—"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Contact</dt>
                <dd className="text-gray-900">
                  {extracted.contact_name || "—"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Role</dt>
                <dd className="text-gray-900">
                  {extracted.contact_role || "—"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Sentiment</dt>
                <dd className="capitalize text-gray-900">
                  {extracted.sentiment || "—"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="font-medium text-gray-500">Summary</dt>
                <dd className="text-gray-900">
                  {extracted.discussion_summary || "—"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Referral Signal</dt>
                <dd className="text-gray-900">
                  {extracted.referral_signal ? "Yes" : "No"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Follow-Up</dt>
                <dd className="text-gray-900">
                  {extracted.follow_up_date || "None"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleNewRecording}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Record Another
            </button>
            <button
              onClick={handleDone}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              View Call Logs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
