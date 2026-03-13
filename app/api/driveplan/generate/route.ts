import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/client";
import { createServiceSupabase } from "@/lib/supabase/server";

export const maxDuration = 120;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

const SYSTEM_PROMPT = `You are a hospice marketing route planner. Given a list of facility visit logs from the past 60 days (with addresses and coordinates), generate an optimized weekly visit plan for next week (Monday through Friday).

Prioritization rules (in order of importance):
1. Facilities with follow_up_date within the next 10 days — highest priority
2. Facilities with referral_signal = true that haven't been visited in 14+ days
3. Facilities with positive sentiment that haven't been visited in 21+ days
4. Facilities with negative sentiment — relationship repair visits
5. Geographic clustering to minimize drive time between stops

Route optimization rules:
- Group geographically close facilities on the same day (cluster by lat/lng proximity)
- Limit to 4-6 visits per day maximum
- Order visits within each day to minimize total driving distance
- Include estimated drive times between stops
- Distribute visits evenly across the work week

Return JSON matching this exact schema:
{
  "summary": "Overview string describing the week (e.g., 'You have 12 facilities to visit across 5 days...')",
  "prioritized_list": [
    {
      "facility_name": "string",
      "facility_address": "string",
      "latitude": number,
      "longitude": number,
      "priority_score": number (1-10, 10 = highest),
      "reason": "string explaining why this facility should be visited",
      "last_visit_date": "ISO date string",
      "follow_up_date": "string or null",
      "referral_signal": boolean,
      "sentiment": "positive|neutral|negative"
    }
  ],
  "daily_schedule": [
    {
      "day": "Monday|Tuesday|Wednesday|Thursday|Friday",
      "visits": [
        {
          "order": number,
          "facility_name": "string",
          "facility_address": "string",
          "latitude": number,
          "longitude": number,
          "reason": "string",
          "estimated_drive_time": "string (e.g., '15 min from previous')"
        }
      ],
      "route_summary": "string (e.g., 'North side cluster, ~45 min total driving')"
    }
  ]
}

Only include facilities that have valid coordinates. If there are fewer than 5 facilities, use fewer days.`;

/**
 * POST /api/driveplan/generate
 * Generates a weekly drive plan for the authenticated user (or a user_id passed in body).
 * Queries last 60 days of call logs joined with facilities, sends to GPT-4o.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Support both authenticated user calls and service-role cron calls
    let userId = body.user_id;
    let supabase;

    if (userId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Cron job path — use service role
      supabase = createServiceSupabase();
    } else {
      // User-initiated path — use browser client auth
      supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      userId = user.id;
    }

    // Fetch last 60 days of call logs with facility data
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: logs, error: logsError } = await supabase
      .from("call_logs")
      .select(`
        *,
        facilities (
          facility_name,
          facility_address,
          latitude,
          longitude,
          geocode_status
        )
      `)
      .eq("user_id", userId)
      .gte("created_at", sixtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (logsError) throw new Error(`DB error: ${logsError.message}`);

    if (!logs || logs.length === 0) {
      return NextResponse.json({
        error: "No call logs found in the last 60 days. Record some visits first.",
      }, { status: 400 });
    }

    // Build the data payload for GPT-4o
    const facilityData = logs.map((log) => ({
      facility_name: log.facility_name,
      facility_address: log.facilities?.facility_address || "Unknown",
      latitude: log.facilities?.latitude || null,
      longitude: log.facilities?.longitude || null,
      contact_name: log.contact_name,
      contact_role: log.contact_role,
      discussion_summary: log.discussion_summary,
      referral_signal: log.referral_signal,
      follow_up_date: log.follow_up_date,
      sentiment: log.sentiment,
      visit_date: log.created_at,
    }));

    // Call GPT-4o to generate the plan
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Today's date is ${new Date().toISOString().split("T")[0]}. Here are the visit logs from the past 60 days:\n\n${JSON.stringify(facilityData, null, 2)}`,
        },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    const plan = JSON.parse(content || "{}");

    // Calculate next Monday as the week_start
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    const weekStart = nextMonday.toISOString().split("T")[0];

    // Archive existing active plans for this user
    await supabase
      .from("drive_plans")
      .update({ status: "archived" })
      .eq("user_id", userId)
      .eq("status", "active");

    // Insert the new plan
    const { data: newPlan, error: insertError } = await supabase
      .from("drive_plans")
      .insert({
        user_id: userId,
        week_start: weekStart,
        plan_json: plan,
        status: "active",
      })
      .select()
      .single();

    if (insertError) throw new Error(`Failed to save plan: ${insertError.message}`);

    return NextResponse.json({
      message: "Drive plan generated successfully",
      plan: newPlan,
    });
  } catch (err: unknown) {
    console.error("Drive plan generation error:", err);
    const message = err instanceof Error ? err.message : "Plan generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
