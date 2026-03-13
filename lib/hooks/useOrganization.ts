"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface OrgMembership {
  organization_id: string;
  organization_name: string;
  role: string;
  is_active: boolean;
}

/**
 * Hook to get the current user's organization membership.
 * Returns the first active org membership (users can belong to one org in MVP).
 */
export function useOrganization() {
  const [org, setOrg] = useState<OrgMembership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrg() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("organization_members")
        .select("organization_id, role, is_active, organizations(name)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (data) {
        const orgData = data.organizations as unknown as { name: string } | null;
        setOrg({
          organization_id: data.organization_id,
          organization_name: orgData?.name || "",
          role: data.role,
          is_active: data.is_active,
        });
      }
      setLoading(false);
    }
    fetchOrg();
  }, []);

  return { org, loading };
}
