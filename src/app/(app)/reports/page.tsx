"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { FileBarChart, FileSpreadsheet, Printer } from "lucide-react";

import { ActiveFilterSummary, FilterBar } from "@/components/FilterBar";
import { ActualVsPlannedBar, MaturityRadar, TrendChart } from "@/components/charts";
import {
  Button,
  Card,
  CardHead,
  Chip,
  EmptyState,
  PageTitle,
  ProgressBar,
  RagBadge,
  Select,
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
  initiativePlanned,
  initiativeProgress,
  initiativeRag,
  kpiIndex,
  kpiRag,
  latestReading,
  pillarProgress,
  plannedProgress,
  projectRag,
  projectVariance,
  readingAt,
} from "@/lib/calc";
import { dateAr, kpiValue, money, num, pct } from "@/lib/format";
import { exportDashboardXlsx } from "@/lib/excel";

type ReportKind = "executive" | "pillar" | "risk" | "kpi";

const KIND_LABELS: Record<ReportKind, string> = {
  executive: "التقرير التنفيذي الشامل",
  pillar: "تقرير أداء الركائز",
  risk: "تقرير المخاطر والتعثر",
  kpi: "تقرير مؤشرات الأداء",
};

export default function ReportsPage() {
  const data = useStore((s) => s.data);
  const filters = useStore((s) => s.filters);
  const [kind, setKind] = useState<ReportKind>("executive");

  const now = new Date();
  const { ragGreen, ragAmber } = data.settings;

  const initiatives = useMemo(() => filterInitiatives(data, filters), [data, filters]);
  const projects = useMemo(() => filterProjects(data, filters), [data, filters]);
  const kpis = useMemo(() => filterKpis(data, filters), [data, filters]);

  const w = projects.reduce((s, p) => s + (p.budgetPlanned || 1), 0) || 1;
  const actual = projects.reduce((s, p) => s + p.actualProgress * (p.budgetPlanned || 1), 0) / w;
  const planned = projects.reduce((s, p) => s + plannedProgress(p, now) * (p.budgetPlanned || 1), 0) / w;
  const index = kpiIndex(kpis, ragGreen, ragAmber);
  const budgetPlanned = initiatives.reduce((s, i) => s + i.budgetPlanned, 0);
  const budgetSpent = initiatives.reduce((s, i) => s + i.budgetSpent, 0);

  const ragCounts = useMemo(() => {
    const c = { green: 0, amber: 0, red: 0, gray: 0 };
    kpis.forEach((k) => c[kpiRag(k, undefined, ragGreen, ragAmber).rag]++);
    return c;
  }, [kpis, ragGreen, ragAmber]);

  const delayedMs = projects.reduce(
    (s, p) => s + p.milestones.filter((m) => m.status === "delayed").length,
    0,
  );

  const pillarRows = useMemo(() => {
    const ids = new Set(initiatives.map((i) => i.pillarId));
    return data.pillars
      .filter((p) => ids.has(p.id))
      .map((p) => {
        const inits = initiatives.filter((i) => i.pillarId === p.id);
        const ww = inits.reduce((s, i) => s + (i.budgetPlanned || 1), 0) || 1;
        return {
          p,
          inits,
          progress: pillarProgress(p, initiatives, projects),
          planned:
            inits.reduce((s, i) => s + initiativePlanned(i, projects, now) * (i.budgetPlanned || 1), 0) / ww,
          budget: inits.reduce((s, i) => s + i.budgetPlanned, 0),
          spent: inits.reduce((s, i) => s + i.budgetSpent, 0),
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.pillars, initiatives, projects]);

  const trend = useMemo(
    () =>
      availableQuarters(data)
        .slice(-8)
        .map((q) => {
          const scored = kpis
            .map((k) => {
              const a = achievement(k, readingAt(k, q.year, q.quarter));
              return a === null ? null : { w: k.weight || 1, a };
            })
            .filter(Boolean) as Array<{ w: number; a: number }>;
          const tot = scored.reduce((s, x) => s + x.w, 0);
          return {
            label: `ر${q.quarter}·${String(q.year).slice(2)}`,
            index: tot ? Math.round(scored.reduce((s, x) => s + x.a * x.w, 0) / tot) : null,
          };
        }),
    [data, kpis],
  );

  const risks = useMemo(
    () =>
      projects
        .filter((p) => p.status !== "completed" && p.status !== "cancelled")
        .map((p) => ({ p, v: projectVariance(p, now), rag: projectRag(p, now) }))
        .filter((x) => x.rag !== "green")
        .sort((a, b) => a.v - b.v),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects],
  );

  const redKpis = useMemo(
    () => kpis.filter((k) => kpiRag(k, undefined, ragGreen, ragAmber).rag === "red"),
    [kpis, ragGreen, ragAmber],
  );

  const lateMilestones = useMemo(
    () =>
      projects.flatMap((p) =>
        p.milestones.filter((m) => m.status === "delayed").map((m) => ({ p, m })),
      ),
    [projects],
  );

  const verdict =
    actual - planned >= -2 && index >= ragGreen
      ? "التنفيذ ضمن المسار المخطط، والمؤشرات ضمن النطاق المستهدف."
      : actual - planned >= -10 || index >= ragAmber
        ? "التنفيذ قريب من المسار المخطط مع انحرافات محدودة تستدعي المتابعة."
        : "يوجد انحراف جوهري عن المسار المخطط يستدعي إجراءات تصحيحية عاجلة.";

  return (
    <>
      <PageTitle
        title="التقارير التنفيذية"
        subtitle="تقارير جاهزة للطباعة والعرض على القيادة، تعكس الفلاتر المطبقة"
        actions={
          <>
            <Select
              value={kind}
              onChange={(v) => setKind(v as ReportKind)}
              options={(Object.keys(KIND_LABELS) as ReportKind[]).map((k) => ({
                value: k,
                label: KIND_LABELS[k],
              }))}
              className="w-60"
            />
            <Button onClick={() => exportDashboardXlsx(data, filters)}>
              <FileSpreadsheet size={16} />
              XLSX
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              <Printer size={16} />
              تصدير PDF
            </Button>
          </>
        }
      />

      <FilterBar className="mb-5" compact />

      {/* ------------------------------------------------------ ترويسة التقرير */}
      <Card className="mb-5 print-border">
        <div className="flex flex-wrap items-start justify-between gap-5 p-6 border-b border-n100">
          <div className="flex items-start gap-4">
            <Image src="/brand/dga-emblem.png" alt="" width={52} height={52} className="object-contain" />
            <div>
              <p className="text-[12px] text-n500">{data.settings.entityName}</p>
              <h2 className="text-[20px] font-bold text-ink mt-1">{KIND_LABELS[kind]}</h2>
              <p className="text-[12.5px] text-n500 mt-1.5">{data.settings.strategyName}</p>
            </div>
          </div>
          <div className="text-start sm:text-end">
            <p className="text-[12px] text-n500">فترة التقرير</p>
            <p className="text-[15px] font-bold text-ink mt-1 tnum">
              الربع {data.settings.currentQuarter} · {data.settings.currentYear}
            </p>
            <p className="text-[11.5px] text-n500 mt-1.5">تاريخ الإصدار: {dateAr(new Date().toISOString())}</p>
          </div>
        </div>
        <div className="px-6 py-3 bg-n50 rounded-b-[16px] flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] font-bold text-n700">نطاق التقرير:</span>
          <ActiveFilterSummary />
        </div>
      </Card>

      {/* --------------------------------------------------------- الملخص */}
      <Card className="mb-5 print-border">
        <CardHead title="الملخص التنفيذي" icon={<FileBarChart size={17} />} />
        <div className="p-6">
          <p className="text-[14px] text-ink leading-[2] mb-5">
            بلغ الإنجاز الفعلي للمحفظة <strong className="tnum">{pct(actual, 1)}</strong> مقابل إنجاز
            مخطط قدره <strong className="tnum">{pct(planned, 1)}</strong>، بانحراف قدره{" "}
            <strong className={actual - planned < 0 ? "text-dga-red tnum" : "text-dga-green-400 tnum"}>
              {(actual - planned).toFixed(1)} نقطة
            </strong>
            . وسجّل مؤشر الأداء العام <strong className="tnum">{pct(index, 1)}</strong> من مستهدفات
            الفترة، موزعاً على <strong className="tnum">{num(kpis.length)}</strong> مؤشراً منها{" "}
            <strong className="tnum">{num(ragCounts.green)}</strong> ضمن المستهدف و{" "}
            <strong className="tnum">{num(ragCounts.red)}</strong> متعثراً. وبلغ المصروف من الميزانية{" "}
            <strong className="tnum">{money(budgetSpent)}</strong> من أصل{" "}
            <strong className="tnum">{money(budgetPlanned)}</strong> بنسبة صرف{" "}
            <strong className="tnum">{pct(budgetPlanned ? (budgetSpent / budgetPlanned) * 100 : 0, 1)}</strong>
            . {verdict}
          </p>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
            {[
              { l: "الإنجاز الفعلي", v: pct(actual, 1) },
              { l: "الإنجاز المخطط", v: pct(planned, 1) },
              { l: "مؤشر الأداء العام", v: pct(index, 1) },
              { l: "المبادرات", v: num(initiatives.length) },
              { l: "المشاريع", v: num(projects.length) },
              { l: "بنود تحتاج معالجة", v: num(ragCounts.red + delayedMs) },
            ].map((s) => (
              <div key={s.l} className="rounded-[10px] border border-n200 bg-n50 p-3.5 print-border">
                <p className="text-[11.5px] text-n500">{s.l}</p>
                <p className="text-[20px] font-bold text-ink mt-1.5 tnum">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* -------------------------------------------------------- المحتوى */}
      {(kind === "executive" || kind === "pillar") && (
        <>
          <Card className="mb-5 print-border">
            <CardHead title="أداء الركائز الاستراتيجية" subtitle="الإنجاز الفعلي مقابل المخطط والميزانية" />
            <div className="p-4">
              {pillarRows.length ? (
                <ActualVsPlannedBar
                  data={pillarRows.map((r) => ({
                    name: r.p.code,
                    actual: Math.round(r.progress),
                    planned: Math.round(r.planned),
                    color: r.p.color,
                  }))}
                />
              ) : (
                <EmptyState title="لا توجد بيانات ضمن الفلاتر" />
              )}
            </div>
            <TableWrap>
              <thead>
                <tr>
                  <Th>الركيزة</Th>
                  <Th width={70}>الوزن</Th>
                  <Th width={90}>المبادرات</Th>
                  <Th width={200}>الإنجاز الفعلي / المخطط</Th>
                  <Th width={130}>الميزانية</Th>
                  <Th width={110}>نسبة الصرف</Th>
                </tr>
              </thead>
              <tbody>
                {pillarRows.map((r) => (
                  <tr key={r.p.id}>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: r.p.color }} />
                        <span className="text-[13px] font-bold text-ink">{r.p.name}</span>
                      </span>
                    </Td>
                    <Td className="text-[12.5px] tnum">{r.p.weight}%</Td>
                    <Td className="text-[12.5px] tnum">{r.inits.length}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <ProgressBar value={r.progress} planned={r.planned} color={r.p.color} />
                        <span className="text-[12px] font-bold tnum w-16 shrink-0">
                          {Math.round(r.progress)}% / {Math.round(r.planned)}%
                        </span>
                      </div>
                    </Td>
                    <Td className="text-[12.5px] tnum">{money(r.budget, true)}</Td>
                    <Td className="text-[12.5px] tnum">{pct(r.budget ? (r.spent / r.budget) * 100 : 0)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Card>

          <Card className="mb-5 print-border print-page-break">
            <CardHead title="حالة المبادرات" subtitle="نسبة الإنجاز والتقييم لكل مبادرة ضمن نطاق التقرير" />
            <TableWrap>
              <thead>
                <tr>
                  <Th>المبادرة</Th>
                  <Th width={80}>الركيزة</Th>
                  <Th width={140}>المالك</Th>
                  <Th width={190}>الإنجاز</Th>
                  <Th width={120}>الميزانية</Th>
                  <Th width={100}>الحالة</Th>
                  <Th width={90}>التقييم</Th>
                </tr>
              </thead>
              <tbody>
                {initiatives.map((i) => {
                  const pillar = data.pillars.find((p) => p.id === i.pillarId);
                  const prog = initiativeProgress(i, data.projects);
                  const plan = initiativePlanned(i, data.projects, now);
                  return (
                    <tr key={i.id}>
                      <Td>
                        <span className="block text-[13px] font-bold text-ink">{i.name}</span>
                        <span className="block text-[11.5px] text-n500 mt-0.5 tnum">{i.code}</span>
                      </Td>
                      <Td>
                        <Chip color={pillar?.color}>{pillar?.code}</Chip>
                      </Td>
                      <Td className="text-[12.5px]">{data.users.find((u) => u.id === i.ownerId)?.name}</Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <ProgressBar value={prog} planned={plan} color={pillar?.color ?? "#2a206a"} />
                          <span className="text-[12px] font-bold tnum w-9 shrink-0">{Math.round(prog)}%</span>
                        </div>
                      </Td>
                      <Td className="text-[12.5px] tnum">{money(i.budgetPlanned, true)}</Td>
                      <Td>
                        <StatusBadge status={i.status} />
                      </Td>
                      <Td>
                        <RagBadge rag={initiativeRag(i, data.projects, now)} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          </Card>
        </>
      )}

      {(kind === "executive" || kind === "kpi") && (
        <>
          <Card className="mb-5 print-border print-page-break">
            <CardHead title="اتجاه مؤشر الأداء العام" subtitle="متوسط مرجّح لنسب التحقق عبر الأرباع الثمانية الأخيرة" />
            <div className="p-4">
              <TrendChart data={trend} keys={[{ key: "index", label: "مؤشر الأداء العام", color: "#2a206a" }]} />
            </div>
          </Card>

          <Card className="mb-5 print-border">
            <CardHead title="تفصيل مؤشرات الأداء" subtitle="آخر قراءة معتمدة ونسبة التحقق والتقييم" />
            <TableWrap>
              <thead>
                <tr>
                  <Th>المؤشر</Th>
                  <Th width={90}>المنظور</Th>
                  <Th width={100}>خط الأساس</Th>
                  <Th width={110}>مستهدف الفترة</Th>
                  <Th width={110}>الفعلي</Th>
                  <Th width={100}>التحقق</Th>
                  <Th width={90}>التقييم</Th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((k) => {
                  const r = latestReading(k);
                  const a = achievement(k, r);
                  return (
                    <tr key={k.id}>
                      <Td>
                        <span className="block text-[13px] font-bold text-ink">{k.name}</span>
                        <span className="block text-[11.5px] text-n500 mt-0.5 tnum">{k.code}</span>
                      </Td>
                      <Td>
                        <Chip>{data.perspectives.find((p) => p.id === k.perspectiveId)?.code}</Chip>
                      </Td>
                      <Td className="text-[12.5px] tnum">{kpiValue(k, k.baseline)}</Td>
                      <Td className="text-[12.5px] tnum">{kpiValue(k, r?.target ?? k.target)}</Td>
                      <Td className="text-[12.5px] font-bold tnum">{kpiValue(k, r?.actual ?? null)}</Td>
                      <Td className="text-[12.5px] font-bold tnum">{a === null ? "—" : pct(a)}</Td>
                      <Td>
                        <RagBadge
                          rag={kpiRag(k, undefined, ragGreen, ragAmber).rag}
                          label={a === null ? "بانتظار" : undefined}
                        />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          </Card>
        </>
      )}

      {(kind === "executive" || kind === "risk") && (
        <>
          <Card className="mb-5 print-border print-page-break">
            <CardHead
              title="المشاريع المتعثرة والمعرضة للخطر"
              subtitle={`${num(risks.length)} مشروعاً خارج النطاق الأخضر`}
            />
            {risks.length ? (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>المشروع</Th>
                    <Th width={140}>المالك</Th>
                    <Th width={180}>الإنجاز</Th>
                    <Th width={90}>الانحراف</Th>
                    <Th width={110}>معالم متأخرة</Th>
                    <Th width={100}>الحالة</Th>
                    <Th width={90}>التقييم</Th>
                  </tr>
                </thead>
                <tbody>
                  {risks.map(({ p, v, rag }) => (
                    <tr key={p.id}>
                      <Td>
                        <span className="block text-[13px] font-bold text-ink">{p.name}</span>
                        <span className="block text-[11.5px] text-n500 mt-0.5 tnum">{p.code}</span>
                      </Td>
                      <Td className="text-[12.5px]">{data.users.find((u) => u.id === p.ownerId)?.name}</Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <ProgressBar
                            value={p.actualProgress}
                            planned={plannedProgress(p, now)}
                            color={rag === "red" ? "#c40000" : "#ffa300"}
                          />
                          <span className="text-[12px] font-bold tnum w-9 shrink-0">
                            {Math.round(p.actualProgress)}%
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-[12.5px] font-bold text-dga-red tnum">{v.toFixed(1)}</span>
                      </Td>
                      <Td className="text-[12.5px] tnum">
                        {p.milestones.filter((m) => m.status === "delayed").length}
                      </Td>
                      <Td>
                        <StatusBadge status={p.status} />
                      </Td>
                      <Td>
                        <RagBadge rag={rag} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            ) : (
              <EmptyState title="لا توجد مشاريع متعثرة ضمن نطاق التقرير" />
            )}
          </Card>

          <Card className="mb-5 print-border">
            <CardHead
              title="المعالم المتأخرة ومبرراتها"
              subtitle={`${num(lateMilestones.length)} معلماً متأخراً مع المبرر المسجل من المالك`}
            />
            {lateMilestones.length ? (
              <TableWrap>
                <thead>
                  <tr>
                    <Th width={230}>المشروع</Th>
                    <Th width={230}>المعلم</Th>
                    <Th width={120}>الاستحقاق</Th>
                    <Th>مبرر التأخر</Th>
                  </tr>
                </thead>
                <tbody>
                  {lateMilestones.map(({ p, m }) => (
                    <tr key={m.id}>
                      <Td className="text-[12.5px] font-semibold">{p.name}</Td>
                      <Td className="text-[12.5px]">{m.name}</Td>
                      <Td className="text-[12px] tnum">{dateAr(m.dueDate)}</Td>
                      <Td className="text-[12px] text-n700 leading-relaxed">
                        {m.delayReason || <span className="text-n300">لم يُسجَّل مبرر بعد</span>}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            ) : (
              <EmptyState title="لا توجد معالم متأخرة" />
            )}
          </Card>

          {redKpis.length ? (
            <Card className="mb-5 print-border">
              <CardHead title="المؤشرات المتعثرة" subtitle="مؤشرات دون حد اللون الأصفر تستدعي خطة تصحيحية" />
              <TableWrap>
                <thead>
                  <tr>
                    <Th>المؤشر</Th>
                    <Th width={110}>مستهدف الفترة</Th>
                    <Th width={110}>الفعلي</Th>
                    <Th width={100}>التحقق</Th>
                    <Th>آخر تعليق مسجل</Th>
                  </tr>
                </thead>
                <tbody>
                  {redKpis.map((k) => {
                    const r = latestReading(k);
                    return (
                      <tr key={k.id}>
                        <Td>
                          <span className="block text-[13px] font-bold text-ink">{k.name}</span>
                          <span className="block text-[11.5px] text-n500 mt-0.5 tnum">{k.code}</span>
                        </Td>
                        <Td className="text-[12.5px] tnum">{kpiValue(k, r?.target ?? k.target)}</Td>
                        <Td className="text-[12.5px] font-bold tnum">{kpiValue(k, r?.actual ?? null)}</Td>
                        <Td className="text-[12.5px] font-bold text-dga-red tnum">
                          {pct(achievement(k, r))}
                        </Td>
                        <Td className="text-[12px] text-n700 leading-relaxed">{r?.comment || "—"}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            </Card>
          ) : null}
        </>
      )}

      {kind === "executive" ? (
        <Card className="mb-5 print-border print-page-break">
          <CardHead title="رادار النضج الرقمي" subtitle="مستوى النضج الحالي مقابل المستهدف عبر الأبعاد الثمانية" />
          <div className="p-4">
            <MaturityRadar
              height={400}
              data={data.maturity.map((m) => ({
                domain: m.name,
                current: m.current,
                target: m.target,
                previous: m.previous,
              }))}
            />
          </div>
        </Card>
      ) : null}

      <Card className="print-border">
        <div className="px-6 py-5">
          <p className="text-[11.5px] text-n500 leading-[1.9]">
            أُعِدَّ هذا التقرير آلياً من منصة رصد تنفيذ استراتيجية التحول الرقمي بتاريخ{" "}
            {dateAr(new Date().toISOString())}. تعكس الأرقام آخر الإدخالات الميدانية المسجلة من ملاك
            المبادرات والمشاريع، وتُحتسب نسب تحقق المؤشرات من خط الأساس مقارنة بمستهدف الفترة. حدود
            التقييم المعتمدة: أخضر عند {ragGreen}% فأكثر، وأصفر عند {ragAmber}% فأكثر.
          </p>
        </div>
      </Card>
    </>
  );
}
