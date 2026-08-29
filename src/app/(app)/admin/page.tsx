"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Database,
  Download,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  ImagePlus,
  Upload,
  UserCog,
  X,
} from "lucide-react";
import clsx from "clsx";

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
  Select,
  StatCard,
  TableWrap,
  Tabs,
  Td,
  Th,
  Toast,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { ROLE_PERMISSIONS, ROLE_SUMMARY, can } from "@/lib/rbac";
import type { Permission } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/types";
import type { Role, User } from "@/lib/types";
import { downloadImportTemplate, exportFullXlsx, importFromExcel } from "@/lib/excel";
import type { ImportResult } from "@/lib/excel";
import { initials, num } from "@/lib/format";
import { BrandMark } from "@/components/BrandMark";

const PERMISSION_LABELS: Record<Permission, string> = {
  "structure.manage": "إدارة الهيكل الاستراتيجي",
  "users.manage": "إدارة المستخدمين والصلاحيات",
  "settings.manage": "إعدادات المنصة",
  "data.import": "استيراد البيانات",
  "data.export": "تصدير البيانات",
  "data.reset": "إعادة تعيين البيانات",
  "progress.update.any": "تحديث نسبة أي مشروع",
  "progress.update.owned": "تحديث نسب المشاريع المملوكة",
  "kpi.enter.any": "إدخال قيم أي مؤشر",
  "kpi.enter.owned": "إدخال قيم المؤشرات المملوكة",
  "milestone.update.any": "تحديث حالة أي معلم",
  "milestone.update.owned": "تحديث حالة المعالم المملوكة",
  "attachment.upload": "إرفاق المستندات",
  "notifications.receive": "استقبال إشعارات التحديثات",
  "reports.view": "الاطلاع على التقارير",
};

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];
const ROLES: Role[] = ["admin", "pmo", "owner", "viewer"];

