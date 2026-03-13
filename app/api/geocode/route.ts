import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/geocode
 * Geocodes a facility name/address using OpenStreetMap Nominatim (free, no API key).
 * Accepts { facility_name: string, facility_address?: string }
 * Returns { latitude, longitude, display_name } or error.
 */
export async function POST(req: NextRequest) {
  try {
    const { facility_name, facility_address } = await req.json();

    if (!facility_name) {
      return NextResponse.json({ error: "No facility_name provided" }, { status: 400 });
    }

    // Use the address if available, otherwise fall back to facility name
    const query = facility_address || facility_name;

    // Nominatim requires a User-Agent header and has a 1 req/sec rate limit
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "us");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "HospiceReferralIntelligence/1.0",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Nominatim request failed" }, { status: 502 });
    }

    const results = await res.json();

    if (!results || results.length === 0) {
      return NextResponse.json({
        latitude: null,
        longitude: null,
        display_name: null,
        resolved: false,
      });
    }

    const top = results[0];
    return NextResponse.json({
      latitude: parseFloat(top.lat),
      longitude: parseFloat(top.lon),
      display_name: top.display_name,
      resolved: true,
    });
  } catch (err: unknown) {
    console.error("Geocode error:", err);
    const message = err instanceof Error ? err.message : "Geocoding failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
