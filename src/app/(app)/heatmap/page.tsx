"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileSpreadsheet, Grid3x3, Printer } from "lucide-react";
import clsx from "clsx";

import { FilterBar } from "@/components/FilterBar";
import {
  Button,
  Card,
  CardHead,
  Chip,
  EmptyState,
  PageTitle,
  RagBadge,
  Select,
  StatCard,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { RAG_COLORS, achievement, availableQuarters, filterKpis, ragOf, readingAt } from "@/lib/calc";
import { kpiValue, num, pct } from "@/lib/format";
import { exportKpisXlsx } from "@/lib/excel";
import type { Rag } from "@/lib/types";

type GroupBy = "pillar" | "perspective" | "initiative" | "owner";

const GROUP_LABELS: Record<GroupBy, string> = {
  pillar: "الركيزة الاستراتيجية",
  perspective: "منظور إطار قياس",
  initiative: "المبادرة",
  owner: "مالك المؤشر",
};

export default function HeatmapPage() {
  const data = useStore((s) => s.data);
  const filters = useStore((s) => s.filters);
  const [groupBy, setGroupBy] = useState<GroupBy>("pillar");
  const [hover, setHover] = useState<string>("");

  const { ragGreen, ragAmber } = data.settings;
  const kpis = useMemo(() => filterKpis(data, filters), [data, filters]);
  const quarters = useMemo(() => availableQuarters(data).slice(-8), [data]);

  const objPillar = useMemo(
    () => new Map(data.objectives.map((o) => [o.id, o.pillarId])),
    [data.objectives],
  );

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; color?: string; kpis: typeof kpis }>();
    kpis.forEach((k) => {
      let key = "";
      let label = "";
      let color: string | undefined;
      if (groupBy === "pillar") {
        const p = data.pillars.find((x) => x.id === objPillar.get(k.objectiveId));
        key = p?.id ?? "none";
        label = p ? `${p.code} · ${p.name}` : "بدون ركيزة";
        color = p?.color;
      } else if (groupBy === "perspective") {
        const p = data.perspectives.find((x) => x.id === k.perspectiveId);
        key = p?.id ?? "none";
        label = p ? `${p.code} · ${p.name}` : "بدون منظور";
      } else if (groupBy === "initiative") {
        const i = data.initiatives.find((x) => x.id === k.initiativeId);
        key = i?.id ?? "none";
        label = i ? `${i.code} · ${i.name}` : "غير مرتبط بمبادرة";
        color = data.pillars.find((p) => p.id === i?.pillarId)?.color;
      } else {
        const u = data.users.find((x) => x.id === k.ownerId);
        key = u?.id ?? "none";
        label = u?.name ?? "غير محدد";
      }
      if (!map.has(key)) map.set(key, { label, color, kpis: [] });
      map.get(key)!.kpis.push(k);
    });
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [kpis, groupBy, data, objPillar]);

  const totals = useMemo(() => {
    const c = { green: 0, amber: 0, red: 0, gray: 0 };
    kpis.forEach((k) => {
      quarters.forEach((q) => {
        const r = readingAt(k, q.year, q.quarter);
        c[ragOf(achievement(k, r), ragGreen, ragAmber)]++;
      });
    });
    return c;
  }, [kpis, quarters, ragGreen, ragAmber]);

  const cells = totals.green + totals.amber + totals.red + totals.gray || 1;

  return (
    <>
      <PageTitle
        title="الخريطة الحرارية لمؤشرات الأداء"
        subtitle="حالة كل مؤشر في كل ربع وفق نظام RAG — تُقرأ الخريطة أفقياً لتتبع مسار المؤشر، ورأسياً لقراءة أداء الفترة"
        actions={
          <>
            <Select
              value={groupBy}
              onChange={(v) => setGroupBy(v as GroupBy)}
              options={(Object.keys(GROUP_LABELS) as GroupBy[]).map((g) => ({
                value: g,
                label: `تجميع حسب ${GROUP_LABELS[g]}`,
              }))}
              className="w-56"
            />
            <Button onClick={() => exportKpisXlsx(data, filters)}>
              <FileSpreadsheet size={16} />
              XLSX
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              <Printer size={16} />
              PDF
            </Button>
          </>
        }
      />

      <FilterBar
        keys={["pillarId", "objectiveId", "initiativeId", "perspectiveId", "ownerId"]}
        className="mb-5"
        compact
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard
          label="خلايا خضراء"
          value={num(totals.green)}
          accent="#1cc182"
          sub={`${pct((totals.green / cells) * 100)} من إجمالي الخلايا`}
        />
        <StatCard
          label="خلايا صفراء"
          value={num(totals.amber)}
          accent="#ffa300"
          sub={`${pct((totals.amber / cells) * 100)} من إجمالي الخلايا`}
        />
        <StatCard
          label="خلايا حمراء"
          value={num(totals.red)}
          accent="#c40000"
          sub={`${pct((totals.red / cells) * 100)} من إجمالي الخلايا`}
        />
        <StatCard
          label="بانتظار قراءة"
          value={num(totals.gray)}
          accent="#767286"
          sub={`${num(kpis.length)} مؤشراً × ${num(quarters.length)} أرباع`}
        />
      </div>

      <Card>
        <CardHead
          title="الخريطة الحرارية"
          subtitle={`مجمّعة حسب ${GROUP_LABELS[groupBy]} · آخر ${quarters.length} أرباع`}
          icon={<Grid3x3 size={17} />}
          action={
            <div className="flex items-center gap-3">
              {(["green", "amber", "red", "gray"] as Rag[]).map((r) => (
                <span key={r} className="flex items-center gap-1.5 text-[11.5px] text-n700">
                  <span className="w-3 h-3 rounded-[3px]" style={{ background: RAG_COLORS[r] }} />
                  {{ green: "أخضر", amber: "أصفر", red: "أحمر", gray: "لا قراءة" }[r]}
                </span>
              ))}
            </div>
          }
        />

        {groups.length ? (
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[820px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-start text-[11.5px] font-bold text-n500 px-3 py-2 sticky start-0 bg-white z-10 w-[300px]">
                    المؤشر
                  </th>
                  {quarters.map((q) => (
                    <th
                      key={`${q.year}-${q.quarter}`}
                      className="text-center text-[11px] font-bold text-n500 px-1 py-2 whitespace-nowrap"
                    >
                      ر{q.quarter}
                      <span className="block text-[10px] text-n300 tnum">{q.year}</span>
                    </th>
                  ))}
                  <th className="text-center text-[11.5px] font-bold text-n500 px-3 py-2 w-[110px]">
                    الحالة الحالية
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <>
                    <tr key={g.id}>
                      <td
                        colSpan={quarters.length + 2}
                        className="px-3 py-2.5 bg-n50 border-y border-n200"
                      >
                        <span className="flex items-center gap-2 text-[12.5px] font-bold text-ink">
                          {g.color ? (
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: g.color }} />
                          ) : null}
                          {g.label}
                          <span className="text-n500 font-semibold tnum">({g.kpis.length})</span>
                        </span>
                      </td>
                    </tr>
                    {g.kpis.map((k) => {
                      const lastR = quarters
                        .slice()
                        .reverse()
                        .map((q) => readingAt(k, q.year, q.quarter))
                        .find((r) => r && r.actual !== null);
                      const lastA = achievement(k, lastR ?? null);
                      return (
                        <tr key={k.id} className="group">
                          <td className="px-3 py-1.5 sticky start-0 bg-white group-hover:bg-n50 z-10 border-b border-n100">
                            <Link href={`/kpis/${k.id}`} className="block">
                              <span className="block text-[12.5px] font-semibold text-ink truncate max-w-[280px] group-hover:text-dga-navy transition-colors">
                                {k.name}
                              </span>
                              <span className="block text-[10.5px] text-n500 tnum">{k.code}</span>
                            </Link>
                          </td>
                          {quarters.map((q) => {
                            const r = readingAt(k, q.year, q.quarter);
                            const a = achievement(k, r);
                            const rag = ragOf(a, ragGreen, ragAmber);
                            const key = `${k.id}-${q.year}-${q.quarter}`;
                            return (
                              <td key={key} className="px-1 py-1.5 border-b border-n100">
                                <button
                                  onMouseEnter={() => setHover(key)}
                                  onMouseLeave={() => setHover("")}
                                  className={clsx(
                                    "relative w-full h-8 rounded-[6px] transition-transform hover:scale-[1.08] hover:z-20",
                                    rag === "gray" && "border border-n200",
                                  )}
                                  style={{ background: rag === "gray" ? "#f8f8fb" : RAG_COLORS[rag] }}
                                  title={`${k.name} — الربع ${q.quarter} ${q.year}`}
                                >
                                  <span
                                    className={clsx(
                                      "text-[10.5px] font-bold tnum",
                                      rag === "gray" ? "text-n300" : "text-white",
                                    )}
                                  >
                                    {a === null ? "—" : Math.round(a)}
                                  </span>
                                  {hover === key && r ? (
                                    <span className="absolute bottom-full mb-1.5 start-1/2 -translate-x-1/2 z-30 whitespace-nowrap rounded-[8px] bg-ink px-2.5 py-1.5 text-[11px] text-white shadow-pop pointer-events-none">
                                      الفعلي {kpiValue(k, r.actual)} / المستهدف {kpiValue(k, r.target)}
                                    </span>
                                  ) : null}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-3 py-1.5 border-b border-n100 text-center">
                            <RagBadge
                              rag={ragOf(lastA, ragGreen, ragAmber)}
                              label={lastA === null ? "بانتظار" : `${Math.round(lastA)}%`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="لا توجد مؤشرات ضمن الفلاتر الحالية"
            body="عدّل الفلاتر أو أضف مؤشرات إلى الهيكل الاستراتيجي."
            icon={<Grid3x3 size={34} />}
          />
        )}

        <div className="px-5 py-4 border-t border-n100 bg-n50 rounded-b-[16px]">
          <p className="text-[11.5px] text-n500 leading-relaxed">
            الرقم داخل كل خلية هو نسبة تحقق المؤشر مقارنة بمستهدف ذلك الربع، محسوبة من خط الأساس.
            الخلية الرمادية تعني عدم وجود قراءة معتمدة للفترة، وهي مؤشر على فجوة في الرصد لا على ضعف
            في الأداء.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Chip>أخضر ≥ {ragGreen}%</Chip>
            <Chip>أصفر ≥ {ragAmber}%</Chip>
            <Chip>أحمر أقل من {ragAmber}%</Chip>
          </div>
        </div>
      </Card>
    </>
  );
}
