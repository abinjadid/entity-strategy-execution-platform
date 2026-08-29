"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  CircleDollarSign,
  Download,
  FileText,
  Flag,
  History,
  Paperclip,
  Printer,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
} from "lucide-react";

import { Breadcrumb } from "@/components/AppShell";
import { ProgressUpdateModal } from "@/components/ProgressUpdateModal";
import {
  Button,
  Card,
  CardHead,
  Chip,
  EmptyState,
  Field,
  Modal,
  PageTitle,
  PriorityBadge,
  ProgressBar,
  RagBadge,
  Select,
  StatCard,
  StatusBadge,
  TableWrap,
  Td,
  Textarea,
  Th,
  Toast,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { canAttach, canUpdateMilestone, canUpdateProject } from "@/lib/rbac";
import { milestoneProgress, plannedProgress, projectRag, projectVariance } from "@/lib/calc";
import { bytes, dateAr, dateShort, dateTimeAr, money, num, pct, timeAgo } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/types";
import type { Milestone, Status } from "@/lib/types";

const MS_STATUSES: Status[] = ["not_started", "in_progress", "completed", "delayed"];
const MAX_FILE = 2 * 1024 * 1024;

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const data = useStore((s) => s.data);
  const currentUserId = useStore((s) => s.currentUserId);
  const updateMilestone = useStore((s) => s.updateMilestone);
  const addAttachment = useStore((s) => s.addAttachment);
  const removeAttachment = useStore((s) => s.removeAttachment);

  const user = data.users.find((u) => u.id === currentUserId) ?? null;
  const project = data.projects.find((p) => p.id === id);

  const [progressOpen, setProgressOpen] = useState(false);
  const [msEdit, setMsEdit] = useState<Milestone | null>(null);
  const [msStatus, setMsStatus] = useState<Status>("in_progress");
  const [msReason, setMsReason] = useState("");
  const [msTouched, setMsTouched] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const attachments = useMemo(
    () => data.attachments.filter((a) => a.entityType === "project" && a.entityId === id),
    [data.attachments, id],
  );

  if (!project) {
    return (
      <Card>
        <EmptyState title="المشروع غير موجود" body="ربما حُذف أو أن الرابط غير صحيح." />
      </Card>
    );
  }

  const init = data.initiatives.find((i) => i.id === project.initiativeId);
  const pillar = data.pillars.find((p) => p.id === init?.pillarId);
  const owner = data.users.find((u) => u.id === project.ownerId);
  const now = new Date();
  const planned = plannedProgress(project, now);
  const variance = projectVariance(project, now);
  const rag = projectRag(project, now);
  const msProgress = milestoneProgress(project);
  const util = project.budgetPlanned ? (project.budgetSpent / project.budgetPlanned) * 100 : 0;

  const mayUpdate = canUpdateProject(user, project.id, data);
  const mayMilestone = canUpdateMilestone(user, project.id, data);
  const mayAttach = canAttach(user, project.id, data);

  const openMs = (m: Milestone) => {
    setMsEdit(m);
    setMsStatus(m.status);
    setMsReason(m.delayReason);
    setMsTouched(false);
  };

  const saveMs = () => {
    setMsTouched(true);
    if (msStatus === "delayed" && msReason.trim().length < 10) return;
    if (!msEdit) return;
    updateMilestone(project.id, msEdit.id, { status: msStatus, delayReason: msReason.trim() });
    setMsEdit(null);
    setToast("تم تحديث حالة المعلم وإشعار مكتب إدارة المشاريع");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE) {
      setToast("حجم الملف يتجاوز 2 ميجابايت — يرجى ضغطه أو رفع نسخة أصغر");
      e.target.value = "";
      return;
    }
    const dataUrl = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsDataURL(f);
    });
    addAttachment({
      entityType: "project",
      entityId: project.id,
      name: f.name,
      size: f.size,
      mime: f.type || "application/octet-stream",
      dataUrl,
    });
    setToast("تم إرفاق المستند بنجاح");
    e.target.value = "";
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: "المشاريع", href: "/projects" },
          ...(init ? [{ label: init.code, href: `/initiatives/${init.id}` }] : []),
          { label: project.code },
        ]}
      />

      <PageTitle
        title={project.name}
        subtitle={`${project.code} · ${init?.name ?? ""} · المورّد: ${project.vendor}`}
        actions={
          <>
            {mayUpdate ? (
              <Button variant="primary" onClick={() => setProgressOpen(true)}>
                <SlidersHorizontal size={16} />
                تحديث نسبة الإنجاز
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
        <Chip color={pillar?.color}>{pillar?.name}</Chip>
        <StatusBadge status={project.status} />
        <PriorityBadge priority={project.priority} />
        <RagBadge rag={rag} />
        <Chip>{dateShort(project.startDate)} — {dateShort(project.endDate)}</Chip>
        <Chip>المالك: {owner?.name}</Chip>
        {!mayUpdate ? (
          <span className="text-[12px] text-n500">
            صلاحيتك على هذا المشروع: اطلاع فقط
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard
          label="الإنجاز الفعلي"
          value={pct(project.actualProgress)}
          icon={<TrendingUp size={16} />}
          accent={pillar?.color}
          sub={`المخطط ${pct(planned, 1)}`}
          trend={{ value: variance, label: "نقطة عن الخطة" }}
        />
        <StatCard
          label="إنجاز المعالم"
          value={pct(msProgress)}
          icon={<Flag size={16} />}
          accent="#852cd0"
          sub={`${num(project.milestones.filter((m) => m.status === "completed").length)} من ${num(project.milestones.length)} معلماً`}
        />
        <StatCard
          label="نسبة صرف الميزانية"
          value={pct(util, 1)}
          icon={<CircleDollarSign size={16} />}
          accent="#00abaf"
          sub={`${money(project.budgetSpent, true)} من ${money(project.budgetPlanned, true)}`}
        />
        <StatCard
          label="المتبقي على النهاية"
          value={`${num(
            Math.max(
              0,
              Math.ceil(
                (new Date(project.endDate + "T00:00:00Z").getTime() - now.getTime()) / 86400000,
              ),
            ),
          )} يوم`}
          icon={<CalendarClock size={16} />}
          accent="#1d9af2"
          sub={`النهاية ${dateAr(project.endDate)}`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3 mb-5">
        <Card className="xl:col-span-2">
          <CardHead
            title="نسبة الإنجاز مقابل الخطة"
            subtitle="العلامة الداكنة على الشريط تمثل النسبة المخططة وفق الزمن المنقضي"
          />
          <div className="p-5">
            <div className="flex items-end justify-between mb-3">
              <span className="text-[13px] text-n500">
                الفعلي <span className="font-bold text-ink tnum">{pct(project.actualProgress)}</span> ·
                المخطط <span className="font-bold text-n700 tnum">{pct(planned, 1)}</span>
              </span>
              <span
                className={`text-[13px] font-bold tnum ${variance < 0 ? "text-dga-red" : "text-dga-green-400"}`}
              >
                الانحراف {variance > 0 ? "+" : ""}
                {variance.toFixed(1)} نقطة
              </span>
            </div>
            <ProgressBar
              value={project.actualProgress}
              planned={planned}
              height={14}
              color={rag === "red" ? "#c40000" : rag === "amber" ? "#ffa300" : pillar?.color ?? "#2a206a"}
            />
            <p className="text-[13.5px] text-n700 leading-[1.9] mt-5 pt-5 border-t border-n100">
              {project.description}
            </p>
          </div>
        </Card>

        <Card>
          <CardHead title="سجل تحديثات النسبة" icon={<History size={17} />} />
          {project.updates.length ? (
            <ul className="divide-y divide-n100 max-h-[320px] overflow-y-auto">
              {project.updates.map((u) => (
                <li key={u.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] font-bold text-ink tnum">
                      {Math.round(u.previousProgress)}% ← {Math.round(u.progress)}%
                    </span>
                    <span className="text-[11px] text-n500">{timeAgo(u.at)}</span>
                  </div>
                  <p className="text-[12px] text-n700 mt-1.5 leading-relaxed">{u.comment}</p>
                  <p className="text-[11px] text-n500 mt-1.5">
                    {data.users.find((x) => x.id === u.byUserId)?.name} · {dateTimeAr(u.at)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="لا توجد تحديثات مسجلة بعد" />
          )}
        </Card>
      </div>

      {/* --------------------------------------------------------- المعالم */}
      <Card className="mb-5">
        <CardHead
          title="معالم المشروع"
          subtitle="تحديث حالة المعلم يتطلب مبرراً مكتوباً عند تسجيله كمتأخر"
          icon={<Flag size={17} />}
        />
        {project.milestones.length ? (
          <TableWrap>
            <thead>
              <tr>
                <Th>المعلم</Th>
                <Th width={130}>تاريخ الاستحقاق</Th>
                <Th width={130}>تاريخ الإنجاز</Th>
                <Th width={70}>الوزن</Th>
                <Th width={110}>الحالة</Th>
                <Th>مبرر التأخر</Th>
                <Th width={110}>الإجراء</Th>
              </tr>
            </thead>
            <tbody>
              {project.milestones.map((m) => (
                <tr key={m.id} className="hover:bg-n50 transition-colors">
                  <Td>
                    <span className="block text-[13px] font-bold text-ink">{m.name}</span>
                    {m.lastUpdatedAt ? (
                      <span className="block text-[11px] text-n500 mt-0.5">
                        آخر تحديث {timeAgo(m.lastUpdatedAt)}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="text-[12.5px] tnum">{dateShort(m.dueDate)}</Td>
                  <Td className="text-[12.5px] tnum">{dateShort(m.completedDate)}</Td>
                  <Td className="text-[12.5px] tnum">{m.weight}%</Td>
                  <Td>
                    <StatusBadge status={m.status} />
                  </Td>
                  <Td className="text-[12px] text-n700 leading-relaxed">
                    {m.delayReason || <span className="text-n300">—</span>}
                  </Td>
                  <Td>
                    {mayMilestone ? (
                      <Button size="sm" onClick={() => openMs(m)}>
                        تحديث
                      </Button>
                    ) : (
                      <span className="text-[11.5px] text-n500">اطلاع</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <EmptyState title="لا توجد معالم مسجلة لهذا المشروع" />
        )}
      </Card>

      {/* ------------------------------------------------------- المستندات */}
      <Card>
        <CardHead
          title="مستندات التقدم"
          subtitle="تُحفظ المستندات محلياً في متصفحك — الحد الأقصى 2 ميجابايت للملف"
          icon={<Paperclip size={17} />}
          action={
            mayAttach ? (
              <>
                <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
                <Button onClick={() => fileRef.current?.click()}>
                  <Paperclip size={15} />
                  إرفاق مستند
                </Button>
              </>
            ) : null
          }
        />
        {attachments.length ? (
          <ul className="divide-y divide-n100">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="w-9 h-9 shrink-0 rounded-[9px] bg-n100 grid place-items-center text-brand-text">
                  <FileText size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-ink truncate">{a.name}</span>
                  <span className="block text-[11.5px] text-n500 mt-0.5">
                    {bytes(a.size)} · {data.users.find((u) => u.id === a.byUserId)?.name} ·{" "}
                    {dateTimeAr(a.at)}
                  </span>
                </span>
                <a
                  href={a.dataUrl}
                  download={a.name}
                  className="shrink-0 p-2 rounded-[8px] text-n500 hover:bg-n100 hover:text-brand-text transition-colors no-print"
                  title="تنزيل"
                >
                  <Download size={16} />
                </a>
                {mayAttach ? (
                  <button
                    onClick={() => removeAttachment(a.id)}
                    className="shrink-0 p-2 rounded-[8px] text-n500 hover:bg-n100 hover:text-dga-red transition-colors no-print"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="لا توجد مستندات مرفقة"
            body={
              mayAttach
                ? "أرفق تقارير التقدم أو محاضر الاجتماعات أو شهادات الإنجاز لتوثيق التحديثات."
                : "لم يُرفق أي مستند بهذا المشروع بعد."
            }
            icon={<Paperclip size={30} />}
          />
        )}
      </Card>

      {/* ---------------------------------------------------------- النوافذ */}
      {progressOpen ? (
        <ProgressUpdateModal project={project} onClose={() => setProgressOpen(false)} />
      ) : null}

      {msEdit ? (
        <Modal
          open
          onClose={() => setMsEdit(null)}
          title="تحديث حالة المعلم"
          subtitle={msEdit.name}
          footer={
            <>
              <Button variant="primary" onClick={saveMs}>
                حفظ الحالة
              </Button>
              <Button variant="ghost" onClick={() => setMsEdit(null)}>
                إلغاء
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[10px] bg-n50 border border-n200 p-3">
                <p className="text-[11.5px] text-n500">تاريخ الاستحقاق</p>
                <p className="text-[14px] font-bold text-ink mt-1 tnum">{dateAr(msEdit.dueDate)}</p>
              </div>
              <div className="rounded-[10px] bg-n50 border border-n200 p-3">
                <p className="text-[11.5px] text-n500">الوزن ضمن المشروع</p>
                <p className="text-[14px] font-bold text-ink mt-1 tnum">{msEdit.weight}%</p>
              </div>
            </div>

            <Field label="الحالة" required>
              <Select
                value={msStatus}
                onChange={(v) => setMsStatus(v as Status)}
                options={MS_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
              />
            </Field>

            {msStatus === "delayed" ? (
              <Field
                label="مبرر التأخر"
                required
                error={
                  msTouched && msReason.trim().length < 10
                    ? "المبرر إلزامي ولا يقل عن 10 أحرف"
                    : undefined
                }
                hint="يظهر المبرر في تقارير مكتب إدارة المشاريع وفي إشعار فوري لمدير متابعة الاستراتيجية."
              >
                <Textarea
                  value={msReason}
                  onChange={(e) => setMsReason(e.target.value)}
                  onBlur={() => setMsTouched(true)}
                  placeholder="اذكر سبب التأخر والأثر على المسار الحرج والإجراء التصحيحي المقترح…"
                />
              </Field>
            ) : null}

            {msStatus === "completed" ? (
              <p className="text-[12.5px] text-n700 rounded-[10px] border border-dga-green/30 bg-dga-green/5 p-3.5 leading-relaxed">
                سيُسجَّل تاريخ اليوم كتاريخ إنجاز للمعلم، وستُحدَّث نسبة إنجاز المعالم للمشروع
                تلقائياً وفق أوزانها.
              </p>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {toast ? <Toast message={toast} onDone={() => setToast("")} /> : null}
    </>
  );
}
