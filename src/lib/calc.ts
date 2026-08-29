// =============================================================================
// المعادلات والاشتقاقات — نسب الإنجاز، نظام RAG، التجميع الهرمي، الميزانية
// =============================================================================

import type {
  AppData,
  Filters,
  Initiative,
  Kpi,
  KpiReading,
  Pillar,
  Project,
  Rag,
} from "./types";

export const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/** ترتيب الأرباع زمنياً */
export const qKey = (year: number, quarter: number) => year * 10 + quarter;

/** آخر قراءة تحمل قيمة فعلية للمؤشر (ضمن حد زمني اختياري) */
export function latestReading(
  kpi: Kpi,
  upTo?: { year: number; quarter: number },
): KpiReading | null {
  const list = kpi.readings
    .filter((r) => r.actual !== null)
    .filter((r) => (upTo ? qKey(r.year, r.quarter) <= qKey(upTo.year, upTo.quarter) : true))
    .sort((a, b) => qKey(b.year, b.quarter) - qKey(a.year, a.quarter));
  return list[0] ?? null;
}

/** قراءة محددة بالسنة والربع */
export function readingAt(kpi: Kpi, year: number, quarter: number): KpiReading | null {
  return kpi.readings.find((r) => r.year === year && r.quarter === quarter) ?? null;
}

/**
 * نسبة تحقق المؤشر مقارنة بمستهدف الفترة، محسوبة من خط الأساس
 * لتعكس التقدم الحقيقي وليس مجرد نسبة القيمة إلى المستهدف.
 */
export function achievement(kpi: Kpi, reading: KpiReading | null): number | null {
  if (!reading || reading.actual === null) return null;
  const { baseline, direction } = kpi;
  const t = reading.target;
  const a = reading.actual;

  if (direction === "increase") {
    const span = t - baseline;
    if (Math.abs(span) < 1e-9) return t === 0 ? 100 : clamp((a / t) * 100, 0, 150);
    return clamp(((a - baseline) / span) * 100, 0, 150);
  }
  const span = baseline - t;
  if (Math.abs(span) < 1e-9) return a === 0 ? 100 : clamp((t / a) * 100, 0, 150);
  return clamp(((baseline - a) / span) * 100, 0, 150);
}

/** تحويل نسبة التحقق إلى حالة RAG */
export function ragOf(pct: number | null, green = 95, amber = 80): Rag {
  if (pct === null || Number.isNaN(pct)) return "gray";
  if (pct >= green) return "green";
  if (pct >= amber) return "amber";
  return "red";
}

export const RAG_COLORS: Record<Rag, string> = {
  green: "#1cc182",
  amber: "#ffa300",
  red: "#c40000",
  gray: "#c3c1cc",
};

export const RAG_BG: Record<Rag, string> = {
  green: "bg-dga-green/12 text-dga-green-400 border-dga-green/30",
  amber: "bg-dga-orange/12 text-warn-text border-dga-orange/35",
  red: "bg-dga-red/10 text-dga-red border-dga-red/30",
  gray: "bg-n100 text-n500 border-n200",
};

/** حالة RAG للمؤشر عند فترة محددة (أو آخر قراءة) */
export function kpiRag(
  kpi: Kpi,
  at?: { year: number; quarter: number },
  green = 95,
  amber = 80,
): { rag: Rag; pct: number | null; reading: KpiReading | null } {
  const reading = at ? readingAt(kpi, at.year, at.quarter) : latestReading(kpi);
  const r = reading && reading.actual !== null ? reading : at ? null : latestReading(kpi);
  const pct = achievement(kpi, r);
  return { rag: ragOf(pct, green, amber), pct, reading: r };
}

// ------------------------------------------------------------- المشاريع

/** نسبة الإنجاز المخططة بناءً على الزمن المنقضي من مدة المشروع */
export function plannedProgress(p: Project, now = new Date()): number {
  const s = new Date(p.startDate + "T00:00:00Z").getTime();
  const e = new Date(p.endDate + "T00:00:00Z").getTime();
  const n = now.getTime();
  if (n <= s) return 0;
  if (n >= e) return 100;
  return clamp(((n - s) / (e - s)) * 100);
}

/** الانحراف بين الفعلي والمخطط (موجب = متقدم على الخطة) */
export function projectVariance(p: Project, now = new Date()): number {
  return Math.round((p.actualProgress - plannedProgress(p, now)) * 10) / 10;
}

/** حالة RAG للمشروع بناءً على الانحراف عن الخطة والمعالم المتأخرة */
export function projectRag(p: Project, now = new Date()): Rag {
  if (p.status === "completed") return "green";
  if (p.status === "cancelled") return "gray";
  const v = projectVariance(p, now);
  const delayed = p.milestones.filter((m) => m.status === "delayed").length;
  if (p.status === "on_hold") return "red";
  if (v >= -5 && delayed === 0) return "green";
  if (v >= -15 && delayed <= 1) return "amber";
  return "red";
}

