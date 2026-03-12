"use client";

import { useState, useRef, useCallback } from "react";

interface AudioRecorderState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number;
}

/**
 * Custom hook for recording audio via the browser MediaRecorder API.
 * Returns controls: start, stop, reset, and the resulting audioBlob.
 */
export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    audioBlob: null,
    audioUrl: null,
    duration: 0,
  });

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRecorder.current = recorder;
    chunks.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setState((s) => ({ ...s, isRecording: false, audioBlob: blob, audioUrl: url }));
      stream.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recorder.start();
    setState((s) => ({ ...s, isRecording: true, duration: 0, audioBlob: null, audioUrl: null }));

    timerRef.current = setInterval(() => {
      setState((s) => ({ ...s, duration: s.duration + 1 }));
    }, 1000);
  }, []);

  const stop = useCallback(() => {
    mediaRecorder.current?.stop();
  }, []);

  const reset = useCallback(() => {
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    setState({ isRecording: false, audioBlob: null, audioUrl: null, duration: 0 });
  }, [state.audioUrl]);

  return { ...state, start, stop, reset };
}
