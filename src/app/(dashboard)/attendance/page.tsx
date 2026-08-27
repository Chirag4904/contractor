"use client";

import { useSiteFilter } from "@/hooks/use-site-filter";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { SiteSelector } from "@/components/site-selector";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CalendarCheck, Loader2 } from "lucide-react";
import { formatCurrency, getDaysInMonth, formatMonth } from "@/lib/formatters";
import {
  effectiveWorkingDays,
  totalOvertimeHours,
  grossWage,
} from "@/lib/calculations";
import type { Labour, Attendance, AttendanceStatus } from "@/types/database";
import { useUser } from "@/hooks/use-user";

const statusCycle: AttendanceStatus[] = ["present", "half_day", "absent"];
const statusDisplay: Record<AttendanceStatus, { label: string; color: string }> = {
  present: { label: "P", color: "bg-emerald-500 text-white" },
  absent: { label: "A", color: "bg-red-400 text-white" },
  half_day: { label: "H", color: "bg-amber-400 text-white" },
  leave: { label: "L", color: "bg-blue-400 text-white" },
};

export default function AttendancePage() {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const { isAdmin } = useUser();
  const [siteId, setSiteId] = useSiteFilter("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [labourList, setLabourList] = useState<Labour[]>([]);
  const [attendance, setAttendance] = useState<Map<string, Attendance>>(new Map());
  const [advances, setAdvances] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [otLabour, setOtLabour] = useState<Labour | null>(null);

  const y = parseInt(year);
  const m = parseInt(month);
  const daysInMonth = getDaysInMonth(y, m);

  const loadData = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    const supabase = createClient();

    const monthStart = `${year}-${month.padStart(2, "0")}-01`;
    const monthEnd = `${year}-${month.padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const [{ data: labData }, { data: attData }, { data: advData }] = await Promise.all([
      supabase.from("labour").select("*").eq("site_id", siteId).order("name"),
      supabase
        .from("attendance")
        .select("*")
        .gte("attendance_date", monthStart)
        .lte("attendance_date", monthEnd),
      supabase
        .from("advances")
        .select("labour_id, amount")
        .eq("site_id", siteId)
        .gte("advance_date", monthStart)
        .lte("advance_date", monthEnd),
    ]);

    const allLabour = (labData as Labour[]) ?? [];
    const allAtt = (attData as Attendance[]) ?? [];
    
    // Only show labourers who are active OR have attendance records in the currently selected month
    const activeOrHasHistory = allLabour.filter((l) => {
      if (l.active) return true;
      return allAtt.some((a) => a.labour_id === l.id);
    });

    setLabourList(activeOrHasHistory);

    const attMap = new Map<string, Attendance>();
    // Filter attendance records to only include labourers from this site
    const siteLabourIds = new Set(((labData as Labour[]) ?? []).map((l) => l.id));
    for (const a of (attData ?? []) as Attendance[]) {
      if (siteLabourIds.has(a.labour_id)) {
        attMap.set(`${a.labour_id}_${a.attendance_date}`, a);
      }
    }
    setAttendance(attMap);

    const advMap = new Map<string, number>();
    for (const a of advData ?? []) {
      advMap.set(a.labour_id, (advMap.get(a.labour_id) ?? 0) + Number(a.amount));
    }
    setAdvances(advMap);
    setLoading(false);
  }, [siteId, year, month, daysInMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function toggleCell(labourId: string, day: number) {
    const dateStr = `${year}-${month.padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const key = `${labourId}_${dateStr}`;
    const existing = attendance.get(key);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!existing) {
      // Create new — default to present
      const { data } = await supabase
        .from("attendance")
        .insert({
          labour_id: labourId,
          attendance_date: dateStr,
          status: "present" as AttendanceStatus,
          overtime_hours: 0,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select()
        .single();
      if (data) {
        setAttendance((prev) => new Map(prev).set(key, data as Attendance));
      }
    } else {
      const currentIdx = statusCycle.indexOf(existing.status);
      const nextIdx = (currentIdx + 1) % statusCycle.length;
      const nextStatus = statusCycle[nextIdx];

      // If cycling back to "present" from "leave", delete the record (clear cell)
      if (nextStatus === "present" && currentIdx === statusCycle.length - 1) {
        await supabase.from("attendance").delete().eq("id", existing.id);
        setAttendance((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      } else {
        const { data } = await supabase
          .from("attendance")
          .update({ status: nextStatus, updated_by: user?.id ?? null })
          .eq("id", existing.id)
          .select()
          .single();
        if (data) {
          setAttendance((prev) => new Map(prev).set(key, data as Attendance));
        }
      }
    }
  }

  async function setOT(labourId: string, day: number, hours: string) {
    const dateStr = `${year}-${month.padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const key = `${labourId}_${dateStr}`;
    const existing = attendance.get(key);
    const supabase = createClient();
    const val = parseFloat(hours) || 0;

    if (existing) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("attendance")
        .update({ overtime_hours: val, updated_by: user?.id ?? null })
        .eq("id", existing.id)
        .select()
        .single();
      if (data) {
        setAttendance((prev) => new Map(prev).set(key, data as Attendance));
      }
    }
  }

  function getRecordsForLabour(labourId: string): Attendance[] {
    const records: Attendance[] = [];
    for (const [key, val] of attendance) {
      if (key.startsWith(`${labourId}_`)) records.push(val);
    }
    return records;
  }

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i).toLocaleString("en", { month: "long" }),
  }));

  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));

  return (
    <>
      <PageHeader title="Attendance" description={siteId ? formatMonth(y, m) : "Select a site"} />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SiteSelector value={siteId} onChange={setSiteId} className="w-full sm:w-52" />
        <Select value={month} onValueChange={(v) => v != null && setMonth(v)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={(v) => v != null && setYear(v)}>
          <SelectTrigger className="w-full sm:w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!siteId ? (
        <EmptyState icon={<CalendarCheck className="h-10 w-10" />} title="Select a site" description="Choose a site to view the attendance register." />
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : labourList.length === 0 ? (
        <EmptyState icon={<CalendarCheck className="h-10 w-10" />} title="No active labourers" description="Add labourers to this site first." />
      ) : (
        <div className="rounded-lg border overflow-auto">
          <table className="text-sm min-w-max">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-medium min-w-[140px]">Labour</th>
                <th className="px-2 py-2 text-right font-medium min-w-[70px]">Wage</th>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <th key={i} className="px-1 py-2 text-center font-medium min-w-[36px]">{i + 1}</th>
                ))}
                <th className="px-2 py-2 text-right font-medium min-w-[40px]">Days</th>
                <th className="px-2 py-2 text-right font-medium min-w-[40px]">½</th>
                <th className="px-2 py-2 text-right font-medium min-w-[40px]">OT</th>
                <th className="px-2 py-2 text-right font-medium min-w-[80px]">Gross</th>
                <th className="px-2 py-2 text-right font-medium min-w-[70px]">Adv</th>
                <th className="px-2 py-2 text-right font-medium min-w-[80px]">Net</th>
              </tr>
            </thead>
            <tbody>
              {labourList.map((l) => {
                const records = getRecordsForLabour(l.id);
                const wd = effectiveWorkingDays(records);
                const pd = records.filter((r) => r.status === "present").length;
                const hd = records.filter((r) => r.status === "half_day").length;
                const ot = totalOvertimeHours(records);
                const gross = grossWage(records, l.daily_wage, l.overtime_rate);
                const adv = advances.get(l.id) ?? 0;
                const net = gross - adv;

                return (
                  <tr key={l.id} className="border-b hover:bg-muted/30">
                    <td className="sticky left-0 z-10 bg-background px-3 py-1 font-medium whitespace-nowrap">
                      {l.name}
                      {!l.active && <span className="ml-2 text-[10px] text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">Inactive</span>}
                    </td>
                    <td className="px-2 py-1 text-right text-muted-foreground">
                      {formatCurrency(l.daily_wage)}
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const dateStr = `${year}-${month.padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const key = `${l.id}_${dateStr}`;
                      const att = attendance.get(key);
                      const display = att ? statusDisplay[att.status] : null;
                      const isToday = dateStr === todayStr;
                      const isDisabled = (!isAdmin && !isToday) || !l.active;

                      return (
                        <td key={day} className="px-0.5 py-1 text-center">
                          <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => toggleCell(l.id, day)}
                            className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
                              display
                                ? display.color
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {display ? display.label : "·"}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-right font-medium">{pd}</td>
                    <td className="px-2 py-1 text-right">{hd}</td>
                    <td className="px-2 py-1 text-right">
                      <button 
                        type="button" 
                        onClick={() => setOtLabour(l)}
                        className="text-primary hover:underline font-medium px-1 rounded hover:bg-primary/10"
                        title="Click to edit OT"
                      >
                        {ot}
                      </button>
                    </td>
                    <td className="px-2 py-1 text-right font-medium">{formatCurrency(gross)}</td>
                    <td className="px-2 py-1 text-right text-red-500">{adv > 0 ? formatCurrency(adv) : "—"}</td>
                    <td className="px-2 py-1 text-right font-bold">{formatCurrency(net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Overtime Dialog */}
      <Dialog open={!!otLabour} onOpenChange={(open) => !open && setOtLabour(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Overtime — {otLabour?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter overtime hours for days where {otLabour?.name} was present or half-day.
            </p>
            <div className="grid gap-2">
              {otLabour && getRecordsForLabour(otLabour.id)
                .filter(r => r.status === "present" || r.status === "half_day" || r.overtime_hours > 0)
                .sort((a, b) => a.attendance_date.localeCompare(b.attendance_date))
                .map(r => {
                  const dayNum = parseInt(r.attendance_date.split("-")[2]);
                  const isToday = r.attendance_date === todayStr;
                  const isDisabled = !isAdmin && !isToday;
                  
                  return (
                    <div key={r.id} className="flex items-center justify-between border-b pb-2">
                      <div className="text-sm">
                        <span className="font-medium mr-2">Day {dayNum}</span>
                        <span className="text-xs text-muted-foreground uppercase">{r.status.replace("_", " ")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.5" 
                          className="w-20 text-right"
                          defaultValue={r.overtime_hours}
                          disabled={isDisabled}
                          onBlur={(e) => setOT(otLabour.id, dayNum, e.target.value)}
                        />
                        <span className="text-sm text-muted-foreground">hrs</span>
                      </div>
                    </div>
                  );
                })}
              {otLabour && getRecordsForLabour(otLabour.id).filter(r => r.status === "present" || r.status === "half_day" || r.overtime_hours > 0).length === 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No present/half-day records found for this month.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