/** نسبة إنجاز المعالم للمشروع */
export function milestoneProgress(p: Project): number {
  if (!p.milestones.length) return 0;
  const total = p.milestones.reduce((s, m) => s + m.weight, 0) || p.milestones.length;
  const done = p.milestones
    .filter((m) => m.status === "completed")
    .reduce((s, m) => s + m.weight, 0);
  return clamp((done / total) * 100);
}

// ----------------------------------------------------------- التجميع الهرمي

/** إنجاز المبادرة = متوسط مرجّح بميزانيات مشاريعها */
export function initiativeProgress(init: Initiative, projects: Project[]): number {
  const list = projects.filter((p) => p.initiativeId === init.id && p.status !== "cancelled");
  if (!list.length) return 0;
  const totalW = list.reduce((s, p) => s + (p.budgetPlanned || 1), 0);
  return clamp(
    list.reduce((s, p) => s + p.actualProgress * (p.budgetPlanned || 1), 0) / totalW,
  );
}

export function initiativePlanned(init: Initiative, projects: Project[], now = new Date()): number {
  const list = projects.filter((p) => p.initiativeId === init.id && p.status !== "cancelled");
  if (!list.length) return plannedProgress({ ...init } as unknown as Project, now);
  const totalW = list.reduce((s, p) => s + (p.budgetPlanned || 1), 0);
  return clamp(
    list.reduce((s, p) => s + plannedProgress(p, now) * (p.budgetPlanned || 1), 0) / totalW,
  );
}

export function initiativeRag(init: Initiative, projects: Project[], now = new Date()): Rag {
  if (init.status === "completed") return "green";
  if (init.status === "cancelled") return "gray";
  if (init.status === "on_hold") return "red";
  const v = initiativeProgress(init, projects) - initiativePlanned(init, projects, now);
  if (v >= -5) return "green";
  if (v >= -15) return "amber";
  return "red";
}

/** إنجاز الركيزة = متوسط مرجّح بميزانيات مبادراتها */
export function pillarProgress(
  pillar: Pillar,
  initiatives: Initiative[],
  projects: Project[],
): number {
  const list = initiatives.filter((i) => i.pillarId === pillar.id && i.status !== "cancelled");
  if (!list.length) return 0;
  const totalW = list.reduce((s, i) => s + (i.budgetPlanned || 1), 0);
  return clamp(
    list.reduce((s, i) => s + initiativeProgress(i, projects) * (i.budgetPlanned || 1), 0) / totalW,
  );
}

/** الإنجاز العام للاستراتيجية = متوسط مرجّح بأوزان الركائز */
export function strategyProgress(data: AppData): number {
  const { pillars, initiatives, projects } = data;
  if (!pillars.length) return 0;
  const totalW = pillars.reduce((s, p) => s + (p.weight || 1), 0);
  return clamp(
    pillars.reduce(
      (s, p) => s + pillarProgress(p, initiatives, projects) * (p.weight || 1),
      0,
    ) / totalW,
  );
}

/** متوسط تحقق المؤشرات مرجّحاً بأوزانها */
export function kpiIndex(kpis: Kpi[], green = 95, amber = 80): number {
  const scored = kpis
    .map((k) => ({ w: k.weight || 1, pct: kpiRag(k, undefined, green, amber).pct }))
    .filter((x) => x.pct !== null) as Array<{ w: number; pct: number }>;
  if (!scored.length) return 0;
  const totalW = scored.reduce((s, x) => s + x.w, 0);
  return clamp(scored.reduce((s, x) => s + x.pct * x.w, 0) / totalW, 0, 150);
}

// ------------------------------------------------------------- الميزانية

export interface BudgetRow {
  id: string;
  name: string;
  planned: number;
  spent: number;
  remaining: number;
  utilization: number;
  progress: number;
  efficiency: number; // نسبة الإنجاز إلى نسبة الصرف
}

export function budgetByPillar(data: AppData): BudgetRow[] {
  return data.pillars.map((p) => {
    const inits = data.initiatives.filter((i) => i.pillarId === p.id);
    const planned = inits.reduce((s, i) => s + i.budgetPlanned, 0);
    const spent = inits.reduce((s, i) => s + i.budgetSpent, 0);
    const progress = pillarProgress(p, data.initiatives, data.projects);
    const utilization = planned ? (spent / planned) * 100 : 0;
    return {
      id: p.id,
      name: p.name,
      planned,
      spent,
      remaining: planned - spent,
      utilization,
      progress,
      efficiency: utilization ? progress / utilization : 0,
    };
  });
}

