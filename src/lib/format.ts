// =============================================================================
// أدوات التنسيق — أرقام، عملة، تواريخ، نصوص
// =============================================================================

import type { Kpi, KpiUnit } from "./types";

const nf = new Intl.NumberFormat("en-US");
const nf1 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function num(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (decimals === 1) return nf1.format(v);
  if (decimals > 1)
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  return nf.format(Math.round(v));
}

export function pct(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${num(v, decimals)}%`;
}

/** مبلغ بالريال — يختصر إلى مليون/ألف للعرض في البطاقات */
export function money(v: number | null | undefined, compact = false): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (compact) {
    if (Math.abs(v) >= 1_000_000) return `${nf1.format(v / 1_000_000)} م.ر`;
    if (Math.abs(v) >= 1_000) return `${nf.format(Math.round(v / 1000))} أ.ر`;
  }
  return `${nf.format(Math.round(v))} ر.س`;
}

export function unitSuffix(unit: KpiUnit): string {
  switch (unit) {
    case "percent":
      return "%";
    case "days":
      return " يوم";
    case "sar":
      return " ر.س";
    case "index":
      return " نقطة";
    case "ratio":
      return "";
    default:
      return "";
  }
}

/** قيمة مؤشر منسّقة بوحدتها */
export function kpiValue(kpi: Kpi, v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const dec = kpi.unit === "index" ? 1 : kpi.unit === "number" ? 0 : v % 1 === 0 ? 0 : 1;
  return `${num(v, dec)}${unitSuffix(kpi.unit)}`;
}

const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function dateAr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00Z" : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCDate()} ${MONTHS_AR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00Z" : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function dateTimeAr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${dateShort(iso)} · ${hh}:${mm}`;
}

/** فرق زمني مقروء: "قبل 3 أيام" */
export function timeAgo(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "—";
  const diff = Math.max(0, now.getTime() - d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `قبل ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `قبل ${days} يوم`;
  const months = Math.floor(days / 30);
  if (months < 12) return `قبل ${months} شهر`;
  return `قبل ${Math.floor(months / 12)} سنة`;
}

export const quarterLabel = (y: number | string, q: number | string) => `الربع ${q} · ${y}`;

export const QUARTER_NAMES: Record<number, string> = {
  1: "الربع الأول",
  2: "الربع الثاني",
  3: "الربع الثالث",
  4: "الربع الرابع",
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function uid(prefix = "x"): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} بايت`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} كيلوبايت`;
  return `${(n / (1024 * 1024)).toFixed(1)} ميجابايت`;
}
