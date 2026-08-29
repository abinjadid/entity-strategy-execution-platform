"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, FileSpreadsheet, ListChecks, Printer, SlidersHorizontal } from "lucide-react";

import { FilterBar } from "@/components/FilterBar";
import { StackedStatusBar } from "@/components/charts";
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
  Tabs,
  Td,
  Th,
} from "@/components/ui";
import { ProgressUpdateModal } from "@/components/ProgressUpdateModal";
import { useStore } from "@/lib/store";
import { canUpdateProject } from "@/lib/rbac";
import { filterProjects, plannedProgress, projectRag, projectVariance } from "@/lib/calc";
import { dateShort, money, num, pct, timeAgo } from "@/lib/format";
import { exportProjectsXlsx } from "@/lib/excel";

export default function ProjectsPage() {
  const data = useStore((s) => s.data);
  const filters = useStore((s) => s.filters);
  const currentUserId = useStore((s) => s.currentUserId);
  const user = data.users.find((u) => u.id === currentUserId) ?? null;

  const [tab, setTab] = useState("all");
  const [editing, setEditing] = useState<string | null>(null);

  const all = useMemo(() => filterProjects(data, filters), [data, filters]);
  const now = new Date();

  const mine = useMemo(
    () => all.filter((p) => canUpdateProject(user, p.id, data) && user?.role === "owner"),
    [all, user, data],
  );
  const atRisk = useMemo(
    () => all.filter((p) => projectRag(p, now) !== "green" && p.status !== "completed"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all],
  );
  const delayed = useMemo(
    () => all.filter((p) => p.milestones.some((m) => m.status === "delayed")),
    [all],
  );

  const list =
    tab === "mine" ? mine : tab === "risk" ? atRisk : tab === "delayed" ? delayed : all;

  const stats = useMemo(() => {
    const w = all.reduce((s, p) => s + (p.budgetPlanned || 1), 0) || 1;
    return {
      actual: all.reduce((s, p) => s + p.actualProgress * (p.budgetPlanned || 1), 0) / w,
      planned: all.reduce((s, p) => s + plannedProgress(p, now) * (p.budgetPlanned || 1), 0) / w,
      budget: all.reduce((s, p) => s + p.budgetPlanned, 0),
      spent: all.reduce((s, p) => s + p.budgetSpent, 0),
      milestones: all.reduce((s, p) => s + p.milestones.length, 0),
      lateMs: all.reduce((s, p) => s + p.milestones.filter((m) => m.status === "delayed").length, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  const byPillar = useMemo(() => {
    return data.pillars
      .map((pl) => {
        const inits = new Set(data.initiatives.filter((i) => i.pillarId === pl.id).map((i) => i.id));
        const ps = all.filter((p) => inits.has(p.initiativeId));
        if (!ps.length) return null;
        return {
          name: pl.code,
          مكتمل: ps.filter((p) => p.status === "completed").length,
          "قيد التنفيذ": ps.filter((p) => p.status === "in_progress").length,
          "لم يبدأ": ps.filter((p) => p.status === "not_started").length,
          متوقف: ps.filter((p) => p.status === "on_hold").length,
        };
      })
      .filter(Boolean) as Array<Record<string, string | number>>;
  }, [data.pillars, data.initiatives, all]);

  const editingProject = editing ? data.projects.find((p) => p.id === editing) ?? null : null;

  return (
    <>
      <PageTitle
        title="المشاريع والمعالم"
        subtitle="تحديث نسب التنفيذ بشريط التمرير، وحالات المعالم مع مبررات التأخر، وإرفاق مستندات التقدم"
        actions={
          <>
            <Button onClick={() => exportProjectsXlsx(data, filters)}>
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

      <FilterBar className="mb-5" compact />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard
          label="الإنجاز الفعلي للمشاريع"
          value={pct(stats.actual, 1)}
          icon={<ListChecks size={16} />}
          accent="#2a206a"
          sub={`المخطط ${pct(stats.planned, 1)}`}
          trend={{ value: stats.actual - stats.planned, label: "نقطة" }}
        />
        <StatCard
          label="عدد المشاريع"
          value={num(all.length)}
          icon={<ListChecks size={16} />}
          accent="#1d9af2"
          sub={`${num(all.filter((p) => p.status === "completed").length)} مكتملة · ${num(atRisk.length)} تحتاج معالجة`}
        />
        <StatCard
          label="المعالم"
          value={num(stats.milestones)}
          icon={<SlidersHorizontal size={16} />}
          accent="#852cd0"
          sub={`${num(stats.lateMs)} معلماً متأخراً يحتاج مبرراً`}
        />
        <StatCard
          label="الميزانية"
          value={money(stats.budget, true)}
          icon={<AlertTriangle size={16} />}
          accent="#00abaf"
          sub={`المصروف ${money(stats.spent, true)} · ${pct(stats.budget ? (stats.spent / stats.budget) * 100 : 0)}`}
        />
      </div>

      {byPillar.length ? (
        <Card className="mb-5">
          <CardHead title="توزيع حالات المشاريع حسب الركيزة" />
          <div className="p-4">
            <StackedStatusBar
              data={byPillar}
              keys={[
                { key: "مكتمل", label: "مكتمل", color: "#1cc182" },
                { key: "قيد التنفيذ", label: "قيد التنفيذ", color: "#1d9af2" },
                { key: "لم يبدأ", label: "لم يبدأ", color: "#c3c1cc" },
                { key: "متوقف", label: "متوقف", color: "#ffa300" },
              ]}
            />
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="px-2 pt-2">
          <Tabs
            active={tab}
            onChange={setTab}
            tabs={[
              { id: "all", label: "كل المشاريع", count: all.length },
              ...(user?.role === "owner" ? [{ id: "mine", label: "مشاريعي", count: mine.length }] : []),
              { id: "risk", label: "تحتاج معالجة", count: atRisk.length },
              { id: "delayed", label: "بها معالم متأخرة", count: delayed.length },
            ]}
          />
        </div>

        {list.length ? (
          <TableWrap>
            <thead>
              <tr>
                <Th>المشروع</Th>
                <Th width={110}>المبادرة</Th>
                <Th width={140}>المالك</Th>
                <Th width={200}>الإنجاز الفعلي / المخطط</Th>
                <Th width={90}>الانحراف</Th>
                <Th width={110}>المعالم</Th>
                <Th width={100}>الحالة</Th>
                <Th width={90}>الأولوية</Th>
                <Th width={90}>التقييم</Th>
                <Th width={120}>آخر تحديث</Th>
                <Th width={110}>الإجراء</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const init = data.initiatives.find((i) => i.id === p.initiativeId);
                const pillar = data.pillars.find((x) => x.id === init?.pillarId);
                const v = projectVariance(p, now);
                const rag = projectRag(p, now);
                const done = p.milestones.filter((m) => m.status === "completed").length;
                const late = p.milestones.filter((m) => m.status === "delayed").length;
                const canEdit = canUpdateProject(user, p.id, data);

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
                    <Td>
                      <Chip color={pillar?.color}>{init?.code}</Chip>
                    </Td>
                    <Td className="text-[12.5px]">{data.users.find((u) => u.id === p.ownerId)?.name}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <ProgressBar
                          value={p.actualProgress}
                          planned={plannedProgress(p, now)}
                          color={rag === "red" ? "#c40000" : rag === "amber" ? "#ffa300" : pillar?.color ?? "#2a206a"}
                        />
                        <span className="text-[12px] font-bold tnum w-16 shrink-0 text-n700">
                          <span className="text-ink">{Math.round(p.actualProgress)}%</span>
                          <span className="text-n500"> / {Math.round(plannedProgress(p, now))}%</span>
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <span className={`text-[12.5px] font-bold tnum ${v < 0 ? "text-dga-red" : "text-dga-green-400"}`}>
                        {v > 0 ? "+" : ""}
                        {v.toFixed(1)}
                      </span>
                    </Td>
                    <Td className="text-[12px] tnum">
                      {done}/{p.milestones.length}
                      {late ? <span className="text-dga-red font-bold"> · {late}</span> : null}
                    </Td>
                    <Td>
                      <StatusBadge status={p.status} />
                    </Td>
                    <Td>
                      <PriorityBadge priority={p.priority} />
                    </Td>
                    <Td>
                      <RagBadge rag={rag} />
                    </Td>
                    <Td className="text-[11.5px] text-n500">{timeAgo(p.lastUpdatedAt)}</Td>
                    <Td>
                      {canEdit ? (
                        <Button size="sm" onClick={() => setEditing(p.id)}>
                          <SlidersHorizontal size={14} />
                          تحديث
                        </Button>
                      ) : (
                        <span className="text-[11.5px] text-n500">اطلاع فقط</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        ) : (
          <EmptyState
            title="لا توجد مشاريع في هذا التبويب"
            body={
              tab === "mine"
                ? "لم تُسند إليك مشاريع بعد. تواصل مع مكتب إدارة المشاريع لإسناد مشاريعك."
                : "جرّب تعديل الفلاتر أو التبويب."
            }
            icon={<ListChecks size={34} />}
          />
        )}
      </Card>

      {editingProject ? (
        <ProgressUpdateModal project={editingProject} onClose={() => setEditing(null)} />
      ) : null}
    </>
  );
}
