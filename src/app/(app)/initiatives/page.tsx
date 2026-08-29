"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileSpreadsheet, LayoutGrid, Plus, Printer, Rows3, Target } from "lucide-react";

import { FilterBar } from "@/components/FilterBar";
import {
  Button,
  Card,
  CardHead,
  Chip,
  EmptyState,
  Field,
  Input,
  Modal,
  PageTitle,
  PriorityBadge,
  ProgressBar,
  RagBadge,
  Select,
  StatusBadge,
  TableWrap,
  Td,
  Textarea,
  Th,
  Toast,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { can } from "@/lib/rbac";
import {
  filterInitiatives,
  initiativePlanned,
  initiativeProgress,
  initiativeRag,
} from "@/lib/calc";
import { dateShort, money, num, pct } from "@/lib/format";
import { exportInitiativesXlsx } from "@/lib/excel";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/types";
import type { Priority, Status } from "@/lib/types";

export default function InitiativesPage() {
  const data = useStore((s) => s.data);
  const filters = useStore((s) => s.filters);
  const currentUserId = useStore((s) => s.currentUserId);
  const upsertInitiative = useStore((s) => s.upsertInitiative);

  const user = data.users.find((u) => u.id === currentUserId) ?? null;
  const editable = can(user?.role, "structure.manage");

  const [view, setView] = useState<"cards" | "table">("cards");
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});

  const list = useMemo(() => filterInitiatives(data, filters), [data, filters]);
  const now = new Date();

  const totals = useMemo(() => {
    const planned = list.reduce((s, i) => s + i.budgetPlanned, 0);
    const spent = list.reduce((s, i) => s + i.budgetSpent, 0);
    const w = list.reduce((s, i) => s + (i.budgetPlanned || 1), 0) || 1;
    const prog = list.reduce((s, i) => s + initiativeProgress(i, data.projects) * (i.budgetPlanned || 1), 0) / w;
    return { planned, spent, prog };
  }, [list, data.projects]);

  const save = () => {
    upsertInitiative({
      code: form.code || undefined,
      name: form.name,
      description: form.description,
      expectedImpact: form.expectedImpact,
      pillarId: form.pillarId || data.pillars[0]?.id,
      objectiveIds: form.objectiveId ? [form.objectiveId] : [],
      ownerId: form.ownerId || currentUserId || "u1",
      department: form.department,
      status: (form.status || "not_started") as Status,
      priority: (form.priority || "medium") as Priority,
      startDate: form.startDate || `${data.settings.currentYear}-01-01`,
      endDate: form.endDate || `${data.settings.strategyEndYear}-12-31`,
      budgetPlanned: Number(form.budgetPlanned) || 0,
      budgetSpent: Number(form.budgetSpent) || 0,
    });
    setModal(false);
    setForm({});
    setToast("تمت إضافة المبادرة");
  };

  return (
    <>
      <PageTitle
        title="المبادرات"
        subtitle={`${num(list.length)} مبادرة ضمن الفلاتر الحالية · إجمالي ميزانية ${money(totals.planned, true)} · متوسط إنجاز ${pct(totals.prog, 1)}`}
        actions={
          <>
            <div className="flex rounded-[10px] border border-n300 overflow-hidden">
              <button
                onClick={() => setView("cards")}
                className={`px-3 h-10 text-[12.5px] font-semibold flex items-center gap-1.5 ${view === "cards" ? "bg-brand-solid text-white" : "bg-surface text-n700 hover:bg-n50"}`}
              >
                <LayoutGrid size={15} />
                بطاقات
              </button>
              <button
                onClick={() => setView("table")}
                className={`px-3 h-10 text-[12.5px] font-semibold flex items-center gap-1.5 border-s border-n300 ${view === "table" ? "bg-brand-solid text-white" : "bg-surface text-n700 hover:bg-n50"}`}
              >
                <Rows3 size={15} />
                جدول
              </button>
            </div>
            {editable ? (
              <Button onClick={() => { setModal(true); setForm({ status: "not_started", priority: "medium" }); }}>
                <Plus size={16} />
                مبادرة جديدة
              </Button>
            ) : null}
            <Button onClick={() => exportInitiativesXlsx(data, filters)}>
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

      {!list.length ? (
        <Card>
          <EmptyState
            title="لا توجد مبادرات مطابقة"
            body="جرّب تعديل الفلاتر، أو أضف مبادرة جديدة إلى الهيكل الاستراتيجي."
            icon={<Target size={34} />}
          />
        </Card>
      ) : view === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => {
            const pillar = data.pillars.find((p) => p.id === i.pillarId);
            const prog = initiativeProgress(i, data.projects);
            const plan = initiativePlanned(i, data.projects, now);
            const rag = initiativeRag(i, data.projects, now);
            const projects = data.projects.filter((p) => p.initiativeId === i.id);
            const owner = data.users.find((u) => u.id === i.ownerId);
            const util = i.budgetPlanned ? (i.budgetSpent / i.budgetPlanned) * 100 : 0;

            return (
              <Card key={i.id} className="flex flex-col hover:shadow-raise transition-shadow">
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Chip color={pillar?.color}>{pillar?.code}</Chip>
                    <div className="flex items-center gap-1.5">
                      <PriorityBadge priority={i.priority} />
                      <RagBadge rag={rag} />
                    </div>
                  </div>
                  <Link href={`/initiatives/${i.id}`} className="group block">
                    <p className="text-[11.5px] text-n500 tnum">{i.code}</p>
                    <h3 className="text-[15px] font-bold text-ink mt-1 leading-snug group-hover:text-brand-text transition-colors">
                      {i.name}
                    </h3>
                  </Link>
                  <p className="text-[12.5px] text-n500 mt-2 leading-relaxed line-clamp-3">{i.description}</p>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[12px] mb-1.5">
                      <span className="text-n500">
                        الإنجاز · المخطط <span className="tnum font-semibold">{Math.round(plan)}%</span>
                      </span>
                      <span className="font-bold text-ink tnum">{Math.round(prog)}%</span>
                    </div>
                    <ProgressBar value={prog} planned={plan} color={pillar?.color ?? "#2a206a"} />
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-4 text-[12px]">
                    <div>
                      <dt className="text-n500">المالك</dt>
                      <dd className="font-semibold text-ink truncate mt-0.5">{owner?.name}</dd>
                    </div>
                    <div>
                      <dt className="text-n500">المشاريع</dt>
                      <dd className="font-semibold text-ink mt-0.5 tnum">{projects.length}</dd>
                    </div>
                    <div>
                      <dt className="text-n500">الميزانية</dt>
                      <dd className="font-semibold text-ink mt-0.5">{money(i.budgetPlanned, true)}</dd>
                    </div>
                    <div>
                      <dt className="text-n500">نسبة الصرف</dt>
                      <dd className="font-semibold text-ink mt-0.5 tnum">{pct(util)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-n100 bg-n50 rounded-b-[16px]">
                  <StatusBadge status={i.status} />
                  <span className="text-[11.5px] text-n500 tnum">
                    {dateShort(i.startDate)} — {dateShort(i.endDate)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHead title="جدول المبادرات" subtitle="اضغط على اسم المبادرة لعرض تفاصيلها ومشاريعها" />
          <TableWrap>
            <thead>
              <tr>
                <Th>المبادرة</Th>
                <Th width={110}>الركيزة</Th>
                <Th width={140}>المالك</Th>
                <Th width={180}>الإنجاز</Th>
                <Th width={110}>الميزانية</Th>
                <Th width={90}>الصرف</Th>
                <Th width={100}>الحالة</Th>
                <Th width={90}>الأولوية</Th>
                <Th width={90}>التقييم</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => {
                const pillar = data.pillars.find((p) => p.id === i.pillarId);
                const prog = initiativeProgress(i, data.projects);
                const plan = initiativePlanned(i, data.projects, now);
                return (
                  <tr key={i.id} className="hover:bg-n50 transition-colors">
                    <Td>
                      <Link href={`/initiatives/${i.id}`} className="group">
                        <span className="block text-[13px] font-bold text-ink group-hover:text-brand-text transition-colors">
                          {i.name}
                        </span>
                        <span className="block text-[11.5px] text-n500 mt-0.5 tnum">{i.code}</span>
                      </Link>
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
                    <Td className="text-[12px] tnum">{money(i.budgetPlanned, true)}</Td>
                    <Td className="text-[12px] tnum">
                      {pct(i.budgetPlanned ? (i.budgetSpent / i.budgetPlanned) * 100 : 0)}
                    </Td>
                    <Td>
                      <StatusBadge status={i.status} />
                    </Td>
                    <Td>
                      <PriorityBadge priority={i.priority} />
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
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="مبادرة جديدة"
        subtitle="تُربط المبادرة بركيزة وهدف، وتنبثق منها المشاريع والمعالم."
        footer={
          <>
            <Button variant="primary" onClick={save} disabled={!form.name || !form.pillarId}>
              حفظ المبادرة
            </Button>
            <Button variant="ghost" onClick={() => setModal(false)}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم المبادرة" required className="sm:col-span-2">
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="الركيزة" required>
            <Select
              value={form.pillarId ?? ""}
              onChange={(v) => setForm({ ...form, pillarId: v, objectiveId: "" })}
              options={data.pillars.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
              placeholder="اختر الركيزة"
            />
          </Field>
          <Field label="الهدف المرتبط">
            <Select
              value={form.objectiveId ?? ""}
              onChange={(v) => setForm({ ...form, objectiveId: v })}
              options={data.objectives
                .filter((o) => !form.pillarId || o.pillarId === form.pillarId)
                .map((o) => ({ value: o.id, label: `${o.code} · ${o.name}` }))}
              placeholder="اختر الهدف"
            />
          </Field>
          <Field label="المالك">
            <Select
              value={form.ownerId ?? ""}
              onChange={(v) => setForm({ ...form, ownerId: v })}
              options={data.users.filter((u) => u.role !== "viewer").map((u) => ({ value: u.id, label: u.name }))}
              placeholder="اختر المالك"
            />
          </Field>
          <Field label="الإدارة">
            <Input value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </Field>
          <Field label="الحالة">
            <Select
              value={form.status ?? "not_started"}
              onChange={(v) => setForm({ ...form, status: v })}
              options={(Object.keys(STATUS_LABELS) as Status[]).map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            />
          </Field>
          <Field label="الأولوية">
            <Select
              value={form.priority ?? "medium"}
              onChange={(v) => setForm({ ...form, priority: v })}
              options={(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
            />
          </Field>
          <Field label="تاريخ البداية">
            <Input type="date" value={form.startDate ?? ""} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="تاريخ النهاية">
            <Input type="date" value={form.endDate ?? ""} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </Field>
          <Field label="الميزانية المعتمدة (ريال)">
            <Input type="number" value={form.budgetPlanned ?? ""} onChange={(e) => setForm({ ...form, budgetPlanned: e.target.value })} />
          </Field>
          <Field label="المصروف حتى تاريخه (ريال)">
            <Input type="number" value={form.budgetSpent ?? ""} onChange={(e) => setForm({ ...form, budgetSpent: e.target.value })} />
          </Field>
          <Field label="الوصف" className="sm:col-span-2">
            <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="الأثر المتوقع" className="sm:col-span-2">
            <Textarea value={form.expectedImpact ?? ""} onChange={(e) => setForm({ ...form, expectedImpact: e.target.value })} />
          </Field>
        </div>
      </Modal>

      {toast ? <Toast message={toast} onDone={() => setToast("")} /> : null}
    </>
  );
}
