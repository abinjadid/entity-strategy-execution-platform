"use client";

// =============================================================================
// نافذة إدخال القيمة الفعلية لمؤشر أداء — تعليق إلزامي مع كل قراءة
// =============================================================================

import { useMemo, useState } from "react";
import { Info } from "lucide-react";

import { Button, Field, Input, Modal, RagBadge, Select, Textarea, Toast } from "@/components/ui";
import { useStore } from "@/lib/store";
import { achievement, availableQuarters, ragOf, readingAt } from "@/lib/calc";
import { kpiValue, pct } from "@/lib/format";
import { UNIT_LABELS } from "@/lib/types";
import type { Kpi } from "@/lib/types";

export function KpiEntryModal({ kpi, onClose }: { kpi: Kpi; onClose: () => void }) {
  const data = useStore((s) => s.data);
  const saveKpiReading = useStore((s) => s.saveKpiReading);

  const quarters = useMemo(() => availableQuarters(data), [data]);
  const last = quarters[quarters.length - 1];

  const [period, setPeriod] = useState(`${last.year}-${last.quarter}`);
  const [year, quarter] = period.split("-").map(Number) as [number, 1 | 2 | 3 | 4];

  const existing = readingAt(kpi, year, quarter);
  const [actual, setActual] = useState(existing?.actual !== null && existing?.actual !== undefined ? String(existing.actual) : "");
  const [target, setTarget] = useState(String(existing?.target ?? kpi.target));
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [touched, setTouched] = useState(false);
  const [toast, setToast] = useState("");

  const onPeriod = (v: string) => {
    setPeriod(v);
    const [y, q] = v.split("-").map(Number) as [number, 1 | 2 | 3 | 4];
    const r = readingAt(kpi, y, q);
    setActual(r?.actual !== null && r?.actual !== undefined ? String(r.actual) : "");
    setTarget(String(r?.target ?? kpi.target));
    setComment(r?.comment ?? "");
    setTouched(false);
  };

  const numeric = Number(actual);
  const valid = actual !== "" && !Number.isNaN(numeric);
  const preview = valid
    ? achievement(kpi, {
        id: "preview",
        kpiId: kpi.id,
        year,
        quarter,
        target: Number(target) || kpi.target,
        actual: numeric,
        comment,
        byUserId: "",
        at: "",
      })
    : null;

  const commentError =
    touched && comment.trim().length < 10 ? "التعليق إلزامي ولا يقل عن 10 أحرف" : undefined;

  const save = () => {
    setTouched(true);
    if (!valid || comment.trim().length < 10) return;
    saveKpiReading(kpi.id, year, quarter, numeric, comment.trim(), Number(target) || kpi.target);
    setToast("تم حفظ القراءة وإشعار مدير النظام ومتابعة الاستراتيجية");
    setTimeout(onClose, 600);
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="إدخال القيمة الفعلية للمؤشر"
        subtitle={`${kpi.code} · ${kpi.name}`}
        footer={
          <>
            <Button variant="primary" onClick={save}>
              حفظ القراءة
            </Button>
            <Button variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Box label="خط الأساس" value={kpiValue(kpi, kpi.baseline)} />
            <Box label="المستهدف النهائي" value={kpiValue(kpi, kpi.target)} />
            <Box label="الوحدة" value={UNIT_LABELS[kpi.unit]} />
            <Box label="الاتجاه" value={kpi.direction === "increase" ? "تصاعدي" : "تنازلي"} />
          </div>

          <Field label="فترة القراءة" required>
            <Select
              value={period}
              onChange={onPeriod}
              options={quarters
                .slice()
                .reverse()
                .map((q) => ({
                  value: `${q.year}-${q.quarter}`,
                  label: `الربع ${q.quarter} · ${q.year}${readingAt(kpi, q.year, q.quarter)?.actual !== null && readingAt(kpi, q.year, q.quarter) ? " — مُدخلة" : ""}`,
                }))}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="مستهدف الفترة" required>
              <Input type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
            <Field label="القيمة الفعلية" required hint={`بوحدة ${UNIT_LABELS[kpi.unit]}`}>
              <Input
                type="number"
                step="any"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                placeholder="أدخل القيمة المرصودة للفترة"
              />
            </Field>
          </div>

          {preview !== null ? (
            <div className="flex items-center justify-between gap-4 rounded-[10px] border border-n200 bg-n50 p-4">
              <div>
                <p className="text-[11.5px] text-n500">نسبة التحقق المحسوبة</p>
                <p className="text-[26px] font-bold text-ink leading-none mt-1.5 tnum">{pct(preview)}</p>
              </div>
              <RagBadge rag={ragOf(preview, kpi.thresholdGreen, kpi.thresholdAmber)} />
            </div>
          ) : null}

          <Field
            label="تعليق على القراءة"
            required
            error={commentError}
            hint="وثّق مصدر البيانات وسبب أي انحراف عن المستهدف والإجراء التصحيحي إن وُجد."
          >
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="مثال: القراءة مستخرجة من تقرير النظام التشغيلي بتاريخ… الانحراف ناتج عن…"
            />
          </Field>

          <div className="flex gap-3 rounded-[10px] border border-dga-blue/25 bg-dga-blue/5 p-3.5">
            <Info size={16} className="shrink-0 mt-0.5 text-dga-blue-400" />
            <p className="text-[12.5px] text-n700 leading-relaxed">
              تُحتسب نسبة التحقق من خط الأساس لا من الصفر، فتعكس التقدم الحقيقي المحرز. حدود التقييم:
              أخضر عند {kpi.thresholdGreen}% فأكثر، وأصفر عند {kpi.thresholdAmber}% فأكثر، وما دون
              ذلك أحمر.
            </p>
          </div>
        </div>
      </Modal>
      {toast ? <Toast message={toast} onDone={() => setToast("")} /> : null}
    </>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-n50 border border-n200 p-3">
      <p className="text-[11px] text-n500">{label}</p>
      <p className="text-[13.5px] font-bold text-ink mt-1 tnum">{value}</p>
    </div>
  );
}
