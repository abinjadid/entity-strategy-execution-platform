"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CircleDollarSign,
  FileSpreadsheet,
  Gauge,
  ListChecks,
  Printer,
  Target,
  TrendingUp,
} from "lucide-react";

import { FilterBar } from "@/components/FilterBar";
import { ActualVsPlannedBar, DonutStat, TrendChart, HorizontalBars } from "@/components/charts";
import {
  Button,
  Card,
  CardHead,
  EmptyState,
  PageTitle,
  ProgressBar,
  RagBadge,
  StatCard,
  StatusBadge,
  TableWrap,
  Td,
  Th,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import {
  achievement,
  availableQuarters,
  filterInitiatives,
  filterKpis,
  filterProjects,
  initiativeProgress,
  initiativePlanned,
  kpiIndex,
  kpiRag,
  pillarProgress,
  plannedProgress,
  projectRag,
  projectVariance,
  readingAt,
  ragOf,
} from "@/lib/calc";
import { money, num, pct, timeAgo } from "@/lib/format";
import { exportDashboardXlsx } from "@/lib/excel";

export default function DashboardPage() {
  const data = useStore((s) => s.data);
  const filters = useStore((s) => s.filters);

  const initiatives = useMemo(() => filterInitiatives(data, filters), [data, filters]);
  const projects = useMemo(() => filterProjects(data, filters), [data, filters]);
  const kpis = useMemo(() => filterKpis(data, filters), [data, filters]);

  const now = new Date();
  const { ragGreen, ragAmber } = data.settings;

  // ------------------------------------------------------------ مؤشرات عليا
  const actual = useMemo(() => {
    if (!projects.length) return 0;
    const w = projects.reduce((s, p) => s + (p.budgetPlanned || 1), 0);
    return projects.reduce((s, p) => s + p.actualProgress * (p.budgetPlanned || 1), 0) / w;
  }, [projects]);

  const planned = useMemo(() => {
    if (!projects.length) return 0;
    const w = projects.reduce((s, p) => s + (p.budgetPlanned || 1), 0);
    return projects.reduce((s, p) => s + plannedProgress(p, now) * (p.budgetPlanned || 1), 0) / w;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  const index = useMemo(() => kpiIndex(kpis, ragGreen, ragAmber), [kpis, ragGreen, ragAmber]);

  const budget = useMemo(() => {
    const p = initiatives.reduce((s, i) => s + i.budgetPlanned, 0);
    const sp = initiatives.reduce((s, i) => s + i.budgetSpent, 0);
    return { planned: p, spent: sp, util: p ? (sp / p) * 100 : 0 };
  }, [initiatives]);

  const ragCounts = useMemo(() => {
    const c = { green: 0, amber: 0, red: 0, gray: 0 };
    kpis.forEach((k) => c[kpiRag(k, undefined, ragGreen, ragAmber).rag]++);
    return c;
  }, [kpis, ragGreen, ragAmber]);

  const delayedMilestones = useMemo(
    () => projects.reduce((s, p) => s + p.milestones.filter((m) => m.status === "delayed").length, 0),
    [projects],
  );

  // ------------------------------------------------------ رسم الركائز
  const pillarRows = useMemo(() => {
    const ids = new Set(initiatives.map((i) => i.pillarId));
    return data.pillars
      .filter((p) => ids.has(p.id))
      .map((p) => {
        const inits = initiatives.filter((i) => i.pillarId === p.id);
        const w = inits.reduce((s, i) => s + (i.budgetPlanned || 1), 0) || 1;
        return {
          id: p.id,
          name: p.code,
          fullName: p.name,
          color: p.color,
          actual: pillarProgress(p, initiatives, projects),
          planned:
            inits.reduce((s, i) => s + initiativePlanned(i, projects, now) * (i.budgetPlanned || 1), 0) / w,
          weight: p.weight,
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.pillars, initiatives, projects]);

  // ------------------------------------------------------ اتجاه المؤشرات
  const trend = useMemo(() => {
    const qs = availableQuarters(data);
    return qs.slice(-10).map((q) => {
      const scored = kpis
        .map((k) => {
          const r = readingAt(k, q.year, q.quarter);
          const a = achievement(k, r);
          return a === null ? null : { w: k.weight || 1, a };
        })
        .filter(Boolean) as Array<{ w: number; a: number }>;
      const tot = scored.reduce((s, x) => s + x.w, 0);
      return {
        label: `ر${q.quarter}·${String(q.year).slice(2)}`,
        index: tot ? Math.round(scored.reduce((s, x) => s + x.a * x.w, 0) / tot) : null,
        threshold: ragGreen,
      };
    });
  }, [data, kpis, ragGreen]);

  // ------------------------------------------------------ أعلى المخاطر
  const risks = useMemo(
    () =>
      projects
        .filter((p) => p.status !== "completed" && p.status !== "cancelled")
        .map((p) => ({ p, v: projectVariance(p, now), rag: projectRag(p, now) }))
        .filter((x) => x.rag !== "green")
        .sort((a, b) => a.v - b.v)
        .slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects],
  );

  const topInitiatives = useMemo(
    () =>
      initiatives
        .map((i) => ({
          name: i.code,
          value: initiativeProgress(i, projects),
          color: data.pillars.find((p) => p.id === i.pillarId)?.color,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    [initiatives, projects, data.pillars],
  );

  const recent = useMemo(() => data.notifications.slice(0, 6), [data.notifications]);

  return (
    <>
      <PageTitle
        title="لوحة القيادة"
        subtitle={`${data.settings.strategyName} · ${data.settings.entityName}`}
        actions={
          <>
            <Button onClick={() => exportDashboardXlsx(data, filters)}>
              <FileSpreadsheet size={16} />
              تصدير XLSX
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              <Printer size={16} />
              تصدير PDF
            </Button>
          </>
        }
      />

      <FilterBar className="mb-5" compact />

      {/* ------------------------------------------------------ بطاقات عليا */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-5">
        <StatCard
          label="الإنجاز الفعلي للاستراتيجية"
          value={pct(actual, 1)}
          icon={<TrendingUp size={16} />}
          accent="#2a206a"
          sub={`المخطط ${pct(planned, 1)}`}
          trend={{ value: actual - planned, label: "نقطة عن الخطة" }}
        />
        <StatCard
          label="مؤشر الأداء العام"
          value={pct(index, 1)}
          icon={<Gauge size={16} />}
          accent={index >= ragGreen ? "#1cc182" : index >= ragAmber ? "#ffa300" : "#c40000"}
          sub={`متوسط مرجّح لـ ${num(kpis.length)} مؤشراً`}
        />
        <StatCard
          label="المبادرات"
          value={num(initiatives.length)}
          icon={<Target size={16} />}
          accent="#852cd0"
          sub={`${num(initiatives.filter((i) => i.status === "completed").length)} مكتملة · ${num(
            initiatives.filter((i) => i.status === "in_progress").length,
          )} قيد التنفيذ`}
        />
        <StatCard
          label="المشاريع"
          value={num(projects.length)}
          icon={<ListChecks size={16} />}
          accent="#1d9af2"
          sub={`${num(projects.filter((p) => p.status === "completed").length)} مكتملة · ${num(
            projects.filter((p) => projectRag(p, now) === "red").length,
          )} متعثرة`}
        />
        <StatCard
          label="نسبة صرف الميزانية"
          value={pct(budget.util, 1)}
          icon={<CircleDollarSign size={16} />}
          accent="#00abaf"
          sub={`${money(budget.spent, true)} من ${money(budget.planned, true)}`}
        />
        <StatCard
          label="بنود تحتاج معالجة"
          value={num(ragCounts.red + delayedMilestones)}
          icon={<AlertTriangle size={16} />}
          accent="#c40000"
          sub={`${num(ragCounts.red)} مؤشر أحمر · ${num(delayedMilestones)} معلم متأخر`}
        />
      </div>

      {/* -------------------------------------------------------- الرسومات */}
      <div className="grid gap-5 xl:grid-cols-3 mb-5">
        <Card className="xl:col-span-2">
          <CardHead
            title="الإنجاز الفعلي مقابل المخطط حسب الركيزة"
            subtitle="النسب محسوبة كمتوسط مرجّح بميزانيات المشاريع ضمن كل ركيزة"
          />
          <div className="p-4">
            {pillarRows.length ? (
              <ActualVsPlannedBar
                data={pillarRows.map((r) => ({
                  name: r.name,
                  actual: Math.round(r.actual),
                  planned: Math.round(r.planned),
                  color: r.color,
                }))}
              />
            ) : (
              <EmptyState title="لا توجد بيانات ضمن الفلاتر المحددة" />
            )}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-n100 pt-3">
              {pillarRows.map((r) => (
                <span key={r.id} className="flex items-center gap-2 text-[12px] text-n700">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: r.color }} />
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-n500">{r.fullName}</span>
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHead
            title="توزيع مؤشرات الأداء — نظام RAG"
            subtitle={`أخضر ≥ ${ragGreen}% · أصفر ≥ ${ragAmber}% من مستهدف الفترة`}
          />
          <div className="p-5">
            <DonutStat
              centerValue={pct(index, 0)}
              centerLabel="مؤشر الأداء العام"
              segments={[
                { label: "أخضر", value: ragCounts.green, color: "#1cc182" },
                { label: "أصفر", value: ragCounts.amber, color: "#ffa300" },
                { label: "أحمر", value: ragCounts.red, color: "#c40000" },
                { label: "بانتظار قراءة", value: ragCounts.gray, color: "#c3c1cc" },
              ]}
            />
            <Link
              href="/heatmap"
              className="mt-5 flex items-center justify-between rounded-[10px] border border-n200 px-3.5 py-2.5 text-[12.5px] font-semibold text-brand-text hover:bg-n50 transition-colors no-print"
            >
              عرض الخريطة الحرارية الكاملة
              <ArrowLeft size={15} />
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3 mb-5">
        <Card className="xl:col-span-2">
          <CardHead
            title="اتجاه مؤشر الأداء العام عبر الأرباع"
            subtitle="متوسط مرجّح لنسب تحقق المؤشرات مقارنة بمستهدف كل ربع"
          />
          <div className="p-4">
            <TrendChart
              data={trend}
              keys={[
                { key: "index", label: "مؤشر الأداء العام", color: "#2a206a" },
                { key: "threshold", label: `حد اللون الأخضر (${ragGreen}%)`, color: "#1cc182", dashed: true },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHead title="أعلى المبادرات إنجازاً" subtitle="نسبة الإنجاز الفعلي لكل مبادرة" />
          <div className="p-4">
            {topInitiatives.length ? (
              <HorizontalBars data={topInitiatives} height={300} />
            ) : (
              <EmptyState title="لا توجد مبادرات ضمن الفلاتر" />
            )}
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------------- المخاطر */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHead
            title="المشاريع التي تحتاج معالجة"
            subtitle="مرتبة تصاعدياً حسب الانحراف بين الإنجاز الفعلي والمخطط"
            action={
              <Link
                href="/projects"
                className="text-[12.5px] font-semibold text-brand-text hover:underline"
              >
                كل المشاريع
              </Link>
            }
          />
          {risks.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <Th>المشروع</Th>
                  <Th width={130}>المبادرة</Th>
                  <Th width={170}>الإنجاز</Th>
                  <Th width={90}>الانحراف</Th>
                  <Th width={100}>الحالة</Th>
                  <Th width={90}>التقييم</Th>
                </tr>
              </thead>
              <tbody>
                {risks.map(({ p, v, rag }) => {
                  const init = data.initiatives.find((i) => i.id === p.initiativeId);
                  return (
                    <tr key={p.id} className="hover:bg-n50 transition-colors">
                      <Td>
                        <Link href={`/projects/${p.id}`} className="block group">
                          <span className="block text-[13px] font-bold text-ink group-hover:text-brand-text transition-colors">
                            {p.name}
                          </span>
                          <span className="block text-[11.5px] text-n500 mt-0.5 tnum">{p.code}</span>
                        </Link>
                      </Td>
                      <Td className="text-[12px] text-n700">{init?.code}</Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <ProgressBar
                            value={p.actualProgress}
                            planned={plannedProgress(p, now)}
                            color={rag === "red" ? "#c40000" : rag === "amber" ? "#ffa300" : "#2a206a"}
                          />
                          <span className="text-[12px] font-bold tnum w-9 shrink-0">
                            {Math.round(p.actualProgress)}%
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span
                          className={`text-[12.5px] font-bold tnum ${v < 0 ? "text-dga-red" : "text-dga-green-400"}`}
                        >
                          {v > 0 ? "+" : ""}
                          {v.toFixed(1)}
                        </span>
                      </Td>
                      <Td>
                        <StatusBadge status={p.status} />
                      </Td>
                      <Td>
                        <RagBadge rag={rag} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          ) : (
            <EmptyState
              title="لا توجد مشاريع متعثرة ضمن الفلاتر الحالية"
              body="كل المشاريع ضمن النطاق المقبول للانحراف عن الخطة."
            />
          )}
        </Card>

        <Card>
          <CardHead
            title="آخر التحديثات"
            subtitle="سجل الإدخالات الميدانية من ملاك المبادرات والمشاريع"
            action={
              <Link href="/notifications" className="text-[12.5px] font-semibold text-brand-text hover:underline">
                الكل
              </Link>
            }
          />
          <ul className="divide-y divide-n100">
            {recent.map((n) => (
              <li key={n.id} className="px-5 py-3.5 flex gap-3">
                <span
                  className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                  style={{
                    background:
                      n.severity === "warning" ? "#ffa300" : n.severity === "success" ? "#1cc182" : "#1d9af2",
                  }}
                />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-ink">{n.title}</p>
                  <p className="text-[12px] text-n700 mt-1 leading-relaxed">{n.body}</p>
                  <p className="text-[11px] text-n500 mt-1.5">{timeAgo(n.at)}</p>
                </div>
              </li>
            ))}
            {!recent.length ? <EmptyState title="لا توجد تحديثات بعد" /> : null}
          </ul>
        </Card>
      </div>

      <p className="mt-6 text-[11.5px] text-n500 leading-relaxed">
        نظام RAG: أخضر عند تحقق {ragGreen}% فأكثر من مستهدف الفترة، وأصفر عند {ragAmber}% فأكثر، وما
        دون ذلك أحمر. تُحتسب نسبة التحقق من خط الأساس لا من الصفر، لتعكس التقدم الحقيقي المحرز.
      </p>
    </>
  );
}
