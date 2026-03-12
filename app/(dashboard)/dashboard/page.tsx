"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { CallLog } from "@/lib/types";

export default function DashboardPage() {
  const [recentLogs, setRecentLogs] = useState<CallLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      const supabase = createClient();

      // Fetch recent 5 call logs
      const { data: recent } = await supabase
        .from("call_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      // Get total count
      const { count: logCount } = await supabase
        .from("call_logs")
        .select("*", { count: "exact", head: true });

      // Get referral signal count
      const { count: refCount } = await supabase
        .from("call_logs")
        .select("*", { count: "exact", head: true })
        .eq("referral_signal", true);

      setRecentLogs(recent || []);
      setTotalLogs(logCount || 0);
      setTotalReferrals(refCount || 0);
      setLoading(false);
    }
    fetchDashboard();
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome back. Here's a snapshot of your activity."
      />

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Card title="Total Visits" value={totalLogs} subtitle="All time" />
            <Card
              title="Referral Signals"
              value={totalReferrals}
              subtitle="Detected by AI"
            />
            <Card
              title="Recent Activity"
              value={recentLogs.length}
              subtitle="Last 5 visits"
            />
          </div>

          {/* Quick action */}
          <div className="mb-8">
            <Link
              href="/record"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
            >
              <span>🎙️</span> Record New Visit
            </Link>
          </div>

          {/* Recent logs */}
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Call Logs
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Facility
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Referral
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Summary
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No visits logged yet.{" "}
                      <Link
                        href="/record"
                        className="text-brand-600 hover:underline"
                      >
                        Record your first visit
                      </Link>
                    </td>
                  </tr>
                )}
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {new Date(log.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {log.facility_name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {log.referral_signal ? (
                        <Badge label="Yes" variant="green" />
                      ) : (
                        <Badge label="No" variant="gray" />
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-600">
                      {log.discussion_summary || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
