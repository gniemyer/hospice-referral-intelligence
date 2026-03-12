/** Shared TypeScript types for the application */

export interface Profile {
  id: string;
  email: string;
  organization: string | null;
  role: string;
  created_at: string;
}

export interface VoiceNote {
  id: string;
  user_id: string;
  audio_url: string | null;
  transcription: string | null;
  created_at: string;
}

export interface CallLog {
  id: string;
  user_id: string;
  voice_note_id: string | null;
  facility_name: string | null;
  contact_name: string | null;
  contact_role: string | null;
  discussion_summary: string | null;
  referral_signal: boolean;
  follow_up_date: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  created_at: string;
}

/** Shape returned by the GPT-4 extraction prompt */
export interface ExtractedCallData {
  facility_name: string;
  contact_name: string;
  contact_role: string;
  discussion_summary: string;
  referral_signal: boolean;
  follow_up_date: string;
  sentiment: "positive" | "neutral" | "negative";
}
