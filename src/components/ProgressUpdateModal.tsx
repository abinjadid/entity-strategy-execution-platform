"use client";

// =============================================================================
// نافذة تحديث نسبة إنجاز المشروع — شريط تمرير + تعليق إلزامي
// =============================================================================

import { useState } from "react";
import { Info } from "lucide-react";

import { Button, Field, Modal, Textarea, Toast } from "@/components/ui";
import { useStore } from "@/lib/store";
import { plannedProgress } from "@/lib/calc";
import { pct } from "@/lib/format";
import type { Project } from "@/lib/types";

export function ProgressUpdateModal({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const updateProjectProgress = useStore((s) => s.updateProjectProgress);
  const [value, setValue] = useState(project.actualProgress);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState("");
  const [touched, setTouched] = useState(false);

  const planned = plannedProgress(project);
  const delta = value - project.actualProgress;
  const variance = value - planned;
  const commentError =
    touched && comment.trim().length < 10 ? "التعليق إلزامي ولا يقل عن 10 أحرف" : undefined;

  const save = () => {
    setTouched(true);
    if (comment.trim().length < 10) return;
    updateProjectProgress(project.id, Math.round(value), comment.trim());
    setToast("تم حفظ التحديث وإشعار مدير النظام ومتابعة الاستراتيجية");
    setTimeout(onClose, 600);
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="تحديث نسبة إنجاز المشروع"
        subtitle={`${project.code} · ${project.name}`}
        footer={
          <>
            <Button variant="primary" onClick={save}>
              حفظ التحديث
            </Button>
            <Button variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* ------------------------------------------------ شريط التمرير */}
          <div>
            <div className="flex items-end justify-between mb-4">
              <span className="text-[13px] font-semibold text-n700">نسبة الإنجاز الفعلية</span>
              <span className="text-[34px] font-bold text-brand-text leading-none tnum">{Math.round(value)}%</span>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              aria-label="نسبة الإنجاز"
            />

            <div className="flex justify-between mt-2 text-[11px] text-n500 tnum">
              {[0, 25, 50, 75, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => setValue(n)}
                  className="hover:text-brand-text font-semibold transition-colors"
                >
                  {n}%
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="rounded-[10px] bg-n50 border border-n200 p-3">
                <p className="text-[11.5px] text-n500">النسبة السابقة</p>
                <p className="text-[16px] font-bold text-ink mt-1 tnum">{pct(project.actualProgress)}</p>
              </div>
              <div className="rounded-[10px] bg-n50 border border-n200 p-3">
                <p className="text-[11.5px] text-n500">التغيير</p>
                <p
                  className={`text-[16px] font-bold mt-1 tnum ${delta > 0 ? "text-dga-green-400" : delta < 0 ? "text-dga-red" : "text-ink"}`}
                >
                  {delta > 0 ? "+" : ""}
                  {Math.round(delta)}%
                </p>
              </div>
              <div className="rounded-[10px] bg-n50 border border-n200 p-3">
                <p className="text-[11.5px] text-n500">الانحراف عن الخطة</p>
                <p
                  className={`text-[16px] font-bold mt-1 tnum ${variance < 0 ? "text-dga-red" : "text-dga-green-400"}`}
                >
                  {variance > 0 ? "+" : ""}
                  {variance.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ تعليق إلزامي */}
          <Field
            label="مبرر التحديث"
            required
            error={commentError}
            hint="يُوثَّق التعليق في سجل المشروع ويظهر لمكتب إدارة المشاريع ضمن الإشعار الفوري."
          >
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="اذكر المخرجات المنجزة خلال الفترة، والمعالم المكتملة، وأي معوقات أثّرت على النسبة…"
            />
          </Field>

          <div className="flex gap-3 rounded-[10px] border border-dga-blue/25 bg-dga-blue/5 p-3.5">
            <Info size={16} className="shrink-0 mt-0.5 text-dga-blue-400" />
            <p className="text-[12.5px] text-n700 leading-relaxed">
              يتحول المشروع تلقائياً إلى حالة «مكتمل» عند بلوغ 100%. يُرسل إشعار فوري لمدير النظام
              ومدير متابعة الاستراتيجية عند كل تحديث، ويُحفظ التحديث في سجل المشروع باسمك وتاريخه.
            </p>
          </div>
        </div>
      </Modal>
      {toast ? <Toast message={toast} onDone={() => setToast("")} /> : null}
    </>
  );
}
