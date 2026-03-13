"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import type { CallLog } from "@/lib/types";

export default function FollowUpsPage() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFollowUps() {
      const supabase = createClient();
      // Only fetch logs that have a follow-up date
      const { data } = await supabase
        .from("call_logs")
        .select("*")
        .not("follow_up_date", "is", null)
        .neq("follow_up_date", "")
        .order("created_at", { ascending: false });
      setLogs(data || []);
      setLoading(false);
    }
    fetchFollowUps();
  }, []);

  /**
   * Naive overdue check: if the follow_up_date text contains
   * a recognizable past date, mark it overdue.
   * Since follow_up_date is free-text from GPT, we do a best-effort parse.
   */
  function isOverdue(followUpDate: string | null, createdAt: string): boolean {
    if (!followUpDate) return false;
    try {
      const parsed = new Date(followUpDate);
      if (isNaN(parsed.getTime())) {
        // If GPT returned relative text like "next Tuesday", compare created_at + 7 days
        const created = new Date(createdAt);
        const weekLater = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
        return new Date() > weekLater;
      }
      return new Date() > parsed;
    } catch {
      return false;
    }
  }

  return (
    <div>
      <PageHeader
        title="Follow-Ups"
        description="Upcoming follow-ups extracted from your visit notes."
      />

      <div className="overflow-hidden rounded-xl bg-white shadow-card">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-brand-900/5">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Facility
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Contact
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Follow-Up Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Summary
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No follow-ups scheduled.
                </td>
              </tr>
            )}
            {logs.map((log) => {
              const overdue = isOverdue(log.follow_up_date, log.created_at);
              return (
                <tr
                  key={log.id}
                  className={overdue ? "bg-red-50 hover:bg-red-100" : "hover:bg-brand-50/50 transition-colors"}
                >
                  <td className="px-4 py-3">
                    {overdue ? (
                      <Badge label="Overdue" variant="red" />
                    ) : (
                      <Badge label="Upcoming" variant="yellow" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {log.facility_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.contact_name || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {log.follow_up_date || "—"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-600">
                    {log.discussion_summary || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
