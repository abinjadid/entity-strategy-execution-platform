"use client";

// =============================================================================
// إطار قياس التحول الرقمي — إدارة الدورات السنوية
// تُعلن هيئة الحكومة الرقمية دورة قياس كل سنة بمناظيرها وأوزانها المعتمدة، لذلك
// المناظير هنا ليست ثابتة: كل دورة تملك مناظيرها الخاصة، والدورة الجارية هي
// المرجع في كل شاشات المنصة، والدورات المغلقة تبقى محفوظة بدرجاتها للمقارنة.
// =============================================================================

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Gauge,
  Info,
  Layers,
  Plus,
  Printer,
  Save,
  Trash2,
} from "lucide-react";

import { HorizontalBars } from "@/components/charts";
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
  StatCard,
  TableWrap,
  Td,
  Textarea,
  Th,
  Toast,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { can } from "@/lib/rbac";
import {
  activeCycle,
  cycleScore,
  cycleWeightTotal,
  kpiIndex,
  kpiRag,
  orphanKpis,
  previousCycle,
} from "@/lib/calc";
import { dateShort, num, pct } from "@/lib/format";
import { CYCLE_STATUS_LABELS } from "@/lib/types";
import type { QiyasCycleStatus } from "@/lib/types";

const STATUS_TONE: Record<QiyasCycleStatus, string> = {
  active: "bg-dga-green/12 text-dga-green-400 border-dga-green/30",
  draft: "bg-dga-orange/12 text-warn-text border-dga-orange/30",
  closed: "bg-n100 text-n500 border-n200",
};

