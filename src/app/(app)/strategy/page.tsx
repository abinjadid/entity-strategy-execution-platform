"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  FileSpreadsheet,
  ListChecks,
  Network,
  Plus,
  Printer,
  Target,
} from "lucide-react";
import clsx from "clsx";

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
  ProgressBar,
  RagBadge,
  Select,
  StatusBadge,
  Textarea,
  Toast,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { can } from "@/lib/rbac";
import {
  filterInitiatives,
  initiativeProgress,
  initiativeRag,
  kpiRag,
  latestReading,
  pillarProgress,
} from "@/lib/calc";
import { kpiValue, money, num, pct } from "@/lib/format";
import { exportFullXlsx } from "@/lib/excel";

export default function StrategyPage() {
  const data = useStore((s) => s.data);
  const filters = useStore((s) => s.filters);
  const currentUserId = useStore((s) => s.currentUserId);
  const upsertPillar = useStore((s) => s.upsertPillar);
  const upsertObjective = useStore((s) => s.upsertObjective);

  const user = data.users.find((u) => u.id === currentUserId) ?? null;
  const editable = can(user?.role, "structure.manage");

  const [open, setOpen] = useState<Record<string, boolean>>({ p1: true });
  const [modal, setModal] = useState<null | "pillar" | "objective">(null);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});

  const initiatives = useMemo(() => filterInitiatives(data, filters), [data, filters]);
  const visiblePillars = useMemo(() => {
    const ids = new Set(initiatives.map((i) => i.pillarId));
    return data.pillars.filter((p) => !filters.pillarId || p.id === filters.pillarId).filter(
      (p) => ids.has(p.id) || !initiatives.length,
    );
  }, [data.pillars, initiatives, filters.pillarId]);

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const submit = () => {
    if (modal === "pillar") {
      upsertPillar({
        code: form.code || undefined,
        name: form.name,
        description: form.description,
        weight: Number(form.weight) || 20,
        color: form.color || "#2a206a",
      });
      setToast("تمت إضافة الركيزة إلى الهيكل الاستراتيجي");
    } else if (modal === "objective") {
      upsertObjective({
        code: form.code || undefined,
        name: form.name,
        pillarId: form.pillarId || data.pillars[0]?.id,
        description: form.description,
        weight: Number(form.weight) || 25,
        targetYear: Number(form.targetYear) || data.settings.strategyEndYear,
      });
      setToast("تمت إضافة الهدف الاستراتيجي");
    }
    setModal(null);
    setForm({});
  };

  return (
    <>
      <PageTitle
        title="الهيكل الاستراتيجي"
        subtitle="ركائز · أهداف · مؤشرات أداء · مبادرات · مشاريع — هيكل مرن يمكن توسيعه في أي مستوى"
        actions={
          <>
            {editable ? (
              <>
                <Button onClick={() => { setModal("pillar"); setForm({ weight: "20", color: "#2a206a" }); }}>
                  <Plus size={16} />
                  ركيزة
                </Button>
                <Button onClick={() => { setModal("objective"); setForm({ weight: "25", targetYear: String(data.settings.strategyEndYear) }); }}>
                  <Plus size={16} />
                  هدف
                </Button>
              </>
            ) : null}
            <Button onClick={() => exportFullXlsx(data)}>
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

      <FilterBar keys={["pillarId", "objectiveId", "initiativeId", "ownerId", "status", "priority"]} className="mb-5" compact />

      {/* -------------------------------------------------------- الإحصاءات */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-5">
        {[
          { label: "الركائز", value: data.pillars.length, icon: Network, color: "#2a206a" },
          { label: "الأهداف", value: data.objectives.length, icon: Target, color: "#852cd0" },
          { label: "المبادرات", value: data.initiatives.length, icon: Target, color: "#1d9af2" },
          { label: "المشاريع", value: data.projects.length, icon: ListChecks, color: "#00abaf" },
          { label: "مؤشرات الأداء", value: data.kpis.length, icon: Building2, color: "#1cc182" },
        ].map((s) => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-[10px] grid place-items-center shrink-0"
              style={{ background: `${s.color}14`, color: s.color }}
            >
              <s.icon size={17} />
            </span>
            <span>
              <span className="block text-[20px] font-bold text-ink leading-none tnum">{num(s.value)}</span>
              <span className="block text-[11.5px] text-n500 mt-1">{s.label}</span>
            </span>
          </Card>
        ))}
      </div>

      {/* ------------------------------------------------------------ الشجرة */}
      <div className="space-y-4">
        {visiblePillars.map((p) => {
          const objectives = data.objectives.filter((o) => o.pillarId === p.id);
          const inits = initiatives.filter((i) => i.pillarId === p.id);
          const progress = pillarProgress(p, data.initiatives, data.projects);
          const isOpen = open[p.id] ?? false;
          const budget = inits.reduce((s, i) => s + i.budgetPlanned, 0);

          return (
            <Card key={p.id}>
              <button
                onClick={() => toggle(p.id)}
                className="w-full flex items-start gap-4 p-5 text-start hover:bg-n50 transition-colors rounded-t-[16px]"
              >
                <span
                  className="shrink-0 mt-0.5 w-11 h-11 rounded-[12px] grid place-items-center text-white font-bold text-[13px]"
                  style={{ background: p.color }}
                >
                  {p.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[16px] font-bold text-ink">{p.name}</span>
                    <Chip>الوزن {p.weight}%</Chip>
                    <Chip>{objectives.length} هدف</Chip>
                    <Chip>{inits.length} مبادرة</Chip>
                    <Chip>{money(budget, true)}</Chip>
                  </span>
                  <span className="block text-[12.5px] text-n500 mt-1.5 leading-relaxed">{p.description}</span>
                  <span className="flex items-center gap-3 mt-3 max-w-lg">
                    <ProgressBar value={progress} color={p.color} showPlanned={false} />
                    <span className="text-[13px] font-bold text-ink tnum shrink-0">{pct(progress, 1)}</span>
                  </span>
                </span>
                <ChevronDown
                  size={18}
                  className={clsx("shrink-0 mt-2 text-n500 transition-transform", isOpen && "rotate-180")}
                />
              </button>

              {isOpen ? (
                <div className="border-t border-n100 divide-y divide-n100">
                  {objectives.map((o) => {
                    const objKpis = data.kpis.filter((k) => k.objectiveId === o.id);
                    const objInits = inits.filter((i) => i.objectiveIds.includes(o.id));
                    return (
                      <div key={o.id} className="p-5 bg-n50/50">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[14px] font-bold text-ink">
                              <span className="text-n500 tnum me-2">{o.code}</span>
                              {o.name}
                            </p>
                            <p className="text-[12.5px] text-n500 mt-1 leading-relaxed">{o.description}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Chip>الوزن {o.weight}%</Chip>
                            <Chip>الاستهداف {o.targetYear}</Chip>
                          </div>
                        </div>

                        {/* المؤشرات المرتبطة */}
                        {objKpis.length ? (
                          <div className="mt-4">
                            <p className="text-[11.5px] font-bold text-n500 mb-2">
                              مؤشرات الأداء المرتبطة
                            </p>
                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                              {objKpis.map((k) => {
                                const { rag } = kpiRag(k, undefined, data.settings.ragGreen, data.settings.ragAmber);
                                const r = latestReading(k);
                                return (
                                  <Link
                                    key={k.id}
                                    href={`/kpis/${k.id}`}
                                    className="flex items-start gap-2.5 rounded-[10px] border border-n200 bg-white p-3 hover:border-dga-navy transition-colors"
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-[12.5px] font-bold text-ink truncate">{k.name}</span>
                                      <span className="block text-[11.5px] text-n500 mt-1 tnum">
                                        {k.code} · الفعلي {kpiValue(k, r?.actual ?? null)} / المستهدف{" "}
                                        {kpiValue(k, r?.target ?? k.target)}
                                      </span>
                                    </span>
                                    <RagBadge rag={rag} label={rag === "gray" ? "بانتظار" : undefined} />
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        {/* المبادرات المرتبطة */}
                        {objInits.length ? (
                          <div className="mt-4">
                            <p className="text-[11.5px] font-bold text-n500 mb-2">المبادرات المرتبطة</p>
                            <div className="space-y-2">
                              {objInits.map((i) => {
                                const prog = initiativeProgress(i, data.projects);
                                const rag = initiativeRag(i, data.projects);
                                const projCount = data.projects.filter((x) => x.initiativeId === i.id).length;
                                return (
                                  <Link
                                    key={i.id}
                                    href={`/initiatives/${i.id}`}
                                    className="flex flex-wrap items-center gap-3 rounded-[10px] border border-n200 bg-white p-3 hover:border-dga-navy transition-colors"
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-[13px] font-bold text-ink">
                                        <span className="text-n500 tnum me-2">{i.code}</span>
                                        {i.name}
                                      </span>
                                      <span className="block text-[11.5px] text-n500 mt-1">
                                        {projCount} مشروع · {money(i.budgetPlanned, true)} ·{" "}
                                        {data.users.find((u) => u.id === i.ownerId)?.name}
                                      </span>
                                    </span>
                                    <span className="flex items-center gap-2.5 w-44 shrink-0">
                                      <ProgressBar value={prog} showPlanned={false} color={p.color} />
                                      <span className="text-[12px] font-bold tnum w-9">{Math.round(prog)}%</span>
                                    </span>
                                    <StatusBadge status={i.status} />
                                    <RagBadge rag={rag} />
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {!objectives.length ? (
                    <EmptyState
                      title="لا توجد أهداف تحت هذه الركيزة"
                      body="أضف هدفاً استراتيجياً لربط المؤشرات والمبادرات به."
                    />
                  ) : null}
                </div>
              ) : null}
            </Card>
          );
        })}
        {!visiblePillars.length ? (
          <Card>
            <EmptyState
              title="الهيكل الاستراتيجي فارغ"
              body="ابدأ بإضافة ركيزة استراتيجية، أو استورد الهيكل كاملاً من ملف Excel عبر شاشة إدارة المنصة."
              icon={<Network size={34} />}
            />
          </Card>
        ) : null}
      </div>

      {/* ------------------------------------------------------------ النماذج */}
      <Modal
        open={modal === "pillar"}
        onClose={() => setModal(null)}
        title="إضافة ركيزة استراتيجية"
        subtitle="الركيزة هي المستوى الأعلى في الهيكل، وتتفرع منها الأهداف ثم المبادرات."
        footer={
          <>
            <Button variant="primary" onClick={submit} disabled={!form.name}>
              حفظ الركيزة
            </Button>
            <Button variant="ghost" onClick={() => setModal(null)}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم الركيزة" required className="sm:col-span-2">
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="الرمز" hint="يُولَّد تلقائياً إن تُرك فارغاً">
            <Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="R6" />
          </Field>
          <Field label="الوزن النسبي %">
            <Input
              type="number"
              value={form.weight ?? ""}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
          </Field>
          <Field label="اللون" className="sm:col-span-2">
            <div className="flex gap-2">
              {["#2a206a", "#1d9af2", "#1cc182", "#852cd0", "#00abaf", "#ffa300"].map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={clsx(
                    "w-9 h-9 rounded-[9px] border-2 transition-transform",
                    form.color === c ? "border-ink scale-105" : "border-transparent",
                  )}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </Field>
          <Field label="الوصف" className="sm:col-span-2">
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={modal === "objective"}
        onClose={() => setModal(null)}
        title="إضافة هدف استراتيجي"
        subtitle="يُربط الهدف بركيزة، وتُربط به مؤشرات الأداء والمبادرات."
        footer={
          <>
            <Button variant="primary" onClick={submit} disabled={!form.name}>
              حفظ الهدف
            </Button>
            <Button variant="ghost" onClick={() => setModal(null)}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم الهدف" required className="sm:col-span-2">
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="الركيزة" required>
            <Select
              value={form.pillarId ?? ""}
              onChange={(v) => setForm({ ...form, pillarId: v })}
              options={data.pillars.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
              placeholder="اختر الركيزة"
            />
          </Field>
          <Field label="الرمز">
            <Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="H1.4" />
          </Field>
          <Field label="الوزن ضمن الركيزة %">
            <Input type="number" value={form.weight ?? ""} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          </Field>
          <Field label="سنة الاستهداف">
            <Input type="number" value={form.targetYear ?? ""} onChange={(e) => setForm({ ...form, targetYear: e.target.value })} />
          </Field>
          <Field label="الوصف" className="sm:col-span-2">
            <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
      </Modal>

      {toast ? <Toast message={toast} onDone={() => setToast("")} /> : null}
    </>
  );
}
