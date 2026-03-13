import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

export const maxDuration = 300; // 5 minutes for processing multiple users

/**
 * GET /api/driveplan/cron
 * Called by Vercel Cron every Friday at 5 PM ET (10 PM UTC).
 * Generates drive plans for all active users.
 */
export async function GET(req: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceSupabase();

    // Fetch all user IDs
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id");

    if (profilesError) throw new Error(`DB error: ${profilesError.message}`);
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: "No users to generate plans for" });
    }

    const results = [];

    for (const profile of profiles) {
      try {
        // Call the generate endpoint internally for each user
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";

        const res = await fetch(`${baseUrl}/api/driveplan/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: profile.id }),
        });

        const data = await res.json();
        results.push({
          user_id: profile.id,
          success: res.ok,
          message: data.message || data.error,
        });
      } catch (err) {
        results.push({
          user_id: profile.id,
          success: false,
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: "Cron job complete",
      results,
    });
  } catch (err: unknown) {
    console.error("Cron error:", err);
    const message = err instanceof Error ? err.message : "Cron job failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