export function budgetByInitiative(data: AppData): BudgetRow[] {
  return data.initiatives.map((i) => {
    const progress = initiativeProgress(i, data.projects);
    const utilization = i.budgetPlanned ? (i.budgetSpent / i.budgetPlanned) * 100 : 0;
    return {
      id: i.id,
      name: i.name,
      planned: i.budgetPlanned,
      spent: i.budgetSpent,
      remaining: i.budgetPlanned - i.budgetSpent,
      utilization,
      progress,
      efficiency: utilization ? progress / utilization : 0,
    };
  });
}

// --------------------------------------------------------------- الفلاتر

export interface FilterContext {
  data: AppData;
  filters: Filters;
}

const matches = (value: string, filter: string) => !filter || value === filter;

export function filterInitiatives(data: AppData, f: Filters): Initiative[] {
  const objPillar = (objId: string) => data.objectives.find((o) => o.id === objId)?.pillarId ?? "";
  return data.initiatives.filter((i) => {
    if (!matches(i.pillarId, f.pillarId)) return false;
    if (f.objectiveId && !i.objectiveIds.includes(f.objectiveId)) return false;
    if (f.objectiveId && objPillar(f.objectiveId) && i.pillarId !== objPillar(f.objectiveId))
      return false;
    if (f.initiativeId && i.id !== f.initiativeId) return false;
    if (!matches(i.ownerId, f.ownerId)) return false;
    if (!matches(i.status, f.status)) return false;
    if (!matches(i.priority, f.priority)) return false;
    if (f.year) {
      const y = Number(f.year);
      const s = new Date(i.startDate).getUTCFullYear();
      const e = new Date(i.endDate).getUTCFullYear();
      if (y < s || y > e) return false;
    }
    if (f.search) {
      const q = f.search.trim();
      if (!(i.name.includes(q) || i.code.includes(q) || i.description.includes(q))) return false;
    }
    return true;
  });
}

export function filterProjects(data: AppData, f: Filters): Project[] {
  const allowedInits = new Set(filterInitiatives(data, f).map((i) => i.id));
  return data.projects.filter((p) => {
    if (!allowedInits.has(p.initiativeId)) return false;
    if (f.projectId && p.id !== f.projectId) return false;
    if (f.ownerId && p.ownerId !== f.ownerId) return false;
    if (f.status && p.status !== f.status) return false;
    if (f.priority && p.priority !== f.priority) return false;
    if (f.year) {
      const y = Number(f.year);
      const s = new Date(p.startDate).getUTCFullYear();
      const e = new Date(p.endDate).getUTCFullYear();
      if (y < s || y > e) return false;
    }
    if (f.quarter && f.year) {
      const q = Number(f.quarter);
      const qStart = new Date(Date.UTC(Number(f.year), (q - 1) * 3, 1)).getTime();
      const qEnd = new Date(Date.UTC(Number(f.year), q * 3, 0)).getTime();
      const s = new Date(p.startDate + "T00:00:00Z").getTime();
      const e = new Date(p.endDate + "T00:00:00Z").getTime();
      if (e < qStart || s > qEnd) return false;
    }
    if (f.search) {
      const q = f.search.trim();
      if (!(p.name.includes(q) || p.code.includes(q) || p.description.includes(q))) return false;
    }
    return true;
  });
}

export function filterKpis(data: AppData, f: Filters): Kpi[] {
  const allowedInits = new Set(filterInitiatives(data, f).map((i) => i.id));
  const objPillar = new Map(data.objectives.map((o) => [o.id, o.pillarId]));
  return data.kpis.filter((k) => {
    if (f.pillarId && objPillar.get(k.objectiveId) !== f.pillarId) return false;
    if (f.objectiveId && k.objectiveId !== f.objectiveId) return false;
    if (f.initiativeId && k.initiativeId !== f.initiativeId) return false;
    if (f.perspectiveId && k.perspectiveId !== f.perspectiveId) return false;
    if (f.ownerId && k.ownerId !== f.ownerId) return false;
    if (k.initiativeId && !allowedInits.has(k.initiativeId) && (f.pillarId || f.status || f.priority))
      return false;
    if (f.search) {
      const q = f.search.trim();
      if (!(k.name.includes(q) || k.code.includes(q))) return false;
    }
    return true;
  });
}

/** قائمة الأرباع المتاحة ضمن مدى الاستراتيجية حتى الفترة الحالية */
export function availableQuarters(data: AppData): Array<{ year: number; quarter: 1 | 2 | 3 | 4 }> {
  const out: Array<{ year: number; quarter: 1 | 2 | 3 | 4 }> = [];
  const { strategyStartYear, currentYear, currentQuarter } = data.settings;
  for (let y = strategyStartYear; y <= currentYear; y++) {
    for (let q = 1; q <= 4; q++) {
      if (y === currentYear && q > currentQuarter) break;
      out.push({ year: y, quarter: q as 1 | 2 | 3 | 4 });
    }
  }
  return out;
}
