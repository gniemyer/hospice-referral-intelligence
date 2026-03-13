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
      if (!user) throw new Error("Step 0 failed: Not authenticated");

      // 1. Upload audio to Supabase Storage
      setError("Step 1: Uploading audio...");
      const filename = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("voice-notes")
        .upload(filename, recorder.audioBlob, {
          contentType: "audio/webm",
        });
      if (uploadError) throw new Error(`Step 1 failed (upload): ${uploadError.message}`);

      const {
        data: { publicUrl },
      } = supabase.storage.from("voice-notes").getPublicUrl(filename);

      // 2. Transcribe via Whisper
      setError("Step 2: Transcribing audio...");
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
      if (!transcribeRes.ok) {
        const transcribeErr = await transcribeRes.text();
        throw new Error(`Step 2 failed (transcribe): ${transcribeRes.status} - ${transcribeErr}`);
      }
      const transcribeData = await transcribeRes.json();
      setTranscription(transcribeData.text);

      // 3. Extract structured data via GPT-4
      setError("Step 3: Extracting call log data...");
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription: transcribeData.text }),
      });
      if (!extractRes.ok) {
        const extractErr = await extractRes.text();
        throw new Error(`Step 3 failed (extract): ${extractRes.status} - ${extractErr}`);
      }
      const extractData = await extractRes.json();
      setExtracted(extractData);

      // 4. Save voice note
      setError("Step 4: Saving to database...");
      const { data: voiceNote, error: vnError } = await supabase
        .from("voice_notes")
        .insert({
          user_id: user.id,
          audio_url: publicUrl,
          transcription: transcribeData.text,
        })
        .select()
        .single();
      if (vnError) throw new Error(`Step 4 failed (save voice note): ${vnError.message}`);

      // 5. Upsert facility and trigger geocoding
      let facilityId: string | null = null;
      if (extractData.facility_name) {
        setError("Step 5: Resolving facility...");
        const { data: existingFacility } = await supabase
          .from("facilities")
          .select("id")
          .eq("user_id", user.id)
          .eq("facility_name", extractData.facility_name)
          .single();

        if (existingFacility) {
          facilityId = existingFacility.id;
        } else {
          const { data: newFacility, error: facError } = await supabase
            .from("facilities")
            .insert({
              user_id: user.id,
              facility_name: extractData.facility_name,
              facility_address: extractData.facility_address || null,
              geocode_status: "pending",
            })
            .select()
            .single();
          if (facError && facError.code !== "23505") {
            console.warn("Facility upsert warning:", facError.message);
          }
          facilityId = newFacility?.id || null;
        }

        // Fire-and-forget geocoding
        fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            facility_name: extractData.facility_name,
            facility_address: extractData.facility_address,
          }),
        })
          .then(async (geoRes) => {
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData.resolved && facilityId) {
                await supabase
                  .from("facilities")
                  .update({
                    latitude: geoData.latitude,
                    longitude: geoData.longitude,
                    facility_address: geoData.display_name || extractData.facility_address,
                    geocode_status: "resolved",
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", facilityId);
              }
            }
          })
          .catch(() => {}); // Non-blocking — geocode failures are OK
      }

      // 6. Save call log
      setError("Step 6: Saving call log...");
      const { error: clError } = await supabase.from("call_logs").insert({
        user_id: user.id,
        voice_note_id: voiceNote?.id,
        facility_id: facilityId,
        facility_name: extractData.facility_name || null,
        contact_name: extractData.contact_name || null,
        contact_role: extractData.contact_role || null,
        discussion_summary: extractData.discussion_summary || null,
        referral_signal: extractData.referral_signal ?? false,
        follow_up_date: extractData.follow_up_date || null,
        sentiment: extractData.sentiment || null,
      });
      if (clError) throw new Error(`Step 6 failed (save call log): ${clError.message}`);

      setError(null);
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
        <div className="rounded-xl bg-white p-8 text-center shadow-card">
          {/* Timer */}
          <div className="mb-6 text-5xl font-mono font-light text-brand-900">
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
                  className="rounded-full border border-gray-200 px-6 py-3 text-sm font-medium text-brand-900 hover:bg-brand-50 transition-colors"
                >
                  Re-record
                </button>
                <button
                  onClick={handleSubmit}
                  className="rounded-full bg-gradient-button px-8 py-3 text-sm font-medium text-white shadow-md hover:bg-gradient-button-hover transition-all"
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
        <div className="rounded-xl bg-white p-12 text-center shadow-card">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-teal-200 border-t-brand-500" />
          <p className="text-sm text-gray-600">
            Transcribing and extracting call log data...
          </p>
        </div>
      )}

      {/* Review extracted data */}
      {step === "review" && extracted && (
        <div className="space-y-6">
          {/* Transcription */}
          <div className="rounded-xl bg-white p-6 shadow-card">
            <h2 className="mb-2 text-sm font-semibold text-gray-500 uppercase">
              Transcription
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              {transcription}
            </p>
          </div>

          {/* Extracted fields */}
          <div className="rounded-xl bg-white p-6 shadow-card">
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
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-brand-900 hover:bg-brand-50 transition-colors"
            >
              Record Another
            </button>
            <button
              onClick={handleDone}
              className="flex-1 rounded-lg bg-gradient-button px-4 py-2.5 text-sm font-medium text-white shadow-md hover:bg-gradient-button-hover transition-all"
            >
              View Call Logs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
