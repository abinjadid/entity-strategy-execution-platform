"use client";

// =============================================================================
// معالج الإعداد الأول — يظهر عند أول تشغيل للنظام في أي جهة.
// يجمع هوية الجهة (الاسم والشعار) وبيانات الاستراتيجية وحدود التقييم،
// ثم يطبّقها على كل واجهات النظام.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarRange,
  Check,
  Database,
  Gauge,
  ImagePlus,
  Trash2,
} from "lucide-react";

import { Button, Field, Input, Select } from "@/components/ui";
import { useStore } from "@/lib/store";

const MAX_LOGO_BYTES = 3 * 1024 * 1024;
const LOGO_MAX_PX = 320;

type StepId = 1 | 2 | 3 | 4;

const STEPS: Array<{ id: StepId; title: string; hint: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: 1, title: "هوية الجهة", hint: "الاسم والشعار", icon: Building2 },
  { id: 2, title: "الاستراتيجية", hint: "الاسم والمدى الزمني", icon: CalendarRange },
  { id: 3, title: "حدود التقييم", hint: "نظام RAG", icon: Gauge },
  { id: 4, title: "البيانات", hint: "نقطة البداية", icon: Database },
];

/** يصغّر الشعار قبل حفظه لتخفيف حجم التخزين المحلي */
function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const src = String(reader.result);
      const img = new window.Image();
      img.onerror = () => resolve(src);
      img.onload = () => {
        const scale = Math.min(1, LOGO_MAX_PX / Math.max(img.width, img.height));
        if (scale >= 1 && src.length < 120_000) return resolve(src);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(src);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export default function SetupPage() {
  const router = useRouter();
  const data = useStore((s) => s.data);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetToEmpty = useStore((s) => s.resetToEmpty);
  const resetToSeed = useStore((s) => s.resetToSeed);

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<StepId>(1);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const thisYear = new Date().getFullYear();
  const [form, setForm] = useState({
    entityName: "",
    logoDataUrl: "",
    strategyName: "استراتيجية التحول الرقمي",
    strategyStartYear: String(thisYear),
    strategyEndYear: String(thisYear + 3),
    currentYear: String(thisYear),
    currentQuarter: String(Math.floor(new Date().getMonth() / 3) + 1),
    ragGreen: "95",
    ragAmber: "80",
  });
  const [dataChoice, setDataChoice] = useState<"demo" | "empty">("empty");

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  // إن كانت التهيئة مكتملة سلفاً ننتقل مباشرة إلى شاشة الدخول
  useEffect(() => {
    if (ready && data.settings.onboarded) router.replace("/");
  }, [ready, data.settings.onboarded, router]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("الملف المرفوع ليس صورة. الصيغ المقبولة: PNG أو SVG أو JPG.");
      return;
    }
    if (f.size > MAX_LOGO_BYTES) {
      setError("حجم الشعار يتجاوز 3 ميجابايت — يرجى رفع نسخة أصغر.");
      return;
    }
    try {
      set("logoDataUrl", await shrinkImage(f));
      setError("");
    } catch {
      setError("تعذّرت قراءة ملف الشعار. جرّب صيغة أخرى.");
    }
  };

  const canNext =
    step === 1
      ? form.entityName.trim().length >= 2
      : step === 2
        ? form.strategyName.trim().length >= 2 &&
          Number(form.strategyEndYear) >= Number(form.strategyStartYear)
        : step === 3
          ? Number(form.ragGreen) > Number(form.ragAmber) && Number(form.ragAmber) > 0
          : true;

  const finish = () => {
    // إعادة التعيين تستبدل الإعدادات، لذا تُطبَّق هوية الجهة بعدها
    if (dataChoice === "empty") resetToEmpty();
    else resetToSeed();

    // مع البيانات التجريبية نُبقي الفترة الزمنية الأصلية (2024–2027) حتى تظهر
    // القراءات الربعية المرفقة بها؛ ومع الهيكل الفارغ نعتمد فترة الجهة.
    const period =
      dataChoice === "demo"
        ? {}
        : {
            strategyStartYear: Number(form.strategyStartYear),
            strategyEndYear: Number(form.strategyEndYear),
            currentYear: Number(form.currentYear),
            currentQuarter: Number(form.currentQuarter) as 1 | 2 | 3 | 4,
          };

    updateSettings({
      onboarded: true,
      entityName: form.entityName.trim(),
      logoDataUrl: form.logoDataUrl,
      strategyName: form.strategyName.trim(),
      ragGreen: Number(form.ragGreen),
      ragAmber: Number(form.ragAmber),
      ...period,
    });
    router.replace("/");
  };

  if (!ready) {
    return (
      <div className="min-h-dvh grid place-items-center bg-n50">
        <div className="w-10 h-10 rounded-full border-[3px] border-n200 border-t-dga-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-n50 flex flex-col">
      {/* ------------------------------------------------------------ ترويسة */}
      <header
        className="text-white px-5 sm:px-10 py-8"
        style={{ background: "linear-gradient(160deg,#2a206a 0%,#1c1554 55%,#0f0b31 100%)" }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-[12.5px] text-white/60">التهيئة الأولى</p>
          <h1 className="text-[26px] sm:text-[30px] font-bold mt-1.5 leading-tight">
            نظام إدارة استراتيجية التحول الرقمي
          </h1>
          <p className="text-[13.5px] text-white/70 mt-3 leading-relaxed max-w-xl">
            قبل البدء، عرّف النظام بجهتك واستراتيجيتها. تُطبَّق هذه البيانات على كل الشاشات
            والتقارير، ويمكن تعديلها لاحقاً من شاشة «إدارة المنصة».
          </p>
        </div>
      </header>

      {/* ------------------------------------------------------ شريط الخطوات */}
      <div className="bg-surface border-b border-n200">
        <ol className="max-w-3xl mx-auto px-5 sm:px-10 py-4 flex items-center gap-2 sm:gap-4 overflow-x-auto">
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            const Icon = s.icon;
            return (
              <li key={s.id} className="flex items-center gap-2 sm:gap-4 shrink-0">
                <button
                  onClick={() => (s.id < step ? setStep(s.id) : undefined)}
                  disabled={s.id > step}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 transition-colors",
                    s.id < step && "hover:bg-n100 cursor-pointer",
                    s.id > step && "cursor-default",
                  )}
                >
                  <span
                    className={clsx(
                      "w-8 h-8 rounded-[9px] grid place-items-center shrink-0 transition-colors",
                      done && "bg-dga-green text-white",
                      active && "bg-brand-solid text-white",
                      !done && !active && "bg-n100 text-n500",
                    )}
                  >
                    {done ? <Check size={16} /> : <Icon size={16} />}
                  </span>
                  <span className="text-start hidden sm:block">
                    <span
                      className={clsx(
                        "block text-[12.5px] font-bold leading-tight",
                        active ? "text-ink" : "text-n500",
                      )}
                    >
                      {s.title}
                    </span>
                    <span className="block text-[11px] text-n500">{s.hint}</span>
                  </span>
                </button>
                {i < STEPS.length - 1 ? (
                  <span className={clsx("h-px w-5 sm:w-10", step > s.id ? "bg-dga-green" : "bg-n200")} />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      {/* -------------------------------------------------------- محتوى الخطوة */}
      <main className="flex-1 px-5 sm:px-10 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-surface border border-n200 rounded-[16px] shadow-card p-6 sm:p-8 animate-in">
            {step === 1 ? (
              <>
                <h2 className="text-[18px] font-bold text-ink">هوية الجهة</h2>
                <p className="text-[13px] text-n500 mt-1.5 leading-relaxed">
                  يظهر اسم الجهة وشعارها في القائمة الجانبية وشاشة الدخول وترويسة كل تقرير
                  تنفيذي يُصدَّر من النظام.
                </p>

                <div className="mt-6 space-y-5">
                  <Field label="اسم الجهة" required hint="كما يُكتب رسمياً في المخاطبات والتقارير">
                    <Input
                      value={form.entityName}
                      onChange={(e) => set("entityName", e.target.value)}
                      placeholder="مثال: وزارة …، هيئة …، أمانة …"
                      autoFocus
                    />
                  </Field>

                  <div>
                    <span className="block text-[13px] font-semibold text-n700 mb-2">شعار الجهة</span>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="w-24 h-24 rounded-[14px] border border-n200 bg-n50 grid place-items-center overflow-hidden shrink-0">
                        {form.logoDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={form.logoDataUrl}
                            alt="شعار الجهة"
                            className="max-w-[80%] max-h-[80%] object-contain"
                          />
                        ) : (
                          <ImagePlus size={26} className="text-n300" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/png,image/svg+xml,image/jpeg,image/webp"
                          className="hidden"
                          onChange={onLogo}
                        />
                        <Button onClick={() => fileRef.current?.click()}>
                          <ImagePlus size={15} />
                          {form.logoDataUrl ? "استبدال الشعار" : "رفع الشعار"}
                        </Button>
                        {form.logoDataUrl ? (
                          <Button variant="ghost" size="sm" onClick={() => set("logoDataUrl", "")}>
                            <Trash2 size={14} />
                            إزالة
                          </Button>
                        ) : null}
                        <p className="text-[11.5px] text-n500 leading-relaxed max-w-xs">
                          PNG أو SVG بخلفية شفافة، حتى 3 ميجابايت. يُصغَّر الشعار تلقائياً.
                          إن تُرك فارغاً يُستخدم شعار الهيئة الرقمية.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h2 className="text-[18px] font-bold text-ink">الاستراتيجية والفترة</h2>
                <p className="text-[13px] text-n500 mt-1.5 leading-relaxed">
                  يحدد المدى الزمني الأرباع المتاحة لإدخال قراءات المؤشرات، وتحدد الفترة الحالية
                  ما تعرضه لوحة القيادة افتراضياً.
                </p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Field label="اسم الاستراتيجية" required className="sm:col-span-2">
                    <Input
                      value={form.strategyName}
                      onChange={(e) => set("strategyName", e.target.value)}
                      placeholder="مثال: استراتيجية التحول الرقمي 2026 – 2029"
                    />
                  </Field>
                  <Field label="سنة البداية" required>
                    <Input
                      type="number"
                      value={form.strategyStartYear}
                      onChange={(e) => set("strategyStartYear", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="سنة النهاية"
                    required
                    error={
                      Number(form.strategyEndYear) < Number(form.strategyStartYear)
                        ? "سنة النهاية يجب أن تساوي سنة البداية أو تزيد عنها"
                        : undefined
                    }
                  >
                    <Input
                      type="number"
                      value={form.strategyEndYear}
                      onChange={(e) => set("strategyEndYear", e.target.value)}
                    />
                  </Field>
                  <Field label="سنة الرصد الحالية" required>
                    <Input
                      type="number"
                      value={form.currentYear}
                      onChange={(e) => set("currentYear", e.target.value)}
                    />
                  </Field>
                  <Field label="الربع الحالي" required>
                    <Select
                      value={form.currentQuarter}
                      onChange={(v) => set("currentQuarter", v)}
                      options={[1, 2, 3, 4].map((q) => ({ value: String(q), label: `الربع ${q}` }))}
                    />
                  </Field>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h2 className="text-[18px] font-bold text-ink">حدود التقييم — نظام RAG</h2>
                <p className="text-[13px] text-n500 mt-1.5 leading-relaxed">
                  تُحتسب نسبة تحقق المؤشر من خط الأساس مقارنة بمستهدف الفترة، ثم تُصنَّف وفق
                  الحدين أدناه. القيم الافتراضية متحفظة ومناسبة لأغلب الجهات.
                </p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Field label="حد اللون الأخضر %" required hint="نسبة التحقق التي يُعتبر عندها المؤشر ضمن المستهدف">
                    <Input
                      type="number"
                      value={form.ragGreen}
                      onChange={(e) => set("ragGreen", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="حد اللون الأصفر %"
                    required
                    hint="ما دونه يُصنَّف المؤشر أحمر"
                    error={
                      Number(form.ragGreen) <= Number(form.ragAmber)
                        ? "حد الأخضر يجب أن يزيد عن حد الأصفر"
                        : undefined
                    }
                  >
                    <Input
                      type="number"
                      value={form.ragAmber}
                      onChange={(e) => set("ragAmber", e.target.value)}
                    />
                  </Field>
                </div>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-dga-green/30 bg-dga-green/12 px-3 py-1 text-[12.5px] font-semibold text-dga-green-400">
                    <span className="w-2 h-2 rounded-full bg-dga-green" />
                    أخضر · {form.ragGreen}% فأكثر
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-dga-orange/35 bg-dga-orange/12 px-3 py-1 text-[12.5px] font-semibold text-warn-text">
                    <span className="w-2 h-2 rounded-full bg-dga-orange" />
                    أصفر · {form.ragAmber}% فأكثر
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-dga-red/30 bg-dga-red/10 px-3 py-1 text-[12.5px] font-semibold text-dga-red">
                    <span className="w-2 h-2 rounded-full bg-dga-red" />
                    أحمر · أقل من {form.ragAmber}%
                  </span>
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <h2 className="text-[18px] font-bold text-ink">نقطة البداية</h2>
                <p className="text-[13px] text-n500 mt-1.5 leading-relaxed">
                  اختر ما إذا كنت تريد البدء بهيكل فارغ تبنيه بنفسك، أو باستعراض بيانات تجريبية
                  كاملة لفهم النظام قبل إدخال بياناتك.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      id: "empty" as const,
                      title: "هيكل فارغ",
                      body: "تبدأ من الصفر: تضيف الركائز والأهداف والمبادرات والمشاريع والمؤشرات، أو تستوردها دفعة واحدة من قالب Excel.",
                      tag: "موصى به للاستخدام الفعلي",
                    },
                    {
                      id: "demo" as const,
                      title: "بيانات تجريبية كاملة",
                      body: "جهة افتراضية باستراتيجية 2024–2027: 5 ركائز، 15 مبادرة، 43 مشروعاً، 27 مؤشراً بقراءات ربعية — لاستكشاف كل الشاشات. تُعتمد فترتها الزمنية بدل الفترة أعلاه حتى تظهر القراءات.",
                      tag: "للاستعراض والتدريب",
                    },
                  ].map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setDataChoice(o.id)}
                      className={clsx(
                        "text-start rounded-[14px] border p-5 transition-colors",
                        dataChoice === o.id
                          ? "border-brand-text bg-n50"
                          : "border-n200 hover:border-n300",
                      )}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-[14px] font-bold text-ink">{o.title}</span>
                        <span
                          className={clsx(
                            "w-5 h-5 rounded-full border-2 grid place-items-center shrink-0",
                            dataChoice === o.id ? "border-brand-text" : "border-n300",
                          )}
                        >
                          {dataChoice === o.id ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-brand-solid" />
                          ) : null}
                        </span>
                      </span>
                      <span className="block text-[12.5px] text-n500 mt-2 leading-relaxed">{o.body}</span>
                      <span className="inline-block mt-3 rounded-full bg-n100 px-2.5 py-0.5 text-[11.5px] font-semibold text-n700">
                        {o.tag}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-6 rounded-[12px] border border-n200 bg-n50 p-4">
                  <p className="text-[12.5px] font-bold text-ink mb-2">ملخص التهيئة</p>
                  <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 text-[12.5px]">
                    {[
                      ["الجهة", form.entityName || "—"],
                      ["الشعار", form.logoDataUrl ? "مرفوع" : "شعار الهيئة الرقمية"],
                      ["الاستراتيجية", form.strategyName || "—"],
                      ["المدى", `${form.strategyStartYear} – ${form.strategyEndYear}`],
                      ["الفترة الحالية", `الربع ${form.currentQuarter} · ${form.currentYear}`],
                      ["حدود RAG", `أخضر ≥ ${form.ragGreen}% · أصفر ≥ ${form.ragAmber}%`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-3">
                        <dt className="text-n500">{k}</dt>
                        <dd className="font-semibold text-ink text-end truncate">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </>
            ) : null}

            {error ? (
              <p className="mt-5 rounded-[10px] border border-dga-red/30 bg-dga-red/10 px-4 py-3 text-[12.5px] text-dga-red">
                {error}
              </p>
            ) : null}
          </div>

          {/* ------------------------------------------------------ التنقل */}
          <div className="flex items-center justify-between gap-3 mt-6">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as StepId) : s))}
              disabled={step === 1}
            >
              <ArrowRight size={16} />
              السابق
            </Button>

            <span className="text-[12.5px] text-n500 tnum">
              الخطوة {step} من {STEPS.length}
            </span>

            {step < 4 ? (
              <Button
                variant="primary"
                disabled={!canNext}
                onClick={() => setStep((s) => (s + 1) as StepId)}
              >
                التالي
                <ArrowLeft size={16} />
              </Button>
            ) : (
              <Button variant="primary" onClick={finish}>
                <Check size={16} />
                بدء استخدام النظام
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