export default function QiyasPage() {
  const data = useStore((s) => s.data);
  const currentUserId = useStore((s) => s.currentUserId);
  const updatePerspective = useStore((s) => s.updatePerspective);
  const createCycle = useStore((s) => s.createCycle);
  const updateCycle = useStore((s) => s.updateCycle);
  const activateCycle = useStore((s) => s.activateCycle);
  const removeCycle = useStore((s) => s.removeCycle);
  const addPerspective = useStore((s) => s.addPerspective);
  const removePerspective = useStore((s) => s.removePerspective);
  const relinkKpiPerspective = useStore((s) => s.relinkKpiPerspective);

  const user = data.users.find((u) => u.id === currentUserId) ?? null;
  const editable = can(user?.role, "structure.manage");
  const { ragGreen, ragAmber } = data.settings;

  const cycles = useMemo(
    () => data.qiyasCycles.slice().sort((a, b) => b.year - a.year),
    [data.qiyasCycles],
  );
  const current = activeCycle(data);

  // الدورة المعروضة — الجارية افتراضياً، ويمكن تصفح الدورات السابقة والمسودات
  const [viewId, setViewId] = useState<string>(current?.id ?? "");
  useEffect(() => {
    if (!data.qiyasCycles.some((c) => c.id === viewId)) setViewId(current?.id ?? "");
  }, [data.qiyasCycles, viewId, current]);

  const cycle = data.qiyasCycles.find((c) => c.id === viewId) ?? current;
  const isActiveCycle = !!cycle && cycle.id === current?.id;
  const prev = previousCycle(data, cycle);

  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "", score: "", targetScore: "", weight: "" });
  const [newCycle, setNewCycle] = useState(false);
  const [cycleForm, setCycleForm] = useState({
    year: String((cycles[0]?.year ?? new Date().getFullYear()) + 1),
    name: "",
    announcedOn: "",
    reference: "",
    changeNote: "",
    copyFromId: cycles[0]?.id ?? "",
  });
  const [editCycle, setEditCycle] = useState(false);
  const [relink, setRelink] = useState(false);
  const [toast, setToast] = useState("");

  const rows = useMemo(() => {
    if (!cycle) return [];
    return cycle.perspectives.map((p) => {
      const kpis = isActiveCycle ? data.kpis.filter((k) => k.perspectiveId === p.id) : [];
      const idx = kpiIndex(kpis, ragGreen, ragAmber);
      const red = kpis.filter((k) => kpiRag(k, undefined, ragGreen, ragAmber).rag === "red").length;
      const before = p.carriedFromId
        ? (prev?.perspectives.find((x) => x.id === p.carriedFromId) ?? null)
        : null;
      return { p, kpis, idx, red, before };
    });
  }, [cycle, prev, isActiveCycle, data.kpis, ragGreen, ragAmber]);

  const orphans = useMemo(() => orphanKpis(data), [data]);
  const weightTotal = cycleWeightTotal(cycle);
  const weightOk = Math.round(weightTotal) === 100;

  const overall = cycleScore(cycle);
  const overallPrev = cycleScore(cycle, "previousScore");
  const overallTarget = cycleScore(cycle, "targetScore");
  const uncovered = isActiveCycle ? rows.filter((r) => !r.kpis.length).length : 0;

  const openPerspective = (id: string) => {
    const p = cycle?.perspectives.find((x) => x.id === id);
    if (!p) return;
    setEditing(id);
    setForm({
      code: p.code,
      name: p.name,
      description: p.description,
      score: String(p.score),
      targetScore: String(p.targetScore),
      weight: String(p.weight),
    });
  };

  const savePerspective = () => {
    if (!editing || !cycle) return;
    updatePerspective(
      editing,
      {
        code: form.code.trim() || "—",
        name: form.name.trim() || "منظور بلا مسمى",
        description: form.description.trim(),
        score: Math.max(0, Math.min(100, Number(form.score) || 0)),
        targetScore: Math.max(0, Math.min(100, Number(form.targetScore) || 0)),
        weight: Math.max(0, Number(form.weight) || 0),
      },
      cycle.id,
    );
    setEditing(null);
    setToast("تم تحديث المنظور");
  };

  const saveNewCycle = () => {
    const year = Number(cycleForm.year);
    if (!year || year < 2000 || year > 2100) {
      setToast("أدخل سنة صحيحة للدورة");
      return;
    }
    if (data.qiyasCycles.some((c) => c.year === year)) {
      setToast(`توجد دورة مسجّلة لسنة ${year} بالفعل`);
      return;
    }
    const id = createCycle({
      year,
      name: cycleForm.name,
      announcedOn: cycleForm.announcedOn,
      reference: cycleForm.reference,
      changeNote: cycleForm.changeNote,
      copyFromId: cycleForm.copyFromId || null,
    });
    setNewCycle(false);
    setViewId(id);
    setToast("أُنشئت الدورة كمسودة — راجع المناظير وأوزانها ثم اعتمدها");
  };

  const approve = () => {
    if (!cycle) return;
    if (!weightOk) {
      setToast(`مجموع الأوزان ${Math.round(weightTotal)}% — يجب أن يساوي 100% قبل الاعتماد`);
      return;
    }
    activateCycle(cycle.id);
    setToast(`اعتُمدت ${cycle.name} — كل الشاشات تستخدم مناظيرها الآن`);
  };

  if (!cycle) {
    return (
      <Card>
        <EmptyState
          title="لا توجد دورة قياس مسجّلة"
          body="أنشئ دورة قياس بسنتها ومناظيرها المعتمدة لبدء متابعة إطار القياس."
          action={
            editable ? (
              <Button variant="primary" onClick={() => setNewCycle(true)}>
                <Plus size={16} />
                دورة قياس جديدة
              </Button>
            ) : undefined
          }
        />
      </Card>
    );
  }

  return (
    <>
      <PageTitle
        title="إطار قياس التحول الرقمي"
        subtitle="مناظير القياس تُحدَّث سنوياً وفق دورة قياس التحول الرقمي المعلنة — كل دورة محفوظة بمناظيرها ودرجاتها"
        actions={
          <>
            {editable ? (
              <Button variant="primary" onClick={() => setNewCycle(true)}>
                <Plus size={16} />
                دورة قياس جديدة
              </Button>
            ) : null}
            <Button onClick={() => window.print()}>
              <Printer size={16} />
              تصدير PDF
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------- شريط اختيار الدورة */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <CalendarClock size={18} className="text-brand-text shrink-0" />
          <div className="min-w-[220px]">
            <Select
              value={viewId}
              onChange={(v) => setViewId(v)}
              options={cycles.map((c) => ({
                value: c.id,
                label: `${c.name} — ${CYCLE_STATUS_LABELS[c.status]}`,
              }))}
            />
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${STATUS_TONE[cycle.status]}`}
          >
            {CYCLE_STATUS_LABELS[cycle.status]}
          </span>
          <Chip>{num(cycle.perspectives.length)} منظوراً</Chip>
          <Chip
            className={weightOk ? "" : "border-dga-red/40 text-dga-red"}
          >
            مجموع الأوزان {Math.round(weightTotal)}%
          </Chip>
          {cycle.announcedOn ? <Chip>أُعلنت في {dateShort(cycle.announcedOn)}</Chip> : null}
          {cycle.reference ? <Chip>{cycle.reference}</Chip> : null}
          <div className="flex-1" />
          {editable ? (
            <div className="flex flex-wrap items-center gap-2 no-print">
              <Button size="sm" onClick={() => setEditCycle(true)}>
                تعديل بيانات الدورة
              </Button>
              <Button size="sm" onClick={() => addPerspective(cycle.id)}>
                <Plus size={14} />
                إضافة منظور
              </Button>
              {!isActiveCycle ? (
                <Button size="sm" variant="primary" onClick={approve}>
                  <CheckCircle2 size={14} />
                  اعتماد كدورة جارية
                </Button>
              ) : null}
              {!isActiveCycle && cycles.length > 1 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    removeCycle(cycle.id);
                    setViewId(current?.id ?? "");
                    setToast("حُذفت الدورة");
                  }}
                >
                  <Trash2 size={14} />
                  حذف
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {cycle.changeNote ? (
          <div className="border-t border-n100 px-4 py-3">
            <p className="text-[12.5px] text-n700 leading-[1.85]">
              <span className="font-bold text-ink">أبرز تغيّرات هذه الدورة: </span>
              {cycle.changeNote}
            </p>
          </div>
        ) : null}
      </Card>

      {/* ------------------------------------------------------------ تنبيهات */}
      {!isActiveCycle ? (
        <div className="flex gap-3 rounded-[12px] border border-dga-orange/30 bg-dga-orange/8 p-4 mb-5 no-print">
          <Info size={17} className="shrink-0 mt-0.5 text-warn-text" />
          <p className="text-[12.5px] text-n700 leading-[1.85]">
            أنت تستعرض دورة غير جارية، لذلك لا تظهر ارتباطات مؤشرات الأداء هنا. المؤشرات ترتبط
            دائماً بمناظير الدورة الجارية ({current?.name ?? "—"}). اعتمد هذه الدورة لتصبح هي المرجع
            في كل الشاشات.
          </p>
        </div>
      ) : null}

      {isActiveCycle && orphans.length ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-dga-red/30 bg-dga-red/8 p-4 mb-5 no-print">
          <AlertTriangle size={17} className="shrink-0 text-dga-red" />
          <p className="flex-1 text-[12.5px] text-n700 leading-[1.85]">
            <span className="font-bold text-ink">{num(orphans.length)} مؤشراً</span> مرتبط بمنظور لم
            يعد موجوداً في دورة القياس الجارية — أعد ربطها بالمناظير المعتمدة حتى تُحتسب ضمن القياس.
          </p>
          {editable ? (
            <Button size="sm" variant="primary" onClick={() => setRelink(true)}>
              إعادة ربط المؤشرات
            </Button>
          ) : null}
        </div>
      ) : null}

      {!weightOk ? (
        <div className="flex gap-3 rounded-[12px] border border-dga-red/30 bg-dga-red/8 p-4 mb-5 no-print">
          <AlertTriangle size={17} className="shrink-0 mt-0.5 text-dga-red" />
          <p className="text-[12.5px] text-n700 leading-[1.85]">
            مجموع أوزان المناظير في هذه الدورة {Math.round(weightTotal)}% ولا يساوي 100%. عدّل
            الأوزان لتطابق ما أعلنته الهيئة في دليل الدورة.
          </p>
        </div>
      ) : null}

      {/* ------------------------------------------------------ بطاقات القياس */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard
          label={`الدرجة الإجمالية — ${cycle.year}`}
          value={pct(overall, 1)}
          icon={<Gauge size={16} />}
          accent="#2a206a"
          sub={`المستهدف ${pct(overallTarget, 1)}`}
          trend={{ value: overall - overallPrev, label: "نقطة عن الدورة السابقة" }}
        />
        <StatCard
          label="نتيجة الدورة السابقة"
          value={pct(overallPrev, 1)}
          accent="#767286"
          sub={prev ? prev.name : "لا توجد دورة سابقة مسجّلة"}
        />
        <StatCard
          label="مؤشرات مربوطة بمناظير"
          value={num(isActiveCycle ? data.kpis.filter((k) => k.perspectiveId && !orphans.includes(k)).length : 0)}
          accent="#1cc182"
          sub={`من ${num(data.kpis.length)} مؤشراً`}
        />
        <StatCard
          label="مناظير بلا مؤشرات"
          value={num(uncovered)}
          accent={uncovered ? "#c40000" : "#1cc182"}
          sub={uncovered ? "تحتاج ربط مؤشرات لتغطية القياس" : "كل المناظير مغطاة بمؤشرات"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3 mb-5">
        <Card className="xl:col-span-2">
          <CardHead
            title={`درجات مناظير ${cycle.year}`}
            subtitle="الدرجة الحالية لكل منظور وفق مناظير هذه الدورة وأوزانها"
          />
          <div className="p-4">
            <HorizontalBars
              height={Math.max(280, cycle.perspectives.length * 38)}
              data={cycle.perspectives.map((p) => ({
                name: p.code,
                value: p.score,
                color: p.score >= 85 ? "#1cc182" : p.score >= 70 ? "#1d9af2" : p.score >= 55 ? "#ffa300" : "#c40000",
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardHead
            title={isActiveCycle ? "توزيع المؤشرات على المناظير" : "مناظير الدورة"}
            subtitle={
              isActiveCycle
                ? "عدد مؤشرات الأداء المرتبطة بكل منظور"
                : "المناظير كما اعتُمدت في هذه الدورة"
            }
          />
          <ul className="divide-y divide-n100 max-h-[430px] overflow-y-auto">
            {rows.map(({ p, kpis, idx }) => (
              <li key={p.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-[12.5px] font-bold text-ink truncate">
                    <span className="text-n500 tnum me-1.5">{p.code}</span>
                    {p.name}
                  </span>
                  <span className="text-[12px] font-bold text-ink tnum shrink-0">
                    {isActiveCycle ? kpis.length : `${p.weight}%`}
                  </span>
                </div>
                {isActiveCycle ? (
                  kpis.length ? (
                    <div className="flex items-center gap-2.5">
                      <ProgressBar value={Math.min(100, idx)} showPlanned={false} color="#2a206a" />
                      <span className="text-[11.5px] font-semibold text-n700 tnum w-10 shrink-0">
                        {Math.round(idx)}%
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11.5px] text-dga-red">لا توجد مؤشرات مرتبطة بهذا المنظور</p>
                  )
                ) : (
                  <div className="flex items-center gap-2.5">
                    <ProgressBar value={p.score} showPlanned={false} color="#767286" />
                    <span className="text-[11.5px] font-semibold text-n700 tnum w-10 shrink-0">
                      {p.score}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ------------------------------------------------------ جدول المناظير */}
      <Card>
        <CardHead
          title={`مناظير ${cycle.name}`}
          subtitle="الدرجة والوزن والمؤشرات المرتبطة — وما تغيّر عن الدورة السابقة"
          icon={<Layers size={17} />}
        />
        <TableWrap>
          <thead>
            <tr>
              <Th width={60}>الرمز</Th>
              <Th>المنظور</Th>
              <Th width={110}>الوزن</Th>
              <Th width={190}>الدرجة الحالية</Th>
              <Th width={100}>السابق</Th>
              <Th width={100}>المستهدف</Th>
              {isActiveCycle ? <Th width={110}>المؤشرات</Th> : null}
              <Th width={90}>الحالة</Th>
              {editable ? <Th width={130}>الإجراء</Th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, kpis, red, before }) => {
              const weightChanged = before && before.weight !== p.weight;
              const renamed = before && before.name !== p.name;
              return (
                <tr key={p.id} className="hover:bg-n50 transition-colors">
                  <Td>
                    <Chip>{p.code}</Chip>
                  </Td>
                  <Td>
                    <span className="block text-[13px] font-bold text-ink">
                      {p.name}
                      {p.isNew ? (
                        <span className="text-[10.5px] font-bold text-dga-green-400 me-2 ms-2">
                          جديد في هذه الدورة
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-[11.5px] text-n500 mt-0.5 leading-relaxed">
                      {p.description}
                    </span>
                    {renamed ? (
                      <span className="block text-[11px] text-warn-text mt-1">
                        كان في الدورة السابقة: {before?.name}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="text-[12.5px] font-semibold tnum">
                    {p.weight}%
                    {weightChanged ? (
                      <span className="block text-[11px] text-warn-text mt-0.5">
                        كان {before?.weight}%
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <ProgressBar
                        value={p.score}
                        planned={p.targetScore}
                        color={p.score >= 85 ? "#1cc182" : p.score >= 70 ? "#2a206a" : p.score >= 55 ? "#ffa300" : "#c40000"}
                      />
                      <span className="text-[12.5px] font-bold tnum w-9 shrink-0">{p.score}</span>
                    </div>
                  </Td>
                  <Td className="text-[12.5px] tnum">{p.previousScore}</Td>
                  <Td className="text-[12.5px] tnum">{p.targetScore}</Td>
                  {isActiveCycle ? (
                    <Td className="text-[12px] tnum">
                      {kpis.length}
                      {red ? <span className="text-dga-red font-bold"> · {red} أحمر</span> : null}
                    </Td>
                  ) : null}
                  <Td>
                    <RagBadge
                      rag={p.score >= 85 ? "green" : p.score >= 65 ? "amber" : "red"}
                      label={p.score >= 85 ? "متقدم" : p.score >= 65 ? "متوسط" : "يحتاج تحسين"}
                    />
                  </Td>
                  {editable ? (
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" onClick={() => openPerspective(p.id)}>
                          تحديث
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            removePerspective(cycle.id, p.id);
                            setToast("حُذف المنظور من هذه الدورة");
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
        {!rows.length ? <EmptyState title="لا توجد مناظير في هذه الدورة" /> : null}
      </Card>

      {/* ----------------------------------------------- المؤشرات لكل منظور */}
      {isActiveCycle ? (
        <Card className="mt-5">
          <CardHead
            title="المؤشرات المرتبطة بكل منظور"
            subtitle="أثر مؤشرات الأداء التشغيلية على درجة كل منظور في الدورة الجارية"
          />
          <div className="p-5 space-y-5">
            {rows
              .filter((r) => r.kpis.length)
              .map(({ p, kpis }) => (
                <div key={p.id} className="print-block">
                  <p className="text-[13px] font-bold text-ink mb-2.5">
                    <span className="text-n500 tnum me-2">{p.code}</span>
                    {p.name}
                  </p>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {kpis.map((k) => {
                      const { rag, pct: a } = kpiRag(k, undefined, ragGreen, ragAmber);
                      return (
                        <Link
                          key={k.id}
                          href={`/kpis/${k.id}`}
                          className="flex items-center gap-2.5 rounded-[10px] border border-n200 p-3 hover:border-brand-text transition-colors"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12.5px] font-semibold text-ink truncate">{k.name}</span>
                            <span className="block text-[11px] text-n500 tnum mt-0.5">{k.code}</span>
                          </span>
                          <RagBadge rag={rag} label={a === null ? "بانتظار" : `${Math.round(a)}%`} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </Card>
      ) : null}

      {/* -------------------------------------------------- سجل دورات القياس */}
      <Card className="mt-5">
        <CardHead
          title="سجل دورات القياس"
          subtitle="كل دورة سنوية محفوظة بمناظيرها ودرجاتها كما اعتُمدت في حينها"
        />
        <TableWrap>
          <thead>
            <tr>
              <Th width={80}>السنة</Th>
              <Th>الدورة</Th>
              <Th width={90}>المناظير</Th>
              <Th width={120}>الدرجة الإجمالية</Th>
              <Th width={120}>تاريخ الإعلان</Th>
              <Th width={120}>الحالة</Th>
              <Th width={90}>عرض</Th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((c) => (
              <tr key={c.id} className="hover:bg-n50 transition-colors">
                <Td className="text-[12.5px] font-bold tnum">{c.year}</Td>
                <Td>
                  <span className="block text-[13px] font-bold text-ink">{c.name}</span>
                  <span className="block text-[11.5px] text-n500 mt-0.5">{c.reference || "—"}</span>
                </Td>
                <Td className="text-[12.5px] tnum">{c.perspectives.length}</Td>
                <Td className="text-[12.5px] font-bold tnum">{pct(cycleScore(c), 1)}</Td>
                <Td className="text-[12px] tnum">{c.announcedOn ? dateShort(c.announcedOn) : "—"}</Td>
                <Td>
                  <span
                    className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-bold ${STATUS_TONE[c.status]}`}
                  >
                    {CYCLE_STATUS_LABELS[c.status]}
                  </span>
                </Td>
                <Td>
                  <Button size="sm" onClick={() => setViewId(c.id)}>
                    استعراض
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>

      {/* ------------------------------------------------------------ النوافذ */}
      {editing ? (
        <Modal
          open
          onClose={() => setEditing(null)}
          title="تحديث المنظور"
          subtitle={`${cycle.name} — المسمى والوزن والدرجة`}
          width="max-w-2xl"
          footer={
            <>
              <Button variant="primary" onClick={savePerspective}>
                <Save size={15} />
                حفظ
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                إلغاء
              </Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="الرمز" required>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <div className="sm:col-span-3">
              <Field label="مسمى المنظور" hint="كما ورد في دليل دورة القياس" required>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
            </div>
            <div className="sm:col-span-4">
              <Field label="الوصف">
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
            </div>
            <Field label="الدرجة الحالية" hint="من 0 إلى 100" required>
              <Input type="number" min={0} max={100} value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
            </Field>
            <Field label="المستهدف" hint="من 0 إلى 100" required>
              <Input type="number" min={0} max={100} value={form.targetScore} onChange={(e) => setForm({ ...form, targetScore: e.target.value })} />
            </Field>
            <Field label="الوزن %" hint="مجموع الأوزان = 100%" required>
              <Input type="number" min={0} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            </Field>
          </div>
        </Modal>
      ) : null}

      {newCycle ? (
        <Modal
          open
          onClose={() => setNewCycle(false)}
          title="دورة قياس جديدة"
          subtitle="سجّل دورة قياس التحول الرقمي المعلنة لهذه السنة، ثم عدّل مناظيرها وأوزانها لتطابق الدليل المعتمد"
          width="max-w-2xl"
          footer={
            <>
              <Button variant="primary" onClick={saveNewCycle}>
                <Plus size={15} />
                إنشاء الدورة
              </Button>
              <Button variant="ghost" onClick={() => setNewCycle(false)}>
                إلغاء
              </Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="سنة الدورة" required>
              <Input
                type="number"
                min={2000}
                max={2100}
                value={cycleForm.year}
                onChange={(e) => setCycleForm({ ...cycleForm, year: e.target.value })}
              />
            </Field>
            <Field label="تاريخ إعلان الدورة">
              <Input
                type="date"
                value={cycleForm.announcedOn}
                onChange={(e) => setCycleForm({ ...cycleForm, announcedOn: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="مسمى الدورة" hint="يُولَّد تلقائياً من السنة إن تُرك فارغاً">
                <Input
                  value={cycleForm.name}
                  placeholder={`دورة قياس التحول الرقمي ${cycleForm.year}`}
                  onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="مرجع الدليل" hint="مثال: دليل قياس التحول الرقمي — إصدار 2027">
                <Input
                  value={cycleForm.reference}
                  onChange={(e) => setCycleForm({ ...cycleForm, reference: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field
                label="بناء المناظير"
                hint="النسخ من دورة سابقة يحافظ على ارتباط المؤشرات ويجعل درجات تلك الدورة «القياس السابق»"
              >
                <Select
                  value={cycleForm.copyFromId}
                  onChange={(v) => setCycleForm({ ...cycleForm, copyFromId: v })}
                  options={[
                    ...cycles.map((c) => ({ value: c.id, label: `نسخ مناظير ${c.name}` })),
                    { value: "", label: "البدء بقائمة مناظير افتراضية" },
                  ]}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="أبرز التغيّرات عن الدورة السابقة">
                <Textarea
                  rows={3}
                  placeholder="مثال: أُضيف منظور جديد للذكاء الاصطناعي، ورُفع وزن الأمن السيبراني إلى 14%."
                  value={cycleForm.changeNote}
                  onChange={(e) => setCycleForm({ ...cycleForm, changeNote: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </Modal>
      ) : null}

      {editCycle ? (
        <Modal
          open
          onClose={() => setEditCycle(false)}
          title="تعديل بيانات الدورة"
          subtitle={cycle.name}
          width="max-w-2xl"
          footer={
            <>
              <Button
                variant="primary"
                onClick={() => {
                  setEditCycle(false);
                  setToast("حُدِّثت بيانات الدورة");
                }}
              >
                <Save size={15} />
                تم
              </Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="سنة الدورة" required>
              <Input
                type="number"
                value={cycle.year}
                onChange={(e) => updateCycle(cycle.id, { year: Number(e.target.value) || cycle.year })}
              />
            </Field>
            <Field label="تاريخ إعلان الدورة">
              <Input
                type="date"
                value={cycle.announcedOn}
                onChange={(e) => updateCycle(cycle.id, { announcedOn: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="مسمى الدورة" required>
                <Input value={cycle.name} onChange={(e) => updateCycle(cycle.id, { name: e.target.value })} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="مرجع الدليل">
                <Input
                  value={cycle.reference}
                  onChange={(e) => updateCycle(cycle.id, { reference: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="أبرز التغيّرات عن الدورة السابقة">
                <Textarea
                  rows={3}
                  value={cycle.changeNote}
                  onChange={(e) => updateCycle(cycle.id, { changeNote: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </Modal>
      ) : null}

      {relink ? (
        <Modal
          open
          onClose={() => setRelink(false)}
          title="إعادة ربط المؤشرات بمناظير الدورة الجارية"
          subtitle={`${num(orphans.length)} مؤشراً بحاجة إلى منظور معتمد في ${current?.name ?? ""}`}
          width="max-w-3xl"
          footer={
            <Button variant="primary" onClick={() => setRelink(false)}>
              تم
            </Button>
          }
        >
          <div className="space-y-3">
            {orphans.map((k) => (
              <div key={k.id} className="grid gap-3 sm:grid-cols-2 items-center rounded-[10px] border border-n200 p-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-ink truncate">{k.name}</p>
                  <p className="text-[11px] text-n500 tnum mt-0.5">{k.code}</p>
                </div>
                <Select
                  value=""
                  onChange={(v) => {
                    if (v) relinkKpiPerspective(k.id, v);
                  }}
                  placeholder="اختر المنظور المعتمد…"
                  options={(current?.perspectives ?? []).map((p) => ({
                    value: p.id,
                    label: `${p.code} · ${p.name}`,
                  }))}
                />
              </div>
            ))}
            {!orphans.length ? (
              <EmptyState title="كل المؤشرات مرتبطة بمناظير الدورة الجارية" />
            ) : null}
          </div>
        </Modal>
      ) : null}

      {toast ? <Toast message={toast} onDone={() => setToast("")} /> : null}
    </>
  );
}
