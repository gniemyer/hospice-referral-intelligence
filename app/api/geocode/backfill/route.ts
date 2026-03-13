import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

/**
 * POST /api/geocode/backfill
 * One-time utility to geocode all facilities with status='pending'.
 * Uses Nominatim with a 1-second delay between requests to respect rate limits.
 */
export const maxDuration = 300; // Allow up to 5 minutes

export async function POST() {
  try {
    const supabase = createServiceSupabase();

    // Fetch all pending facilities
    const { data: facilities, error } = await supabase
      .from("facilities")
      .select("*")
      .eq("geocode_status", "pending")
      .limit(50);

    if (error) throw new Error(`DB error: ${error.message}`);
    if (!facilities || facilities.length === 0) {
      return NextResponse.json({ message: "No pending facilities to geocode", count: 0 });
    }

    let resolved = 0;
    let failed = 0;

    for (const facility of facilities) {
      try {
        const query = facility.facility_address || facility.facility_name;
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", query);
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", "1");
        url.searchParams.set("countrycodes", "us");

        const res = await fetch(url.toString(), {
          headers: { "User-Agent": "HospiceReferralIntelligence/1.0" },
        });

        if (res.ok) {
          const results = await res.json();
          if (results && results.length > 0) {
            const top = results[0];
            await supabase
              .from("facilities")
              .update({
                latitude: parseFloat(top.lat),
                longitude: parseFloat(top.lon),
                facility_address: facility.facility_address || top.display_name,
                geocode_status: "resolved",
                updated_at: new Date().toISOString(),
              })
              .eq("id", facility.id);
            resolved++;
          } else {
            await supabase
              .from("facilities")
              .update({ geocode_status: "failed", updated_at: new Date().toISOString() })
              .eq("id", facility.id);
            failed++;
          }
        }

        // Respect Nominatim's 1 req/sec rate limit
        await new Promise((r) => setTimeout(r, 1100));
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      message: "Backfill complete",
      total: facilities.length,
      resolved,
      failed,
    });
  } catch (err: unknown) {
    console.error("Backfill error:", err);
    const message = err instanceof Error ? err.message : "Backfill failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
