import { useState, useEffect } from "react";

export function useSiteFilter(defaultVal: string = "all") {
  const [site, setSite] = useState<string>(defaultVal);

  useEffect(() => {
    const saved = localStorage.getItem("hisaab_selected_site");
    if (saved) {
      if (defaultVal !== "all" && saved === "all") {
        // Skip applying "all" if the page expects a specific site (defaultVal is "")
      } else {
        setSite(saved);
      }
    }
  }, [defaultVal]);

  const updateSite = (val: string) => {
    setSite(val);
    localStorage.setItem("hisaab_selected_site", val);
  };

  return [site, updateSite] as const;
}
