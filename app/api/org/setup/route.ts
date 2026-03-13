import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * POST /api/org/setup
 * Called after signup to create an organization and add the user as admin.
 * Accepts { organization_name: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { organization_name } = await req.json();

    if (!organization_name || !organization_name.trim()) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    const name = organization_name.trim();
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if user already belongs to an org
    const { data: existingMembership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: "User already belongs to an organization" },
        { status: 409 }
      );
    }

    // Create the organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name, slug })
      .select()
      .single();

    if (orgError) {
      return NextResponse.json(
        { error: `Failed to create organization: ${orgError.message}` },
        { status: 500 }
      );
    }

    // Add user as admin member
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: "admin",
      });

    if (memberError) {
      return NextResponse.json(
        { error: `Failed to add member: ${memberError.message}` },
        { status: 500 }
      );
    }

    // Update profile with organization_id
    await supabase
      .from("profiles")
      .update({ organization_id: org.id, organization: name })
      .eq("id", user.id);

    return NextResponse.json({ organization: org });
  } catch (err) {
    console.error("Org setup error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
