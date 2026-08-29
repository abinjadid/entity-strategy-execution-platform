"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowLeft, ShieldCheck, Eye, ClipboardList, UserCog } from "lucide-react";

import { useStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/types";
import type { Role, User } from "@/lib/types";
import { ROLE_SUMMARY } from "@/lib/rbac";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui";

const ROLE_ICON: Record<Role, React.ComponentType<{ size?: number }>> = {
  admin: UserCog,
  pmo: ClipboardList,
  owner: ShieldCheck,
  viewer: Eye,
};

const ROLE_ACCENT: Record<Role, string> = {
  admin: "#2a206a",
  pmo: "#1d9af2",
  owner: "#1cc182",
  viewer: "#852cd0",
};

const ORDER: Role[] = ["admin", "pmo", "owner", "viewer"];

export default function LoginPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<string>("");

  const data = useStore((s) => s.data);
  const currentUserId = useStore((s) => s.currentUserId);
  const login = useStore((s) => s.login);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready && currentUserId) router.replace("/dashboard");
  }, [ready, currentUserId, router]);

  const byRole = useMemo(() => {
    const map: Record<Role, User[]> = { admin: [], pmo: [], owner: [], viewer: [] };
    data.users.filter((u) => u.active).forEach((u) => map[u.role].push(u));
    return map;
  }, [data.users]);

  const enter = (id: string) => {
    login(id);
    router.push("/dashboard");
  };

  if (!ready) {
    return (
      <div className="min-h-dvh grid place-items-center bg-n50">
        <div className="w-10 h-10 rounded-full border-[3px] border-n200 border-t-dga-navy animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.05fr_1fr]">
      {/* ------------------------------------------------ اللوحة التعريفية */}
      <div
        className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden"
        style={{ background: "linear-gradient(160deg,#2a206a 0%,#1c1554 45%,#0f0b31 100%)" }}
      >
        <BrandLines />
        <div className="relative z-10">
          <Image
            src="/brand/dga-logo.png"
            alt="الهيئة الرقمية"
            width={190}
            height={54}
            className="object-contain brightness-0 invert opacity-95"
          />
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-[38px] font-bold leading-[1.2]">
            منصة رصد تنفيذ استراتيجية التحول الرقمي
          </h1>
          <p className="mt-5 text-[15px] leading-[1.85] text-white/75">
            كثير من الجهات الحكومية تملك استراتيجية تحول رقمي متكاملة دون أداة تربط المبادرات
            بالمشاريع بمؤشرات الأداء. هذه المنصة تغلق تلك الفجوة: هيكل مرن من الركائز حتى المعالم،
            وإدخال ميداني حقيقي من ملاك المبادرات، ولوحة قيادة تعكس الأثر لحظة بلحظة.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "ركائز · أهداف · مؤشرات · مبادرات · مشاريع · معالم",
              "خريطة حرارية للمؤشرات بنظام RAG ورادار للنضج الرقمي",
              "نظام صلاحيات بأربعة أدوار وإشعارات فورية عند كل تحديث",
              "توافق مع إطار قياس التحول الرقمي بمناظيره العشرة",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 text-[13.5px] text-white/85">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-dga-green shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[12px] text-white/45">
          البيانات المعروضة تجريبية لأغراض العرض والتقييم.
        </p>
      </div>

      {/* ---------------------------------------------------- اختيار الدور */}
      <div className="flex flex-col justify-center px-5 sm:px-10 lg:px-14 py-10 bg-white">
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <Image src="/brand/dga-emblem.png" alt="" width={40} height={40} />
          <div>
            <p className="text-[15px] font-bold text-ink leading-tight">منصة رصد تنفيذ الاستراتيجية</p>
            <p className="text-[12px] text-n500">{data.settings.entityName}</p>
          </div>
        </div>

        <h2 className="text-[22px] font-bold text-ink">الدخول إلى المنصة</h2>
        <p className="text-[13.5px] text-n500 mt-2 leading-relaxed">
          اختر الدور الذي تريد استعراض المنصة به. تختلف الصلاحيات وشاشات الإدخال باختلاف الدور،
          ويمكن تبديل الدور في أي وقت من أيقونة الخروج.
        </p>

        <div className="mt-7 space-y-3">
          {ORDER.map((role) => {
            const users = byRole[role];
            if (!users.length) return null;
            const Icon = ROLE_ICON[role];
            const accent = ROLE_ACCENT[role];
            const isOpen = selected === role;
            return (
              <div
                key={role}
                className={clsx(
                  "border rounded-[14px] transition-colors",
                  isOpen ? "border-dga-navy bg-n50" : "border-n200 hover:border-n300",
                )}
              >
                <button
                  onClick={() => setSelected(isOpen ? "" : role)}
                  className="w-full flex items-start gap-3.5 p-4 text-start"
                >
                  <span
                    className="shrink-0 w-10 h-10 rounded-[11px] grid place-items-center"
                    style={{ background: `${accent}14`, color: accent }}
                  >
                    <Icon size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-ink">{ROLE_LABELS[role]}</span>
                    <span className="block text-[12.5px] text-n500 mt-1 leading-relaxed">
                      {ROLE_SUMMARY[role]}
                    </span>
                  </span>
                  <ArrowLeft
                    size={17}
                    className={clsx(
                      "shrink-0 mt-2 text-n300 transition-transform",
                      isOpen && "-rotate-90",
                    )}
                  />
                </button>

                {isOpen ? (
                  <div className="px-4 pb-4 space-y-2 animate-in">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => enter(u.id)}
                        className="w-full flex items-center gap-3 rounded-[10px] border border-n200 bg-white p-3 text-start hover:border-dga-navy hover:shadow-card transition-all"
                      >
                        <span className="w-9 h-9 shrink-0 rounded-full bg-dga-navy text-white grid place-items-center text-[12px] font-bold">
                          {initials(u.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold text-ink truncate">{u.name}</span>
                          <span className="block text-[11.5px] text-n500 truncate">
                            {u.jobTitle} · {u.department}
                          </span>
                        </span>
                        <ArrowLeft size={15} className="shrink-0 text-n300" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-n100">
          <Button variant="primary" size="lg" className="w-full" onClick={() => enter("u1")}>
            الدخول السريع كمدير النظام
          </Button>
          <p className="text-[11.5px] text-n500 mt-3 text-center leading-relaxed">
            المنصة نموذج تشغيلي كامل. تُحفظ التعديلات في متصفحك ويمكن إعادة تعيينها من شاشة إدارة
            المنصة.
          </p>
        </div>
      </div>
    </div>
  );
}

/** خطوط وعُقد مستوحاة من النظام البصري للهوية — استخدام رقمي خفيف */
function BrandLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.16] pointer-events-none"
      viewBox="0 0 600 800"
      fill="none"
      aria-hidden
    >
      <g stroke="#3bc2ff" strokeWidth="1.1">
        <path d="M0 120 H180 L240 60 H420 L470 110 H600" />
        <path d="M0 300 H90 L150 240 H330 L390 300 H600" />
        <path d="M0 520 H210 L270 460 H450 L520 530 H600" />
        <path d="M0 690 H140 L200 630 H380 L440 690 H600" />
        <path d="M180 120 V300 M420 60 V240 M330 240 V460 M450 460 V630" />
      </g>
      <g fill="#1cc182">
        {[
          [180, 120],
          [240, 60],
          [420, 60],
          [470, 110],
          [150, 240],
          [330, 240],
          [390, 300],
          [270, 460],
          [450, 460],
          [520, 530],
          [200, 630],
          [380, 630],
          [440, 690],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="4" />
        ))}
      </g>
    </svg>
  );
}
