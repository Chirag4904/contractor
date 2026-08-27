const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const INR_PRECISE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number, precise = false): string {
  return precise ? INR_PRECISE.format(amount) : INR.format(amount);
}

const DATE_SHORT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(dateStr: string): string {
  return DATE_SHORT.format(new Date(dateStr));
}

export function formatMonth(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
