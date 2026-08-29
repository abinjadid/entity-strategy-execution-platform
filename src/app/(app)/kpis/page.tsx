"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, FileSpreadsheet, Gauge, PencilLine, Printer } from "lucide-react";

import { FilterBar } from "@/components/FilterBar";
import { KpiEntryModal } from "@/components/KpiEntryModal";
import { DonutStat } from "@/components/charts";
import {
  Button,
  Card,
  CardHead,
  Chip,
  EmptyState,
  PageTitle,
  ProgressBar,
  RagBadge,
  StatCard,
  TableWrap,
  Tabs,
  Td,
  Th,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { canEnterKpi } from "@/lib/rbac";
import { achievement, activePerspectives, filterKpis, kpiIndex, kpiRag, latestReading } from "@/lib/calc";
import { kpiValue, num, pct, timeAgo } from "@/lib/format";
import { exportKpisXlsx } from "@/lib/excel";
import { FREQUENCY_LABELS } from "@/lib/types";

export default function KpisPage() {
  const data = useStore((s) => s.data);
  const filters = useStore((s) => s.filters);
  const currentUserId = useStore((s) => s.currentUserId);
  const user = data.users.find((u) => u.id === currentUserId) ?? null;

  const [tab, setTab] = useState("all");
  const [entry, setEntry] = useState<string | null>(null);

  const { ragGreen, ragAmber } = data.settings;
  const all = useMemo(() => filterKpis(data, filters), [data, filters]);

  const withRag = useMemo(
    () => all.map((k) => ({ k, ...kpiRag(k, undefined, ragGreen, ragAmber) })),
    [all, ragGreen, ragAmber],
  );

  const counts = useMemo(() => {
    const c = { green: 0, amber: 0, red: 0, gray: 0 };
    withRag.forEach((x) => c[x.rag]++);
    return c;
  }, [withRag]);

  const list = useMemo(() => {
    if (tab === "all") return withRag;
    if (tab === "mine") return withRag.filter((x) => canEnterKpi(user, x.k.id, data) && user?.role === "owner");
    if (tab === "pending") return withRag.filter((x) => x.rag === "gray");
    return withRag.filter((x) => x.rag === tab);
  }, [withRag, tab, user, data]);

  const index = useMemo(() => kpiIndex(all, ragGreen, ragAmber), [all, ragGreen, ragAmber]);
  const entryKpi = entry ? data.kpis.find((k) => k.id === entry) ?? null : null;

  return (
    <>
      <PageTitle
        title="مؤشرات الأداء"
        subtitle="إدخال القيم الفعلية بتعليق إلزامي، وربط كل مؤشر بهدف ومبادرة ومنظور من مناظير إطار قياس"
        actions={
          <>
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
        keys={["pillarId", "objectiveId", "initiativeId", "perspectiveId", "ownerId", "year", "quarter"]}
        className="mb-5"
        compact
      />

      <div className="grid gap-5 xl:grid-cols-3 mb-5">
        <div className="xl:col-span-2 grid gap-4 grid-cols-2 lg:grid-cols-4 content-start">
          <StatCard
            label="مؤشر الأداء العام"
            value={pct(index, 1)}
            icon={<Gauge size={16} />}
            accent={index >= ragGreen ? "#1cc182" : index >= ragAmber ? "#ffa300" : "#c40000"}
            sub="متوسط مرجّح بأوزان المؤشرات"
          />
          <StatCard label="ضمن المستهدف" value={num(counts.green)} accent="#1cc182" sub="حالة خضراء" />
          <StatCard label="تحتاج متابعة" value={num(counts.amber)} accent="#ffa300" sub="حالة صفراء" />
          <StatCard label="متعثرة" value={num(counts.red)} accent="#c40000" sub="حالة حمراء" />
          <StatCard
            label="إجمالي المؤشرات"
            value={num(all.length)}
            icon={<Building2 size={16} />}
            accent="#2a206a"
            sub={`${num(counts.gray)} بانتظار قراءة الفترة`}
          />
          <StatCard
            label="متوسط الوزن"
            value={num(all.length ? all.reduce((s, k) => s + k.weight, 0) / all.length : 0, 1)}
            accent="#852cd0"
            sub="من مجموع أوزان المحفظة"
          />
          <StatCard
            label="مرتبطة بمبادرات"
            value={num(all.filter((k) => k.initiativeId).length)}
            accent="#1d9af2"
            sub={`${num(all.filter((k) => !k.initiativeId).length)} غير مرتبطة`}
          />
          <StatCard
            label="مناظير مغطاة"
            value={num(new Set(all.map((k) => k.perspectiveId)).size)}
            accent="#00abaf"
            sub={`من ${num(activePerspectives(data).length)} مناظير في دورة القياس الجارية`}
          />
        </div>

        <Card>
          <CardHead title="توزيع حالات المؤشرات" subtitle={`أخضر ≥ ${ragGreen}% · أصفر ≥ ${ragAmber}%`} />
          <div className="p-5">
            <DonutStat
              centerValue={pct(index, 0)}
              centerLabel="مؤشر الأداء العام"
              segments={[
                { label: "أخضر", value: counts.green, color: "#1cc182" },
                { label: "أصفر", value: counts.amber, color: "#ffa300" },
                { label: "أحمر", value: counts.red, color: "#c40000" },
                { label: "بانتظار قراءة", value: counts.gray, color: "#c3c1cc" },
              ]}
            />
          </div>
        </Card>
      </div>

      <Card>
        <div className="px-2 pt-2">
          <Tabs
            active={tab}
            onChange={setTab}
            tabs={[
              { id: "all", label: "كل المؤشرات", count: withRag.length },
              ...(user?.role === "owner"
                ? [{ id: "mine", label: "مؤشراتي", count: withRag.filter((x) => canEnterKpi(user, x.k.id, data)).length }]
                : []),
              { id: "red", label: "متعثرة", count: counts.red },
              { id: "amber", label: "تحتاج متابعة", count: counts.amber },
              { id: "pending", label: "بانتظار قراءة", count: counts.gray },
            ]}
          />
        </div>

        {list.length ? (
          <TableWrap>
            <thead>
              <tr>
                <Th>المؤشر</Th>
                <Th width={120}>المنظور</Th>
                <Th width={100}>خط الأساس</Th>
                <Th width={110}>مستهدف الفترة</Th>
                <Th width={110}>الفعلي</Th>
                <Th width={160}>نسبة التحقق</Th>
                <Th width={90}>التقييم</Th>
                <Th width={70}>الوزن</Th>
                <Th width={120}>آخر إدخال</Th>
                <Th width={110}>الإجراء</Th>
              </tr>
            </thead>
            <tbody>
              {list.map(({ k, rag }) => {
                const r = latestReading(k);
                const a = achievement(k, r);
                const persp = activePerspectives(data).find((p) => p.id === k.perspectiveId);
                const may = canEnterKpi(user, k.id, data);
                return (
                  <tr key={k.id} className="hover:bg-n50 transition-colors">
                    <Td>
                      <Link href={`/kpis/${k.id}`} className="group">
                        <span className="block text-[13px] font-bold text-ink group-hover:text-brand-text transition-colors">
                          {k.name}
                        </span>
                        <span className="block text-[11.5px] text-n500 mt-0.5 tnum">
                          {k.code} · {FREQUENCY_LABELS[k.frequency]} ·{" "}
                          {k.direction === "increase" ? "تصاعدي" : "تنازلي"}
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      <Chip>{persp?.code}</Chip>
                    </Td>
                    <Td className="text-[12.5px] tnum">{kpiValue(k, k.baseline)}</Td>
                    <Td className="text-[12.5px] tnum">{kpiValue(k, r?.target ?? k.target)}</Td>
                    <Td className="text-[12.5px] font-bold tnum">{kpiValue(k, r?.actual ?? null)}</Td>
                    <Td>
                      {a === null ? (
                        <span className="text-[12px] text-n500">بانتظار القراءة</span>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <ProgressBar
                            value={Math.min(100, a)}
                            showPlanned={false}
                            color={rag === "green" ? "#1cc182" : rag === "amber" ? "#ffa300" : "#c40000"}
                          />
                          <span className="text-[12px] font-bold tnum w-10 shrink-0">{Math.round(a)}%</span>
                        </div>
                      )}
                    </Td>
                    <Td>
                      <RagBadge rag={rag} label={rag === "gray" ? "بانتظار" : undefined} />
                    </Td>
                    <Td className="text-[12.5px] tnum">{k.weight}</Td>
                    <Td className="text-[11.5px] text-n500">{r ? timeAgo(r.at) : "—"}</Td>
                    <Td>
                      {may ? (
                        <Button size="sm" onClick={() => setEntry(k.id)}>
                          <PencilLine size={14} />
                          إدخال
                        </Button>
                      ) : (
                        <span className="text-[11.5px] text-n500">اطلاع</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        ) : (
          <EmptyState title="لا توجد مؤشرات في هذا التبويب" icon={<Gauge size={34} />} />
        )}
      </Card>

      {entryKpi ? <KpiEntryModal kpi={entryKpi} onClose={() => setEntry(null)} /> : null}
    </>
  );
}
