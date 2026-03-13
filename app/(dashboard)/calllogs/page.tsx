"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import type { CallLog } from "@/lib/types";

export default function CallLogsPage() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterReferral, setFilterReferral] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      const supabase = createClient();
      const { data } = await supabase
        .from("call_logs")
        .select("*")
        .order("created_at", { ascending: false });
      setLogs(data || []);
      setLoading(false);
    }
    fetchLogs();
  }, []);

  // Client-side filtering
  const filtered = logs.filter((log) => {
    const matchesSearch =
      !search ||
      (log.facility_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesReferral = !filterReferral || log.referral_signal;
    return matchesSearch && matchesReferral;
  });

  return (
    <div>
      <PageHeader
        title="Call Logs"
        description="All your logged referral visits, extracted by AI."
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Search facility..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={filterReferral}
            onChange={(e) => setFilterReferral(e.target.checked)}
            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          Referral signals only
        </label>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-card">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-brand-900/5">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Facility
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Contact
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Summary
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Referral
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Sentiment
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Follow-Up
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No call logs found.
                </td>
              </tr>
            )}
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-brand-50/50 transition-colors">
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                  {new Date(log.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {log.facility_name || "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {log.contact_name || "—"}
                  {log.contact_role && (
                    <span className="block text-xs text-gray-400">
                      {log.contact_role}
                    </span>
                  )}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-gray-600">
                  {log.discussion_summary || "—"}
                </td>
                <td className="px-4 py-3">
                  {log.referral_signal ? (
                    <Badge label="Yes" variant="green" />
                  ) : (
                    <Badge label="No" variant="gray" />
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    label={log.sentiment || "—"}
                    variant={
                      log.sentiment === "positive"
                        ? "green"
                        : log.sentiment === "negative"
                        ? "red"
                        : "gray"
                    }
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                  {log.follow_up_date || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
