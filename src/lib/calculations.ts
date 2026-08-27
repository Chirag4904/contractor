import type { Attendance } from "@/types/database";

/**
 * Default OT rate = dailyWage / 8.
 * Use the stored overtime_rate if it was overridden.
 */
export function defaultOvertimeRate(dailyWage: number): number {
  return dailyWage / 8;
}

/** Count present days from attendance records for a month. */
export function countPresentDays(records: Pick<Attendance, "status">[]): number {
  return records.filter((r) => r.status === "present").length;
}

/** Count half days. */
export function countHalfDays(records: Pick<Attendance, "status">[]): number {
  return records.filter((r) => r.status === "half_day").length;
}

/** Total effective working days. */
export function effectiveWorkingDays(records: Pick<Attendance, "status">[]): number {
  return countPresentDays(records) + countHalfDays(records) * 0.5;
}

/** Sum OT hours. */
export function totalOvertimeHours(records: Pick<Attendance, "overtime_hours">[]): number {
  return records.reduce((sum, r) => sum + Number(r.overtime_hours), 0);
}

/** Regular wage = effective days × daily wage. */
export function regularWage(records: Pick<Attendance, "status">[], dailyWage: number): number {
  return effectiveWorkingDays(records) * dailyWage;
}

/** OT amount = total OT hours × OT rate. */
export function overtimeAmount(
  records: Pick<Attendance, "overtime_hours">[],
  overtimeRate: number
): number {
  return totalOvertimeHours(records) * overtimeRate;
}

/** Gross = regular + OT. */
export function grossWage(
  records: Pick<Attendance, "status" | "overtime_hours">[],
  dailyWage: number,
  overtimeRate: number
): number {
  return regularWage(records, dailyWage) + overtimeAmount(records, overtimeRate);
}

/** Net payable = gross − total advances. */
export function netPayable(gross: number, totalAdvances: number): number {
  return gross - totalAdvances;
}

/** Payment status derived from amounts. */
export function paymentStatus(
  netPayableAmount: number,
  totalPaid: number
): "unpaid" | "partially_paid" | "paid" {
  if (totalPaid <= 0) return "unpaid";
  if (totalPaid >= netPayableAmount) return "paid";
  return "partially_paid";
}