export default function AdminPage() {
  const router = useRouter();
  const data = useStore((s) => s.data);
  const currentUserId = useStore((s) => s.currentUserId);
  const upsertUser = useStore((s) => s.upsertUser);
  const removeUser = useStore((s) => s.removeUser);
  const updateSettings = useStore((s) => s.updateSettings);
  const mergeImported = useStore((s) => s.mergeImported);
  const resetToSeed = useStore((s) => s.resetToSeed);
  const resetToEmpty = useStore((s) => s.resetToEmpty);

  const user = data.users.find((u) => u.id === currentUserId) ?? null;
  const [tab, setTab] = useState("users");
  const [toast, setToast] = useState("");
  const [userModal, setUserModal] = useState<User | "new" | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [confirmReset, setConfirmReset] = useState<"seed" | "empty" | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState({
    entityName: data.settings.entityName,
    strategyName: data.settings.strategyName,
    strategyStartYear: String(data.settings.strategyStartYear),
    strategyEndYear: String(data.settings.strategyEndYear),
    currentYear: String(data.settings.currentYear),
    currentQuarter: String(data.settings.currentQuarter),
    ragGreen: String(data.settings.ragGreen),
    ragAmber: String(data.settings.ragAmber),
    logoDataUrl: data.settings.logoDataUrl,
  });

  const counts = useMemo(
    () => ({
      users: data.users.length,
      pillars: data.pillars.length,
      objectives: data.objectives.length,
      initiatives: data.initiatives.length,
      projects: data.projects.length,
      kpis: data.kpis.length,
      readings: data.kpis.reduce((s, k) => s + k.readings.filter((r) => r.actual !== null).length, 0),
      milestones: data.projects.reduce((s, p) => s + p.milestones.length, 0),
    }),
    [data],
  );

  if (!can(user?.role, "users.manage")) {
    return (
      <Card>
        <EmptyState
          title="هذه الشاشة مخصصة لمدير النظام"
          body="لا تملك صلاحية إدارة المنصة. يمكنك الرجوع إلى لوحة القيادة أو التقارير."
          icon={<ShieldCheck size={34} />}
        />
      </Card>
    );
  }

  const openUser = (u: User | "new") => {
    setUserModal(u);
    if (u === "new") setForm({ role: "owner", active: "true" });
    else
      setForm({
        name: u.name,
        email: u.email,
        role: u.role,
        jobTitle: u.jobTitle,
        department: u.department,
        active: String(u.active),
      });
  };

  const saveUser = () => {
    upsertUser({
      id: userModal === "new" || !userModal ? undefined : userModal.id,
      name: form.name,
      email: form.email,
      role: form.role as Role,
      jobTitle: form.jobTitle,
      department: form.department,
      active: form.active !== "false",
    });
    setUserModal(null);
    setForm({});
    setToast("تم حفظ بيانات المستخدم");
  };

  const saveSettings = () => {
    updateSettings({
      entityName: settings.entityName,
      strategyName: settings.strategyName,
      strategyStartYear: Number(settings.strategyStartYear),
      strategyEndYear: Number(settings.strategyEndYear),
      currentYear: Number(settings.currentYear),
      currentQuarter: Number(settings.currentQuarter) as 1 | 2 | 3 | 4,
      ragGreen: Number(settings.ragGreen),
      ragAmber: Number(settings.ragAmber),
      logoDataUrl: settings.logoDataUrl,
    });
    setToast("تم حفظ إعدادات المنصة");
  };

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/") || f.size > 3 * 1024 * 1024) {
      setToast("الشعار يجب أن يكون صورة بحجم لا يتجاوز 3 ميجابايت");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new window.Image();
      img.onerror = () => setSettings((v) => ({ ...v, logoDataUrl: src }));
      img.onload = () => {
        const scale = Math.min(1, 320 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return setSettings((v) => ({ ...v, logoDataUrl: src }));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setSettings((v) => ({ ...v, logoDataUrl: canvas.toDataURL("image/png") }));
      };
      img.src = src;
    };
    reader.readAsDataURL(f);
  };

  const rerunWizard = () => {
    updateSettings({ onboarded: false });
    router.push("/setup");
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImporting(true);
    try {
      const res = await importFromExcel(f, data);
      setResult(res);
      mergeImported({
        pillars: res.pillars,
        objectives: res.objectives,
        initiatives: res.initiatives,
        projects: res.projects,
        kpis: res.kpis,
      });
      setToast("تم استيراد البيانات ودمجها مع الهيكل الحالي");
    } catch (err) {
      console.error("IMPORT_ERROR", err);
      setToast("تعذّر قراءة الملف — تأكد من استخدام قالب الاستيراد المعتمد");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <PageTitle
        title="إدارة المنصة"
        subtitle="المستخدمون والصلاحيات، إعدادات الاستراتيجية وحدود التقييم، واستيراد وتصدير البيانات"
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard label="المستخدمون" value={num(counts.users)} icon={<UserCog size={16} />} accent="#2a206a" />
        <StatCard
          label="عناصر الهيكل"
          value={num(counts.pillars + counts.objectives + counts.initiatives + counts.projects)}
          icon={<Database size={16} />}
          accent="#1d9af2"
          sub={`${num(counts.pillars)} ركيزة · ${num(counts.objectives)} هدف · ${num(counts.initiatives)} مبادرة · ${num(counts.projects)} مشروع`}
        />
        <StatCard
          label="مؤشرات الأداء"
          value={num(counts.kpis)}
          accent="#852cd0"
          sub={`${num(counts.readings)} قراءة مسجلة`}
        />
        <StatCard label="المعالم" value={num(counts.milestones)} accent="#00abaf" sub="عبر كل المشاريع" />
      </div>

      <Card>
        <div className="px-2 pt-2">
          <Tabs
            active={tab}
            onChange={setTab}
            tabs={[
              { id: "users", label: "المستخدمون", count: data.users.length },
              { id: "permissions", label: "مصفوفة الصلاحيات" },
              { id: "settings", label: "إعدادات المنصة" },
              { id: "data", label: "استيراد وتصدير" },
            ]}
          />
        </div>

        {/* -------------------------------------------------------- المستخدمون */}
        {tab === "users" ? (
          <>
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-n100">
              <p className="text-[12.5px] text-n500 leading-relaxed">
                يحدد الدور ما يستطيع المستخدم رؤيته وتحديثه. مالك المبادرة يرى ويحدّث مبادراته
                ومشاريعه فقط.
              </p>
              <Button onClick={() => openUser("new")}>
                <Plus size={16} />
                مستخدم جديد
              </Button>
            </div>
            <TableWrap>
              <thead>
                <tr>
                  <Th>المستخدم</Th>
                  <Th width={210}>الدور</Th>
                  <Th width={180}>الإدارة</Th>
                  <Th width={130}>المبادرات المملوكة</Th>
                  <Th width={90}>الحالة</Th>
                  <Th width={130}>الإجراء</Th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="hover:bg-n50 transition-colors">
                    <Td>
                      <span className="flex items-center gap-3">
                        <span className="w-9 h-9 shrink-0 rounded-full bg-brand-solid text-white grid place-items-center text-[12px] font-bold">
                          {initials(u.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-bold text-ink">{u.name}</span>
                          <span className="block text-[11.5px] text-n500 truncate">{u.email}</span>
                        </span>
                      </span>
                    </Td>
                    <Td className="text-[12.5px] font-semibold">{ROLE_LABELS[u.role]}</Td>
                    <Td className="text-[12.5px]">
                      <span className="block">{u.department}</span>
                      <span className="block text-[11.5px] text-n500 mt-0.5">{u.jobTitle}</span>
                    </Td>
                    <Td className="text-[12.5px] tnum">
                      {u.role === "owner"
                        ? num(
                            data.initiatives.filter(
                              (i) => i.ownerId === u.id || u.ownedInitiativeIds.includes(i.id),
                            ).length,
                          )
                        : u.role === "admin" || u.role === "pmo"
                          ? "الكل"
                          : "—"}
                    </Td>
                    <Td>
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold",
                          u.active
                            ? "bg-dga-green/12 text-dga-green-400 border-dga-green/30"
                            : "bg-n100 text-n500 border-n200",
                        )}
                      >
                        {u.active ? <Check size={12} /> : <X size={12} />}
                        {u.active ? "نشط" : "معطّل"}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" onClick={() => openUser(u)}>
                          تعديل
                        </Button>
                        {u.id !== currentUserId ? (
                          <button
                            onClick={() => {
                              removeUser(u.id);
                              setToast("تم حذف المستخدم");
                            }}
                            className="p-2 rounded-[8px] text-n500 hover:bg-n100 hover:text-dga-red transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </>
        ) : null}

        {/* ---------------------------------------------------- مصفوفة الصلاحيات */}
        {tab === "permissions" ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 p-5 border-b border-n100">
              {ROLES.map((r) => (
                <div key={r} className="rounded-[12px] border border-n200 p-4">
                  <p className="text-[13px] font-bold text-ink">{ROLE_LABELS[r]}</p>
                  <p className="text-[12px] text-n500 mt-1.5 leading-relaxed">{ROLE_SUMMARY[r]}</p>
                  <p className="text-[11.5px] text-n700 mt-3 font-semibold tnum">
                    {ROLE_PERMISSIONS[r].length} صلاحية من {ALL_PERMISSIONS.length}
                  </p>
                </div>
              ))}
            </div>
            <TableWrap>
              <thead>
                <tr>
                  <Th>الصلاحية</Th>
                  {ROLES.map((r) => (
                    <Th key={r} width={150} className="text-center">
                      {ROLE_LABELS[r].split(" / ")[0]}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_PERMISSIONS.map((p) => (
                  <tr key={p} className="hover:bg-n50 transition-colors">
                    <Td className="text-[12.5px] font-semibold">{PERMISSION_LABELS[p]}</Td>
                    {ROLES.map((r) => (
                      <Td key={r} className="text-center">
                        {ROLE_PERMISSIONS[r].includes(p) ? (
                          <span className="inline-grid place-items-center w-6 h-6 rounded-full bg-dga-green/15 text-dga-green-400">
                            <Check size={14} strokeWidth={3} />
                          </span>
                        ) : (
                          <span className="inline-grid place-items-center w-6 h-6 rounded-full bg-n100 text-n300">
                            <X size={13} strokeWidth={3} />
                          </span>
                        )}
                      </Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </>
        ) : null}

        {/* ------------------------------------------------------- الإعدادات */}
        {tab === "settings" ? (
          <div className="p-5">
            <div className="grid gap-5 md:grid-cols-2 max-w-4xl">
              <Field label="اسم الجهة" className="md:col-span-2">
                <Input
                  value={settings.entityName}
                  onChange={(e) => setSettings({ ...settings, entityName: e.target.value })}
                />
              </Field>

              <div className="md:col-span-2">
                <span className="block text-[13px] font-semibold text-n700 mb-2">شعار الجهة</span>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-20 h-20 rounded-[12px] border border-n200 bg-n50 grid place-items-center overflow-hidden shrink-0">
                    {settings.logoDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={settings.logoDataUrl}
                        alt="شعار الجهة"
                        className="max-w-[80%] max-h-[80%] object-contain"
                      />
                    ) : (
                      <BrandMark size={40} />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={logoRef}
                      type="file"
                      accept="image/png,image/svg+xml,image/jpeg,image/webp"
                      className="hidden"
                      onChange={onLogo}
                    />
                    <Button onClick={() => logoRef.current?.click()}>
                      <ImagePlus size={15} />
                      {settings.logoDataUrl ? "استبدال" : "رفع شعار"}
                    </Button>
                    {settings.logoDataUrl ? (
                      <Button
                        variant="ghost"
                        onClick={() => setSettings({ ...settings, logoDataUrl: "" })}
                      >
                        <Trash2 size={15} />
                        إزالة
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-[11.5px] text-n500 leading-relaxed max-w-xs">
                    يظهر في القائمة الجانبية وشاشة الدخول وترويسة التقارير. اضغط «حفظ الإعدادات»
                    بعد الرفع.
                  </p>
                </div>
              </div>
              <Field label="اسم الاستراتيجية" className="md:col-span-2">
                <Input
                  value={settings.strategyName}
                  onChange={(e) => setSettings({ ...settings, strategyName: e.target.value })}
                />
              </Field>
              <Field label="سنة بداية الاستراتيجية">
                <Input
                  type="number"
                  value={settings.strategyStartYear}
                  onChange={(e) => setSettings({ ...settings, strategyStartYear: e.target.value })}
                />
              </Field>
              <Field label="سنة نهاية الاستراتيجية">
                <Input
                  type="number"
                  value={settings.strategyEndYear}
                  onChange={(e) => setSettings({ ...settings, strategyEndYear: e.target.value })}
                />
              </Field>
              <Field label="السنة الحالية للرصد">
                <Input
                  type="number"
                  value={settings.currentYear}
                  onChange={(e) => setSettings({ ...settings, currentYear: e.target.value })}
                />
              </Field>
              <Field label="الربع الحالي">
                <Select
                  value={settings.currentQuarter}
                  onChange={(v) => setSettings({ ...settings, currentQuarter: v })}
                  options={[1, 2, 3, 4].map((q) => ({ value: String(q), label: `الربع ${q}` }))}
                />
              </Field>
              <Field label="حد اللون الأخضر %" hint="نسبة التحقق التي يُعتبر عندها المؤشر ضمن المستهدف">
                <Input
                  type="number"
                  value={settings.ragGreen}
                  onChange={(e) => setSettings({ ...settings, ragGreen: e.target.value })}
                />
              </Field>
              <Field label="حد اللون الأصفر %" hint="ما دونه يُعتبر المؤشر متعثراً — أحمر">
                <Input
                  type="number"
                  value={settings.ragAmber}
                  onChange={(e) => setSettings({ ...settings, ragAmber: e.target.value })}
                />
              </Field>
            </div>
            <div className="mt-6 pt-5 border-t border-n100 flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={saveSettings}>
                <Save size={16} />
                حفظ الإعدادات
              </Button>
              <Button onClick={rerunWizard}>
                <Sparkles size={16} />
                إعادة تشغيل معالج الإعداد
              </Button>
              <p className="text-[11.5px] text-n500 leading-relaxed">
                يعيد المعالج جمع هوية الجهة والاستراتيجية من البداية، ويتيح اختيار نقطة بداية
                جديدة للبيانات.
              </p>
            </div>
          </div>
        ) : null}

        {/* -------------------------------------------------- استيراد وتصدير */}
        {tab === "data" ? (
          <div className="p-5 space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[12px] border border-n200 p-5">
                <span className="w-10 h-10 rounded-[11px] bg-dga-blue/10 text-dga-blue-400 grid place-items-center mb-3">
                  <Download size={19} />
                </span>
                <p className="text-[13.5px] font-bold text-ink">قالب الاستيراد</p>
                <p className="text-[12.5px] text-n500 mt-1.5 leading-relaxed">
                  ملف Excel بأوراق الركائز والأهداف والمبادرات والمشاريع والمؤشرات، مع ورقة إرشادات
                  للقيم المقبولة.
                </p>
                <Button className="mt-4 w-full" onClick={() => downloadImportTemplate()}>
                  تنزيل القالب
                </Button>
              </div>

              <div className="rounded-[12px] border border-n200 p-5">
                <span className="w-10 h-10 rounded-[11px] bg-dga-green/10 text-dga-green-400 grid place-items-center mb-3">
                  <Upload size={19} />
                </span>
                <p className="text-[13.5px] font-bold text-ink">استيراد من Excel</p>
                <p className="text-[12.5px] text-n500 mt-1.5 leading-relaxed">
                  يُدمج المستورد مع الهيكل الحالي: السجلات الجديدة تُضاف، والموجودة تُحدَّث بمطابقة
                  الرمز.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xlsm"
                  className="hidden"
                  onChange={onImport}
                />
                <Button
                  className="mt-4 w-full"
                  variant="primary"
                  disabled={importing}
                  onClick={() => fileRef.current?.click()}
                >
                  {importing ? "جارٍ الاستيراد…" : "اختيار ملف Excel"}
                </Button>
              </div>

              <div className="rounded-[12px] border border-n200 p-5">
                <span className="w-10 h-10 rounded-[11px] bg-dga-purple/10 text-dga-purple grid place-items-center mb-3">
                  <FileSpreadsheet size={19} />
                </span>
                <p className="text-[13.5px] font-bold text-ink">تصدير الهيكل الكامل</p>
                <p className="text-[12.5px] text-n500 mt-1.5 leading-relaxed">
                  تسع أوراق تشمل الملخص التنفيذي والركائز والأهداف والمبادرات والمشاريع والمعالم
                  والمؤشرات وقراءاتها والميزانية.
                </p>
                <Button className="mt-4 w-full" onClick={() => exportFullXlsx(data)}>
                  تصدير XLSX
                </Button>
              </div>
            </div>

            {result ? (
              <div className="rounded-[12px] border border-n200 overflow-hidden">
                <div className="px-5 py-3.5 bg-n50 border-b border-n200">
                  <p className="text-[13px] font-bold text-ink">نتيجة آخر عملية استيراد</p>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(result.counts).map(([k, v]) => (
                      <Chip key={k}>
                        {k}: {v}
                      </Chip>
                    ))}
                  </div>
                  {result.errors.length ? (
                    <div className="rounded-[10px] border border-dga-orange/35 bg-dga-orange/5 p-4">
                      <p className="flex items-center gap-2 text-[12.5px] font-bold text-warn-text mb-2">
                        <AlertTriangle size={15} />
                        {result.errors.length} صفاً تم تخطيه
                      </p>
                      <ul className="space-y-1.5">
                        {result.errors.slice(0, 12).map((e, i) => (
                          <li key={i} className="text-[12px] text-n700 leading-relaxed">
                            · {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-dga-green-400 font-semibold">
                      اكتمل الاستيراد دون أخطاء.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            <div className="rounded-[12px] border border-dga-red/25 bg-dga-red/[0.03] p-5">
              <p className="flex items-center gap-2 text-[13.5px] font-bold text-dga-red">
                <AlertTriangle size={16} />
                إعادة تعيين البيانات
              </p>
              <p className="text-[12.5px] text-n700 mt-2 leading-relaxed max-w-2xl">
                تُحفظ بيانات المنصة في متصفحك. إعادة التعيين تمحو كل التعديلات والإدخالات المسجلة
                محلياً ولا يمكن التراجع عنها. صدّر نسخة XLSX قبل المتابعة.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <Button variant="secondary" onClick={() => setConfirmReset("seed")}>
                  <RotateCcw size={15} />
                  استعادة البيانات التجريبية
                </Button>
                <Button variant="danger" onClick={() => setConfirmReset("empty")}>
                  <Trash2 size={15} />
                  تفريغ المنصة بالكامل
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      {/* ------------------------------------------------------------ النوافذ */}
      <Modal
        open={!!userModal}
        onClose={() => setUserModal(null)}
        title={userModal === "new" ? "مستخدم جديد" : "تعديل بيانات المستخدم"}
        subtitle="يحدد الدور نطاق ما يراه المستخدم وما يستطيع تحديثه"
        footer={
          <>
            <Button variant="primary" onClick={saveUser} disabled={!form.name}>
              <Save size={15} />
              حفظ
            </Button>
            <Button variant="ghost" onClick={() => setUserModal(null)}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الاسم" required className="sm:col-span-2">
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="الدور" required>
            <Select
              value={form.role ?? "owner"}
              onChange={(v) => setForm({ ...form, role: v })}
              options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
            />
          </Field>
          <Field label="المسمى الوظيفي">
            <Input value={form.jobTitle ?? ""} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          </Field>
          <Field label="الإدارة">
            <Input value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </Field>
          <Field label="الحالة" className="sm:col-span-2">
            <Select
              value={form.active ?? "true"}
              onChange={(v) => setForm({ ...form, active: v })}
              options={[
                { value: "true", label: "نشط" },
                { value: "false", label: "معطّل" },
              ]}
            />
          </Field>
        </div>
        {form.role ? (
          <p className="text-[12.5px] text-n700 mt-4 rounded-[10px] border border-n200 bg-n50 p-3.5 leading-relaxed">
            <Settings2 size={14} className="inline -mt-0.5 ms-1" /> {ROLE_SUMMARY[form.role as Role]}
          </p>
        ) : null}
      </Modal>

      <Modal
        open={!!confirmReset}
        onClose={() => setConfirmReset(null)}
        title={confirmReset === "empty" ? "تفريغ المنصة بالكامل" : "استعادة البيانات التجريبية"}
        width="max-w-lg"
        footer={
          <>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmReset === "empty") resetToEmpty();
                else resetToSeed();
                setConfirmReset(null);
                setToast(
                  confirmReset === "empty" ? "تم تفريغ المنصة" : "تمت استعادة البيانات التجريبية",
                );
              }}
            >
              نعم، تابع
            </Button>
            <Button variant="ghost" onClick={() => setConfirmReset(null)}>
              إلغاء
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-n700 leading-[1.9]">
          {confirmReset === "empty"
            ? "سيُحذف الهيكل الاستراتيجي بالكامل مع كل المبادرات والمشاريع والمؤشرات وقراءاتها والإشعارات، وتبدأ المنصة فارغة. لا يمكن التراجع عن هذا الإجراء."
            : "ستُستبدل كل البيانات الحالية بالبيانات التجريبية الأصلية، وتُفقد كل الإدخالات والتعديلات التي أُجريت. لا يمكن التراجع عن هذا الإجراء."}
        </p>
      </Modal>

      {toast ? <Toast message={toast} onDone={() => setToast("")} /> : null}
    </>
  );
}
