"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Gauge, PencilLine, Printer, Target } from "lucide-react";

import { Breadcrumb } from "@/components/AppShell";
import { KpiEntryModal } from "@/components/KpiEntryModal";
import { TrendChart } from "@/components/charts";
import {
  Button,
  Card,
  CardHead,
  Chip,
  EmptyState,
  PageTitle,
  RagBadge,
  StatCard,
  TableWrap,
  Td,
  Th,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { canEnterKpi } from "@/lib/rbac";
import { achievement, kpiRag, latestReading, qKey, ragOf } from "@/lib/calc";
import { dateTimeAr, kpiValue, num, pct } from "@/lib/format";
import { FREQUENCY_LABELS, UNIT_LABELS } from "@/lib/types";

export default function KpiDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const data = useStore((s) => s.data);
  const currentUserId = useStore((s) => s.currentUserId);
  const user = data.users.find((u) => u.id === currentUserId) ?? null;
  const [entry, setEntry] = useState(false);

  const kpi = data.kpis.find((k) => k.id === id);

  const series = useMemo(() => {
    if (!kpi) return [];
    return kpi.readings
      .slice()
      .sort((a, b) => qKey(a.year, a.quarter) - qKey(b.year, b.quarter))
      .map((r) => ({
        label: `ر${r.quarter}·${String(r.year).slice(2)}`,
        actual: r.actual,
        target: r.target,
      }));
  }, [kpi]);

  if (!kpi) {
    return (
      <Card>
        <EmptyState title="المؤشر غير موجود" body="ربما حُذف أو أن الرابط غير صحيح." />
      </Card>
    );
  }

  const objective = data.objectives.find((o) => o.id === kpi.objectiveId);
  const pillar = data.pillars.find((p) => p.id === objective?.pillarId);
  const init = data.initiatives.find((i) => i.id === kpi.initiativeId);
  const persp = data.perspectives.find((p) => p.id === kpi.perspectiveId);
  const owner = data.users.find((u) => u.id === kpi.ownerId);
  const last = latestReading(kpi);
  const ach = achievement(kpi, last);
  const { rag } = kpiRag(kpi, undefined, data.settings.ragGreen, data.settings.ragAmber);
  const may = canEnterKpi(user, kpi.id, data);

  const overall =
    kpi.direction === "increase"
      ? kpi.target - kpi.baseline === 0
        ? 100
        : (((last?.actual ?? kpi.baseline) - kpi.baseline) / (kpi.target - kpi.baseline)) * 100
      : kpi.baseline - kpi.target === 0
        ? 100
        : ((kpi.baseline - (last?.actual ?? kpi.baseline)) / (kpi.baseline - kpi.target)) * 100;

  return (
    <>
      <Breadcrumb
        items={[
          { label: "مؤشرات الأداء", href: "/kpis" },
          { label: kpi.code },
        ]}
      />

      <PageTitle
        title={kpi.name}
        subtitle={`${kpi.code} · ${objective?.name ?? ""}`}
        actions={
          <>
            {may ? (
              <Button variant="primary" onClick={() => setEntry(true)}>
                <PencilLine size={16} />
                إدخال قيمة فعلية
              </Button>
            ) : null}
            <Button onClick={() => window.print()}>
              <Printer size={16} />
              تصدير PDF
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {pillar ? <Chip color={pillar.color}>{pillar.name}</Chip> : null}
        {persp ? <Chip>منظور قياس: {persp.code} · {persp.name}</Chip> : null}
        {init ? (
          <Link href={`/initiatives/${init.id}`}>
            <Chip className="hover:border-brand-text">{init.code} · {init.name}</Chip>
          </Link>
        ) : null}
        <Chip>{FREQUENCY_LABELS[kpi.frequency]}</Chip>
        <Chip>{kpi.direction === "increase" ? "تصاعدي — كلما زاد كان أفضل" : "تنازلي — كلما قل كان أفضل"}</Chip>
        <Chip>المالك: {owner?.name}</Chip>
        <RagBadge rag={rag} />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 mb-5">
        <StatCard label="خط الأساس" value={kpiValue(kpi, kpi.baseline)} accent="#767286" sub="نقطة الانطلاق" />
        <StatCard label="مستهدف الفترة" value={kpiValue(kpi, last?.target ?? kpi.target)} accent="#1d9af2" sub={last ? `الربع ${last.quarter} · ${last.year}` : "—"} />
        <StatCard label="القيمة الفعلية" value={kpiValue(kpi, last?.actual ?? null)} accent="#2a206a" sub="آخر قراءة معتمدة" />
        <StatCard
          label="نسبة التحقق"
          value={ach === null ? "—" : pct(ach)}
          icon={<Gauge size={16} />}
          accent={rag === "green" ? "#1cc182" : rag === "amber" ? "#ffa300" : "#c40000"}
          sub="مقارنة بمستهدف الفترة"
        />
        <StatCard
          label="التقدم نحو المستهدف النهائي"
          value={pct(Math.max(0, Math.min(150, overall)))}
          icon={<Target size={16} />}
          accent="#852cd0"
          sub={`المستهدف ${kpiValue(kpi, kpi.target)}`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3 mb-5">
        <Card className="xl:col-span-2">
          <CardHead title="اتجاه المؤشر عبر الأرباع" subtitle="القيمة الفعلية مقابل مستهدف كل ربع" />
          <div className="p-4">
            <TrendChart
              data={series}
              height={320}
              keys={[
                { key: "target", label: `المستهدف (${UNIT_LABELS[kpi.unit]})`, color: "#c3c1cc", dashed: true },
                { key: "actual", label: `الفعلي (${UNIT_LABELS[kpi.unit]})`, color: pillar?.color ?? "#2a206a" },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHead title="تعريف المؤشر" />
          <div className="p-5 space-y-4 text-[13px]">
            <p className="text-n700 leading-[1.9]">{kpi.description}</p>
            <dl className="space-y-3 pt-4 border-t border-n100">
              {[
                ["الوحدة", UNIT_LABELS[kpi.unit]],
                ["الوزن ضمن المحفظة", String(kpi.weight)],
                ["حد اللون الأخضر", `${kpi.thresholdGreen}%`],
                ["حد اللون الأصفر", `${kpi.thresholdAmber}%`],
                ["عدد القراءات المسجلة", num(kpi.readings.filter((r) => r.actual !== null).length)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <dt className="text-n500 text-[12.5px]">{k}</dt>
                  <dd className="font-bold text-ink tnum">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>
      </div>

      <Card>
        <CardHead
          title="سجل القراءات"
          subtitle="كل قراءة موثقة بتعليق إلزامي واسم المُدخِل وتاريخ الإدخال"
        />
        <TableWrap>
          <thead>
            <tr>
              <Th width={130}>الفترة</Th>
              <Th width={110}>المستهدف</Th>
              <Th width={110}>الفعلي</Th>
              <Th width={110}>نسبة التحقق</Th>
              <Th width={90}>التقييم</Th>
              <Th>التعليق</Th>
              <Th width={140}>المُدخِل</Th>
              <Th width={130}>تاريخ الإدخال</Th>
            </tr>
          </thead>
          <tbody>
            {kpi.readings
              .slice()
              .sort((a, b) => qKey(b.year, b.quarter) - qKey(a.year, a.quarter))
              .map((r) => {
                const a = achievement(kpi, r);
                return (
                  <tr key={r.id} className="hover:bg-n50 transition-colors">
                    <Td className="text-[12.5px] font-semibold tnum">
                      الربع {r.quarter} · {r.year}
                    </Td>
                    <Td className="text-[12.5px] tnum">{kpiValue(kpi, r.target)}</Td>
                    <Td className="text-[12.5px] font-bold tnum">{kpiValue(kpi, r.actual)}</Td>
                    <Td className="text-[12.5px] font-bold tnum">{a === null ? "—" : pct(a)}</Td>
                    <Td>
                      <RagBadge
                        rag={ragOf(a, kpi.thresholdGreen, kpi.thresholdAmber)}
                        label={a === null ? "بانتظار" : undefined}
                      />
                    </Td>
                    <Td className="text-[12px] text-n700 leading-relaxed">
                      {r.comment || <span className="text-n300">—</span>}
                    </Td>
                    <Td className="text-[12px]">{data.users.find((u) => u.id === r.byUserId)?.name ?? "—"}</Td>
                    <Td className="text-[11.5px] text-n500 tnum">{r.actual === null ? "—" : dateTimeAr(r.at)}</Td>
                  </tr>
                );
              })}
          </tbody>
        </TableWrap>
      </Card>

      {entry ? <KpiEntryModal kpi={kpi} onClose={() => setEntry(false)} /> : null}
    </>
  );
}
