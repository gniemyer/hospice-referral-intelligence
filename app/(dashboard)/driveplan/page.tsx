"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { DrivePlanRecord, DrivePlan } from "@/lib/types";

// Dynamically import the map to avoid SSR issues with Leaflet
const DrivePlanMap = dynamic(() => import("@/components/DrivePlanMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded-lg bg-gray-100">
      <p className="text-sm text-gray-500">Loading map...</p>
    </div>
  ),
});

/** Day color palette matching the map markers */
const DAY_COLORS: Record<string, string> = {
  Monday: "bg-blue-500",
  Tuesday: "bg-emerald-500",
  Wednesday: "bg-amber-500",
  Thursday: "bg-purple-500",
  Friday: "bg-red-500",
};

const DAY_TEXT_COLORS: Record<string, string> = {
  Monday: "text-blue-700",
  Tuesday: "text-emerald-700",
  Wednesday: "text-amber-700",
  Thursday: "text-purple-700",
  Friday: "text-red-700",
};

export default function DrivePlanPage() {
  const [planRecord, setPlanRecord] = useState<DrivePlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Fetch the latest active drive plan
  useEffect(() => {
    async function fetchPlan() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchErr } = await supabase
        .from("drive_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchErr && fetchErr.code !== "PGRST116") {
        console.error("Fetch plan error:", fetchErr);
      }

      setPlanRecord(data || null);
      setLoading(false);
    }
    fetchPlan();
  }, []);

  /** Trigger plan generation on-demand */
  async function handleGenerate() {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/driveplan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate plan");
      }

      setPlanRecord(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  const plan: DrivePlan | null = planRecord?.plan_json || null;

  if (loading) {
    return (
      <div>
        <PageHeader title="Drive Plan" description="AI-generated route-optimized visit schedule." />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-brand-500" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Weekly Drive Plan"
        description="AI-generated route-optimized visit schedule for next week."
      />

      {/* Generate / Regenerate button */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg bg-gradient-button px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-gradient-button-hover transition-all disabled:opacity-50"
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Generating...
            </span>
          ) : plan ? (
            "Regenerate Plan"
          ) : (
            "Generate Drive Plan"
          )}
        </button>

        {planRecord && (
          <span className="text-sm text-gray-500">
            Week of {new Date(planRecord.week_start).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })} · Generated {new Date(planRecord.generated_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {/* No plan state */}
      {!plan && !generating && (
        <div className="rounded-xl bg-white p-12 text-center shadow-card">
          <div className="mx-auto mb-4 text-4xl">🗺️</div>
          <h3 className="text-lg font-semibold text-gray-900">No Drive Plan Yet</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            Click &quot;Generate Drive Plan&quot; to create a route-optimized visit schedule based on your
            last 60 days of call logs.
          </p>
        </div>
      )}

      {/* Plan content */}
      {plan && (
        <div className="space-y-6">
          {/* Summary */}
          <Card title="Plan Summary" value={plan.summary} />

          {/* Map + Priority List */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Map (60% width) */}
            <div className="lg:col-span-3 rounded-xl bg-white shadow-card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-brand-900">Route Map</h3>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => setSelectedDay(null)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      !selectedDay ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    All Days
                  </button>
                  {plan.daily_schedule.map((day) => (
                    <button
                      key={day.day}
                      onClick={() => setSelectedDay(day.day === selectedDay ? null : day.day)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        selectedDay === day.day
                          ? "bg-brand-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {day.day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-96">
                <DrivePlanMap plan={plan} selectedDay={selectedDay} />
              </div>
            </div>

            {/* Prioritized List (40% width) */}
            <div className="lg:col-span-2 rounded-xl bg-white shadow-card overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-brand-900">Priority Rankings</h3>
              </div>
              <div className="max-h-[432px] overflow-y-auto divide-y divide-gray-50">
                {plan.prioritized_list.map((facility, idx) => (
                  <div key={idx} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                        {facility.priority_score}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {facility.facility_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {facility.facility_address}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">{facility.reason}</p>
                        <div className="mt-1.5 flex gap-1.5">
                          {facility.referral_signal && <Badge variant="green" label="Referral" />}
                          <Badge
                            label={facility.sentiment || "unknown"}
                            variant={
                              facility.sentiment === "positive" ? "green" :
                              facility.sentiment === "negative" ? "red" : "gray"
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Day-by-Day Schedule */}
          <div className="rounded-xl bg-white shadow-card overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-brand-900">Daily Schedule</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {plan.daily_schedule.map((day) => (
                <div key={day.day}>
                  {/* Day header — click to expand */}
                  <button
                    onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className={`h-3 w-3 rounded-full ${DAY_COLORS[day.day] || "bg-gray-400"}`} />
                    <span className={`text-sm font-semibold ${DAY_TEXT_COLORS[day.day] || "text-gray-700"}`}>
                      {day.day}
                    </span>
                    <span className="text-xs text-gray-500">
                      {day.visits.length} visit{day.visits.length !== 1 ? "s" : ""} — {day.route_summary}
                    </span>
                    <svg
                      className={`ml-auto h-4 w-4 text-gray-400 transition-transform ${
                        expandedDay === day.day ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded visit list */}
                  {expandedDay === day.day && (
                    <div className="bg-gray-50 px-4 pb-4">
                      <div className="space-y-2">
                        {day.visits.map((visit) => (
                          <div
                            key={visit.order}
                            className="flex items-start gap-3 rounded-lg bg-white p-3 shadow-sm"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                              {visit.order}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {visit.facility_name}
                              </p>
                              <p className="text-xs text-gray-500">{visit.facility_address}</p>
                              <p className="mt-1 text-xs text-gray-600">{visit.reason}</p>
                            </div>
                            {visit.estimated_drive_time && (
                              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
                                🚗 {visit.estimated_drive_time}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
