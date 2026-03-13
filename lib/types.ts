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
  facility_address: string;
  contact_name: string;
  contact_role: string;
  discussion_summary: string;
  referral_signal: boolean;
  follow_up_date: string;
  sentiment: "positive" | "neutral" | "negative";
}

/** Cached facility with geocoded coordinates */
export interface Facility {
  id: string;
  user_id: string;
  facility_name: string;
  facility_address: string | null;
  latitude: number | null;
  longitude: number | null;
  geocode_status: "pending" | "resolved" | "failed";
  created_at: string;
  updated_at: string;
}

/** A single visit in a day's schedule */
export interface DayVisit {
  order: number;
  facility_name: string;
  facility_address: string;
  latitude: number;
  longitude: number;
  reason: string;
  estimated_drive_time: string;
}

/** A single day's schedule */
export interface DaySchedule {
  day: string;
  visits: DayVisit[];
  route_summary: string;
}

/** A prioritized facility in the plan */
export interface PlanFacility {
  facility_name: string;
  facility_address: string;
  latitude: number;
  longitude: number;
  priority_score: number;
  reason: string;
  last_visit_date: string;
  follow_up_date: string | null;
  referral_signal: boolean;
  sentiment: string;
}

/** The full drive plan structure stored as JSON */
export interface DrivePlan {
  summary: string;
  prioritized_list: PlanFacility[];
  daily_schedule: DaySchedule[];
}

/** Database record for a drive plan */
export interface DrivePlanRecord {
  id: string;
  user_id: string;
  week_start: string;
  plan_json: DrivePlan;
  generated_at: string;
  status: "active" | "archived";
}
