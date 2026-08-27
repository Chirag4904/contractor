"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/types/database";

export function useUser() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(data as Profile | null);
      setLoading(false);
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { profile, loading, isAdmin: profile?.role === "admin" };
}

export function useRole(): { role: UserRole | null; loading: boolean } {
  const { profile, loading } = useUser();
  return { role: profile?.role ?? null, loading };
}
