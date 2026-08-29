"use client";

// =============================================================================
// شريط الفلاتر — يظهر على كل الشاشات ويشارك حالته عبر المخزن المركزي
// =============================================================================

import { useMemo, useState } from "react";
import { Filter, RotateCcw, Search, X } from "lucide-react";
import clsx from "clsx";

import { useStore } from "@/lib/store";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/types";
import type { Filters, Priority, Status } from "@/lib/types";
import { Select } from "@/components/ui";

export type FilterKey = keyof Filters;

const LABELS: Record<FilterKey, string> = {
  pillarId: "الركيزة",
  objectiveId: "الهدف",
  initiativeId: "المبادرة",
  projectId: "المشروع",
  ownerId: "المالك",
  year: "السنة",
  quarter: "الربع",
  status: "الحالة",
  priority: "الأولوية",
  perspectiveId: "المنظور",
  search: "بحث",
};

const DEFAULT_KEYS: FilterKey[] = [
  "pillarId",
  "objectiveId",
  "initiativeId",
  "projectId",
  "ownerId",
  "year",
  "quarter",
  "status",
  "priority",
];

export function FilterBar({
  keys = DEFAULT_KEYS,
  className,
  compact = false,
}: {
  keys?: FilterKey[];
  className?: string;
  compact?: boolean;
}) {
  const data = useStore((s) => s.data);
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  const setFilters = useStore((s) => s.setFilters);
  const resetFilters = useStore((s) => s.resetFilters);
  const [expanded, setExpanded] = useState(!compact);

  const years = useMemo(() => {
    const out: string[] = [];
    for (let y = data.settings.strategyStartYear; y <= data.settings.strategyEndYear; y++)
      out.push(String(y));
    return out;
  }, [data.settings.strategyStartYear, data.settings.strategyEndYear]);

  const objectives = useMemo(
    () => data.objectives.filter((o) => !filters.pillarId || o.pillarId === filters.pillarId),
    [data.objectives, filters.pillarId],
  );

  const initiatives = useMemo(
    () =>
      data.initiatives.filter(
        (i) =>
          (!filters.pillarId || i.pillarId === filters.pillarId) &&
          (!filters.objectiveId || i.objectiveIds.includes(filters.objectiveId)),
      ),
    [data.initiatives, filters.pillarId, filters.objectiveId],
  );

  const projects = useMemo(
    () =>
      data.projects.filter(
        (p) => !filters.initiativeId || p.initiativeId === filters.initiativeId,
      ),
    [data.projects, filters.initiativeId],
  );

  const activeCount = keys.filter((k) => filters[k]).length;

  const opts: Partial<Record<FilterKey, Array<{ value: string; label: string }>>> = {
    pillarId: data.pillars.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })),
    objectiveId: objectives.map((o) => ({ value: o.id, label: `${o.code} · ${o.name}` })),
    initiativeId: initiatives.map((i) => ({ value: i.id, label: `${i.code} · ${i.name}` })),
    projectId: projects.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })),
    ownerId: data.users
      .filter((u) => u.role === "owner" || u.role === "pmo")
      .map((u) => ({ value: u.id, label: u.name })),
    year: years.map((y) => ({ value: y, label: y })),
    quarter: [1, 2, 3, 4].map((q) => ({ value: String(q), label: `الربع ${q}` })),
    status: (Object.keys(STATUS_LABELS) as Status[]).map((s) => ({
      value: s,
      label: STATUS_LABELS[s],
    })),
    priority: (Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => ({
      value: p,
      label: PRIORITY_LABELS[p],
    })),
    perspectiveId: data.perspectives.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })),
  };

  const onChange = (k: FilterKey, v: string) => {
    // تغيير مستوى أعلى في الهرم يعيد ضبط المستويات الأدنى
    if (k === "pillarId") setFilters({ pillarId: v, objectiveId: "", initiativeId: "", projectId: "" });
    else if (k === "objectiveId") setFilters({ objectiveId: v, initiativeId: "", projectId: "" });
    else if (k === "initiativeId") setFilters({ initiativeId: v, projectId: "" });
    else setFilter(k, v);
  };

  return (
    <div
      className={clsx(
        "bg-surface border border-n200 rounded-[16px] shadow-card no-print",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex items-center gap-2 text-[13px] font-bold text-ink shrink-0">
          <Filter size={16} className="text-brand-text" />
          الفلاتر
          {activeCount > 0 ? (
            <span className="min-w-[20px] h-5 px-1.5 grid place-items-center rounded-full bg-brand-solid text-white text-[11px] font-bold tnum">
              {activeCount}
            </span>
          ) : null}
        </span>

        <div className="relative flex-1 min-w-0 max-w-md">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-n300" />
          <input
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="بحث بالاسم أو الرمز…"
            className="w-full h-9 rounded-[10px] border border-n300 bg-surface ps-9 pe-3 text-[13px] outline-none focus:border-brand-text transition-colors placeholder:text-n300"
          />
          {filters.search ? (
            <button
              onClick={() => setFilter("search", "")}
              className="absolute end-2 top-1/2 -translate-y-1/2 p-1 rounded text-n500 hover:text-ink"
              aria-label="مسح البحث"
            >
              <X size={13} />
            </button>
          ) : null}
        </div>

        {compact ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[12.5px] font-semibold text-brand-text hover:underline shrink-0"
          >
            {expanded ? "إخفاء الفلاتر" : "عرض كل الفلاتر"}
          </button>
        ) : null}

        {activeCount > 0 || filters.search ? (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-n500 hover:text-dga-red transition-colors shrink-0"
          >
            <RotateCcw size={14} />
            إعادة تعيين
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="px-4 pb-4 grid gap-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {keys
            .filter((k) => k !== "search")
            .map((k) => (
              <div key={k}>
                <span className="block text-[11.5px] font-semibold text-n500 mb-1">{LABELS[k]}</span>
                <Select
                  size="sm"
                  value={filters[k]}
                  onChange={(v) => onChange(k, v)}
                  options={opts[k] ?? []}
                  placeholder="الكل"
                />
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}

/** ملخص نصي للفلاتر المطبقة — يُطبع ضمن التقارير */
export function ActiveFilterSummary() {
  const data = useStore((s) => s.data);
  const filters = useStore((s) => s.filters);

  const parts: string[] = [];
  if (filters.pillarId)
    parts.push(`الركيزة: ${data.pillars.find((p) => p.id === filters.pillarId)?.name ?? ""}`);
  if (filters.objectiveId)
    parts.push(`الهدف: ${data.objectives.find((o) => o.id === filters.objectiveId)?.name ?? ""}`);
  if (filters.initiativeId)
    parts.push(`المبادرة: ${data.initiatives.find((i) => i.id === filters.initiativeId)?.name ?? ""}`);
  if (filters.projectId)
    parts.push(`المشروع: ${data.projects.find((p) => p.id === filters.projectId)?.name ?? ""}`);
  if (filters.ownerId)
    parts.push(`المالك: ${data.users.find((u) => u.id === filters.ownerId)?.name ?? ""}`);
  if (filters.year) parts.push(`السنة: ${filters.year}`);
  if (filters.quarter) parts.push(`الربع: ${filters.quarter}`);
  if (filters.status) parts.push(`الحالة: ${STATUS_LABELS[filters.status as Status]}`);
  if (filters.priority) parts.push(`الأولوية: ${PRIORITY_LABELS[filters.priority as Priority]}`);
  if (filters.search) parts.push(`بحث: ${filters.search}`);

  if (!parts.length) return <span className="text-[12px] text-n500">بدون فلاتر — كامل المحفظة</span>;
  return <span className="text-[12px] text-n500">{parts.join(" · ")}</span>;
}
