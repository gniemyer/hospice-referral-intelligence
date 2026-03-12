"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";

interface WeeklyStats {
  totalVisits: number;
  referralSignals: number;
  followUps: number;
}

export default function ReportsPage() {
  const [stats, setStats] = useState<WeeklyStats>({
    totalVisits: 0,
    referralSignals: 0,
    followUps: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeeklyStats() {
      const supabase = createClient();

      // Get start of current week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const { data: logs } = await supabase
        .from("call_logs")
        .select("*")
        .gte("created_at", monday.toISOString());

      const weekLogs = logs || [];

      setStats({
        totalVisits: weekLogs.length,
        referralSignals: weekLogs.filter((l) => l.referral_signal).length,
        followUps: weekLogs.filter(
          (l) => l.follow_up_date && l.follow_up_date !== ""
        ).length,
      });
      setLoading(false);
    }
    fetchWeeklyStats();
  }, []);

  return (
    <div>
      <PageHeader
        title="Weekly Report"
        description="Your activity summary for this week."
      />

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card
            title="Visits Logged"
            value={stats.totalVisits}
            subtitle="This week"
          />
          <Card
            title="Referral Signals"
            value={stats.referralSignals}
            subtitle="Potential referrals detected"
          />
          <Card
            title="Follow-Ups Scheduled"
            value={stats.followUps}
            subtitle="From visit notes"
          />
        </div>
      )}
    </div>
  );
}
