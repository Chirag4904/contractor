"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Site } from "@/types/database";

interface SiteSelectorProps {
  value: string;
  onChange: (siteId: string) => void;
  includeAll?: boolean;
  className?: string;
}

export function SiteSelector({ value, onChange, includeAll, className }: SiteSelectorProps) {
  const [sites, setSites] = useState<Pick<Site, "id" | "site_name" | "site_code">[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("sites")
      .select("id, site_name, site_code")
      .eq("status", "active")
      .order("site_name")
      .then(({ data }) => {
        if (data) setSites(data);
      });
  }, []);

  return (
    <Select value={value} onValueChange={(v) => { if (v != null) onChange(v); }}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select site" />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">All Sites</SelectItem>}
        {sites.map((site) => (
          <SelectItem key={site.id} value={site.id}>
            {site.site_name} ({site.site_code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
