"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { CircleDollarSign, Gauge, ListChecks, Printer, Target, TrendingUp } from "lucide-react";

import { Breadcrumb } from "@/components/AppShell";
import { AreaTrend } from "@/components/charts";
import {
  Button,
  Card,
  CardHead,
  Chip,
  EmptyState,
  PageTitle,
  PriorityBadge,
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
  initiativePlanned,
  initiativeProgress,
  initiativeRag,
  kpiRag,
  latestReading,
  plannedProgress,
  projectRag,
  projectVariance,
  readingAt,
} from "@/lib/calc";
import { dateShort, kpiValue, money, num, pct, timeAgo } from "@/lib/format";

export default function InitiativeDetail() {
  const params = useParams<{ id: string }>();
  const data = useStore((s) => s.data);
  const id = params?.id ?? "";

  const init = data.initiatives.find((i) => i.id === id);
  const now = new Date();

  const projects = useMemo(
    () => data.projects.filter((p) => p.initiativeId === id),
    [data.projects, id],
  );
  const kpis = useMemo(() => data.kpis.filter((k) => k.initiativeId === id), [data.kpis, id]);

  const trend = useMemo(() => {
    if (!kpis.length) return [];
    return availableQuarters(data)
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
          value: tot ? Math.round(scored.reduce((s, x) => s + x.a * x.w, 0) / tot) : 0,
        };
      });
  }, [data, kpis]);

  if (!init) {
    return (
      <Card>
        <EmptyState title="المبادرة غير موجودة" body="ربما حُذفت أو أن الرابط غير صحيح." />
      </Card>
    );
  }

  const pillar = data.pillars.find((p) => p.id === init.pillarId);
  const owner = data.users.find((u) => u.id === init.ownerId);
  const prog = initiativeProgress(init, data.projects);
  const plan = initiativePlanned(init, data.projects, now);
  const rag = initiativeRag(init, data.projects, now);
  const util = init.budgetPlanned ? (init.budgetSpent / init.budgetPlanned) * 100 : 0;
  const delayedMs = projects.reduce(
    (s, p) => s + p.milestones.filter((m) => m.status === "delayed").length,
    0,
  );

  return (
    <>
      <Breadcrumb
        items={[
          { label: "الهيكل الاستراتيجي", href: "/strategy" },
          { label: "المبادرات", href: "/initiatives" },
          { label: init.code },
        ]}
      />

      <PageTitle
        title={init.name}
        subtitle={`${init.code} · ${pillar?.name ?? ""} · ${init.department}`}
        actions={
          <Button variant="primary" onClick={() => window.print()}>
            <Printer size={16} />
            تصدير PDF
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Chip color={pillar?.color}>{pillar?.code} · {pillar?.name}</Chip>
        <StatusBadge status={init.status} />
        <PriorityBadge priority={init.priority} />
        <RagBadge rag={rag} />
        <Chip>{dateShort(init.startDate)} — {dateShort(init.endDate)}</Chip>
        <Chip>المالك: {owner?.name}</Chip>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard
          label="الإنجاز الفعلي"
          value={pct(prog, 1)}
          icon={<TrendingUp size={16} />}
          accent={pillar?.color}
          sub={`المخطط ${pct(plan, 1)}`}
          trend={{ value: prog - plan, label: "نقطة عن الخطة" }}
        />
        <StatCard
          label="المشاريع"
          value={num(projects.length)}
          icon={<ListChecks size={16} />}
          accent="#1d9af2"
          sub={`${num(projects.filter((p) => p.status === "completed").length)} مكتملة · ${num(delayedMs)} معلم متأخر`}
        />
        <StatCard
          label="نسبة صرف الميزانية"
          value={pct(util, 1)}
          icon={<CircleDollarSign size={16} />}
          accent="#00abaf"
          sub={`${money(init.budgetSpent, true)} من ${money(init.budgetPlanned, true)}`}
        />
        <StatCard
          label="مؤشرات الأداء"
          value={num(kpis.length)}
          icon={<Gauge size={16} />}
          accent="#852cd0"
          sub={`${num(kpis.filter((k) => kpiRag(k, undefined, data.settings.ragGreen, data.settings.ragAmber).rag === "green").length)} ضمن المستهدف`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3 mb-5">
        <Card className="xl:col-span-2">
          <CardHead title="وصف المبادرة والأثر المتوقع" icon={<Target size={17} />} />
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[12px] font-bold text-n500 mb-1.5">الوصف</p>
              <p className="text-[13.5px] text-n700 leading-[1.9]">{init.description}</p>
            </div>
            <div className="pt-4 border-t border-n100">
              <p className="text-[12px] font-bold text-n500 mb-1.5">الأثر المتوقع</p>
              <p className="text-[13.5px] text-n700 leading-[1.9]">{init.expectedImpact || "—"}</p>
            </div>
            <div className="pt-4 border-t border-n100">
              <p className="text-[12px] font-bold text-n500 mb-2">الأهداف الاستراتيجية المرتبطة</p>
              <div className="flex flex-wrap gap-2">
                {init.objectiveIds.map((oid) => {
                  const o = data.objectives.find((x) => x.id === oid);
                  return o ? <Chip key={oid}>{o.code} · {o.name}</Chip> : null;
                })}
                {!init.objectiveIds.length ? <span className="text-[13px] text-n500">لا توجد أهداف مرتبطة</span> : null}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="اتجاه مؤشرات المبادرة" subtitle="متوسط مرجّح لنسب التحقق عبر الأرباع" />
          <div className="p-4">
            {trend.length ? (
              <AreaTrend data={trend} dataKey="value" label="نسبة التحقق" color={pillar?.color ?? "#2a206a"} />
            ) : (
              <EmptyState title="لا توجد مؤشرات مرتبطة بهذه المبادرة" />
            )}
          </div>
        </Card>
      </div>

      {/* --------------------------------------------------------- المشاريع */}
      <Card className="mb-5">
        <CardHead
          title="مشاريع المبادرة"
          subtitle={`${num(projects.length)} مشروع — اضغط على المشروع لتحديث نسبة الإنجاز والمعالم`}
        />
        {projects.length ? (
          <TableWrap>
            <thead>
              <tr>
                <Th>المشروع</Th>
                <Th width={150}>المالك</Th>
                <Th width={190}>الإنجاز</Th>
                <Th width={90}>الانحراف</Th>
                <Th width={120}>الميزانية</Th>
                <Th width={110}>المعالم</Th>
                <Th width={100}>الحالة</Th>
                <Th width={90}>التقييم</Th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const v = projectVariance(p, now);
                const done = p.milestones.filter((m) => m.status === "completed").length;
                const late = p.milestones.filter((m) => m.status === "delayed").length;
                return (
                  <tr key={p.id} className="hover:bg-n50 transition-colors">
                    <Td>
                      <Link href={`/projects/${p.id}`} className="group">
                        <span className="block text-[13px] font-bold text-ink group-hover:text-dga-navy transition-colors">
                          {p.name}
                        </span>
                        <span className="block text-[11.5px] text-n500 mt-0.5 tnum">
                          {p.code} · {dateShort(p.startDate)} — {dateShort(p.endDate)}
                        </span>
                      </Link>
                    </Td>
                    <Td className="text-[12.5px]">{data.users.find((u) => u.id === p.ownerId)?.name}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <ProgressBar
                          value={p.actualProgress}
                          planned={plannedProgress(p, now)}
                          color={pillar?.color ?? "#2a206a"}
                        />
                        <span className="text-[12px] font-bold tnum w-9 shrink-0">
                          {Math.round(p.actualProgress)}%
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <span className={`text-[12.5px] font-bold tnum ${v < 0 ? "text-dga-red" : "text-dga-green-400"}`}>
                        {v > 0 ? "+" : ""}
                        {v.toFixed(1)}
                      </span>
                    </Td>
                    <Td className="text-[12px] tnum">{money(p.budgetPlanned, true)}</Td>
                    <Td className="text-[12px] tnum">
                      {done}/{p.milestones.length}
                      {late ? <span className="text-dga-red font-bold"> · {late} متأخر</span> : null}
                    </Td>
                    <Td>
                      <StatusBadge status={p.status} />
                    </Td>
                    <Td>
                      <RagBadge rag={projectRag(p, now)} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        ) : (
          <EmptyState title="لا توجد مشاريع مرتبطة بهذه المبادرة" />
        )}
      </Card>

      {/* -------------------------------------------------------- المؤشرات */}
      <Card>
        <CardHead title="مؤشرات أداء المبادرة" subtitle="آخر قراءة معتمدة لكل مؤشر ونسبة تحققها" />
        {kpis.length ? (
          <TableWrap>
            <thead>
              <tr>
                <Th>المؤشر</Th>
                <Th width={110}>خط الأساس</Th>
                <Th width={120}>مستهدف الفترة</Th>
                <Th width={120}>القيمة الفعلية</Th>
                <Th width={110}>نسبة التحقق</Th>
                <Th width={90}>التقييم</Th>
                <Th width={130}>آخر تحديث</Th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k) => {
                const r = latestReading(k);
                const a = achievement(k, r);
                const { rag } = kpiRag(k, undefined, data.settings.ragGreen, data.settings.ragAmber);
                return (
                  <tr key={k.id} className="hover:bg-n50 transition-colors">
                    <Td>
                      <Link href={`/kpis/${k.id}`} className="group">
                        <span className="block text-[13px] font-bold text-ink group-hover:text-dga-navy transition-colors">
                          {k.name}
                        </span>
                        <span className="block text-[11.5px] text-n500 mt-0.5 tnum">{k.code}</span>
                      </Link>
                    </Td>
                    <Td className="text-[12.5px] tnum">{kpiValue(k, k.baseline)}</Td>
                    <Td className="text-[12.5px] tnum">{kpiValue(k, r?.target ?? k.target)}</Td>
                    <Td className="text-[12.5px] font-bold tnum">{kpiValue(k, r?.actual ?? null)}</Td>
                    <Td className="text-[12.5px] font-bold tnum">{a === null ? "—" : pct(a)}</Td>
                    <Td>
                      <RagBadge rag={rag} label={rag === "gray" ? "بانتظار" : undefined} />
                    </Td>
                    <Td className="text-[11.5px] text-n500">{r ? timeAgo(r.at) : "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        ) : (
          <EmptyState title="لا توجد مؤشرات مرتبطة بهذه المبادرة" />
        )}
      </Card>
    </>
  );
}
