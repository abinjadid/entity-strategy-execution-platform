"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CircleDollarSign, FileSpreadsheet, Printer, TrendingDown, TrendingUp } from "lucide-react";

import { FilterBar } from "@/components/FilterBar";
import { ActualVsPlannedBar, HorizontalBars } from "@/components/charts";
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
  Td,
  Th,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { filterInitiatives, filterProjects, initiativeProgress, pillarProgress } from "@/lib/calc";
import { money, num, pct } from "@/lib/format";
import { exportBudgetXlsx } from "@/lib/excel";

export default function BudgetPage() {
  const data = useStore((s) => s.data);
  const filters = useStore((s) => s.filters);

  const initiatives = useMemo(() => filterInitiatives(data, filters), [data, filters]);
  const projects = useMemo(() => filterProjects(data, filters), [data, filters]);

  const totals = useMemo(() => {
    const planned = initiatives.reduce((s, i) => s + i.budgetPlanned, 0);
    const spent = initiatives.reduce((s, i) => s + i.budgetSpent, 0);
    const w = initiatives.reduce((s, i) => s + (i.budgetPlanned || 1), 0) || 1;
    const progress =
      initiatives.reduce((s, i) => s + initiativeProgress(i, data.projects) * (i.budgetPlanned || 1), 0) / w;
    const util = planned ? (spent / planned) * 100 : 0;
    return { planned, spent, progress, util, remaining: planned - spent, efficiency: util ? progress / util : 0 };
  }, [initiatives, data.projects]);

  const byPillar = useMemo(() => {
    const ids = new Set(initiatives.map((i) => i.pillarId));
    return data.pillars
      .filter((p) => ids.has(p.id))
      .map((p) => {
        const inits = initiatives.filter((i) => i.pillarId === p.id);
        const planned = inits.reduce((s, i) => s + i.budgetPlanned, 0);
        const spent = inits.reduce((s, i) => s + i.budgetSpent, 0);
        const progress = pillarProgress(p, initiatives, data.projects);
        const util = planned ? (spent / planned) * 100 : 0;
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          color: p.color,
          planned,
          spent,
          remaining: planned - spent,
          util,
          progress,
          efficiency: util ? progress / util : 0,
        };
      });
  }, [data.pillars, initiatives, data.projects]);

  const rows = useMemo(
    () =>
      initiatives
        .map((i) => {
          const progress = initiativeProgress(i, data.projects);
          const util = i.budgetPlanned ? (i.budgetSpent / i.budgetPlanned) * 100 : 0;
          return {
            i,
            progress,
            util,
            efficiency: util ? progress / util : 0,
            pillar: data.pillars.find((p) => p.id === i.pillarId),
          };
        })
        .sort((a, b) => b.i.budgetPlanned - a.i.budgetPlanned),
    [initiatives, data.projects, data.pillars],
  );

  const overspend = rows.filter((r) => r.util > r.progress + 15);
  const underspend = rows.filter((r) => r.progress > r.util + 15);

  return (
    <>
      <PageTitle
        title="متابعة الميزانية"
        subtitle="مقارنة نسبة الصرف بنسبة الإنجاز لكشف الانحرافات المالية مبكراً — كفاءة الإنفاق = الإنجاز ÷ الصرف"
        actions={
          <>
            <Button onClick={() => exportBudgetXlsx(data)}>
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

      <FilterBar keys={["pillarId", "objectiveId", "ownerId", "year", "status", "priority"]} className="mb-5" compact />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-5">
        <StatCard
          label="الميزانية المعتمدة"
          value={money(totals.planned, true)}
          icon={<CircleDollarSign size={16} />}
          accent="#2a206a"
          sub={`${num(initiatives.length)} مبادرة · ${num(projects.length)} مشروع`}
        />
        <StatCard label="المصروف" value={money(totals.spent, true)} accent="#852cd0" sub={`${pct(totals.util, 1)} من المعتمد`} />
        <StatCard label="المتبقي" value={money(totals.remaining, true)} accent="#00abaf" sub={`${pct(100 - totals.util, 1)} من المعتمد`} />
        <StatCard label="نسبة الإنجاز" value={pct(totals.progress, 1)} accent="#1d9af2" sub="متوسط مرجّح بالميزانيات" />
        <StatCard
          label="كفاءة الإنفاق"
          value={num(totals.efficiency, 2)}
          icon={totals.efficiency >= 1 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          accent={totals.efficiency >= 1 ? "#1cc182" : totals.efficiency >= 0.85 ? "#ffa300" : "#c40000"}
          sub="الإنجاز ÷ الصرف — أعلى من 1 يعني إنجازاً يفوق الإنفاق"
        />
        <StatCard
          label="مبادرات تحتاج مراجعة"
          value={num(overspend.length)}
          accent="#c40000"
          sub={`${num(underspend.length)} مبادرة صرفها متأخر عن إنجازها`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3 mb-5">
        <Card className="xl:col-span-2">
          <CardHead
            title="نسبة الصرف مقابل نسبة الإنجاز حسب الركيزة"
            subtitle="تقارب النسبتين مؤشر على انضباط مالي؛ تفوق الصرف على الإنجاز يستدعي مراجعة"
          />
          <div className="p-4">
            {byPillar.length ? (
              <ActualVsPlannedBar
                data={byPillar.map((p) => ({
                  name: p.code,
                  actual: Math.round(p.progress),
                  planned: Math.round(p.util),
                  color: p.color,
                }))}
              />
            ) : (
              <EmptyState title="لا توجد بيانات ضمن الفلاتر" />
            )}
            <p className="text-[11.5px] text-n500 mt-3 pt-3 border-t border-n100 leading-relaxed">
              العمود الملوّن يمثل نسبة الإنجاز، والعمود الرمادي يمثل نسبة الصرف من الميزانية المعتمدة.
            </p>
          </div>
        </Card>

        <Card>
          <CardHead title="توزيع الميزانية على الركائز" subtitle="بالمليون ريال" />
          <div className="p-4">
            {byPillar.length ? (
              <HorizontalBars
                height={300}
                unit=""
                domainMax={Math.max(...byPillar.map((p) => p.planned / 1_000_000)) * 1.1}
                data={byPillar.map((p) => ({
                  name: p.code,
                  value: Number((p.planned / 1_000_000).toFixed(1)),
                  color: p.color,
                }))}
              />
            ) : (
              <EmptyState title="لا توجد بيانات" />
            )}
          </div>
        </Card>
      </div>

      <Card className="mb-5">
        <CardHead title="الميزانية حسب الركيزة" />
        <TableWrap>
          <thead>
            <tr>
              <Th>الركيزة</Th>
              <Th width={130}>المعتمد</Th>
              <Th width={130}>المصروف</Th>
              <Th width={130}>المتبقي</Th>
              <Th width={180}>نسبة الصرف</Th>
              <Th width={110}>نسبة الإنجاز</Th>
              <Th width={110}>كفاءة الإنفاق</Th>
            </tr>
          </thead>
          <tbody>
            {byPillar.map((p) => (
              <tr key={p.id} className="hover:bg-n50 transition-colors">
                <Td>
                  <span className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color }} />
                    <span className="text-[13px] font-bold text-ink">{p.name}</span>
                  </span>
                </Td>
                <Td className="text-[12.5px] tnum">{money(p.planned)}</Td>
                <Td className="text-[12.5px] tnum">{money(p.spent)}</Td>
                <Td className="text-[12.5px] tnum">{money(p.remaining)}</Td>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <ProgressBar value={p.util} planned={p.progress} color={p.color} />
                    <span className="text-[12px] font-bold tnum w-9 shrink-0">{Math.round(p.util)}%</span>
                  </div>
                </Td>
                <Td className="text-[12.5px] font-bold tnum">{pct(p.progress)}</Td>
                <Td>
                  <span
                    className={`text-[12.5px] font-bold tnum ${p.efficiency >= 1 ? "text-dga-green-400" : p.efficiency >= 0.85 ? "text-[#8a5a00]" : "text-dga-red"}`}
                  >
                    {p.efficiency.toFixed(2)}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>

      <Card>
        <CardHead
          title="الميزانية حسب المبادرة"
          subtitle="مرتبة تنازلياً حسب حجم الميزانية المعتمدة"
        />
        <TableWrap>
          <thead>
            <tr>
              <Th>المبادرة</Th>
              <Th width={90}>الركيزة</Th>
              <Th width={130}>المعتمد</Th>
              <Th width={130}>المصروف</Th>
              <Th width={170}>نسبة الصرف</Th>
              <Th width={110}>نسبة الإنجاز</Th>
              <Th width={110}>كفاءة الإنفاق</Th>
              <Th width={110}>التقييم المالي</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ i, progress, util, efficiency, pillar }) => (
              <tr key={i.id} className="hover:bg-n50 transition-colors">
                <Td>
                  <Link href={`/initiatives/${i.id}`} className="group">
                    <span className="block text-[13px] font-bold text-ink group-hover:text-dga-navy transition-colors">
                      {i.name}
                    </span>
                    <span className="block text-[11.5px] text-n500 mt-0.5 tnum">{i.code}</span>
                  </Link>
                </Td>
                <Td>
                  <Chip color={pillar?.color}>{pillar?.code}</Chip>
                </Td>
                <Td className="text-[12.5px] tnum">{money(i.budgetPlanned)}</Td>
                <Td className="text-[12.5px] tnum">{money(i.budgetSpent)}</Td>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <ProgressBar value={util} planned={progress} color={pillar?.color ?? "#2a206a"} />
                    <span className="text-[12px] font-bold tnum w-9 shrink-0">{Math.round(util)}%</span>
                  </div>
                </Td>
                <Td className="text-[12.5px] font-bold tnum">{pct(progress)}</Td>
                <Td>
                  <span
                    className={`text-[12.5px] font-bold tnum ${efficiency >= 1 ? "text-dga-green-400" : efficiency >= 0.85 ? "text-[#8a5a00]" : "text-dga-red"}`}
                  >
                    {efficiency.toFixed(2)}
                  </span>
                </Td>
                <Td>
                  <RagBadge
                    rag={efficiency >= 0.95 ? "green" : efficiency >= 0.8 ? "amber" : "red"}
                    label={
                      efficiency >= 0.95 ? "منضبط" : efficiency >= 0.8 ? "يحتاج متابعة" : "انحراف مالي"
                    }
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        {!rows.length ? <EmptyState title="لا توجد مبادرات ضمن الفلاتر" /> : null}
      </Card>

      <p className="mt-6 text-[11.5px] text-n500 leading-relaxed">
        كفاءة الإنفاق تُحتسب بقسمة نسبة الإنجاز على نسبة الصرف. القيمة الأعلى من 1 تعني إنجازاً
        يفوق ما أُنفق، والقيمة الأقل من 0.8 تستدعي مراجعة مالية للمبادرة قبل صرف الدفعات التالية.
      </p>
    </>
  );
}
