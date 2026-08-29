"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Bell,
  Building2,
  ChevronLeft,
  Coins,
  FileBarChart,
  Gauge,
  Grid3x3,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Network,
  Radar,
  Settings2,
  Sun,
  Target,
  X,
} from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { useTheme } from "@/components/ThemeProvider";
import type { ThemeMode } from "@/components/ThemeProvider";
import { unreadFor, useStore } from "@/lib/store";
import { ROLE_SHORT } from "@/lib/types";
import { initials } from "@/lib/format";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  adminOnly?: boolean;
}

const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: "المتابعة",
    items: [
      { href: "/dashboard", label: "لوحة القيادة", icon: LayoutDashboard },
      { href: "/heatmap", label: "الخريطة الحرارية", icon: Grid3x3 },
      { href: "/maturity", label: "رادار النضج الرقمي", icon: Radar },
      { href: "/qiyas", label: "إطار قياس التحول الرقمي", icon: Gauge },
    ],
  },
  {
    group: "الهيكل الاستراتيجي",
    items: [
      { href: "/strategy", label: "الركائز والأهداف", icon: Network },
      { href: "/initiatives", label: "المبادرات", icon: Target },
      { href: "/projects", label: "المشاريع والمعالم", icon: ListChecks },
      { href: "/kpis", label: "مؤشرات الأداء", icon: Building2 },
    ],
  },
  {
    group: "التقارير والإدارة",
    items: [
      { href: "/budget", label: "متابعة الميزانية", icon: Coins },
      { href: "/reports", label: "التقارير التنفيذية", icon: FileBarChart },
      { href: "/notifications", label: "الإشعارات", icon: Bell },
      { href: "/admin", label: "إدارة المنصة", icon: Settings2, adminOnly: true },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const data = useStore((s) => s.data);
  const currentUserId = useStore((s) => s.currentUserId);
  const logout = useStore((s) => s.logout);

  const user = useMemo(
    () => data.users.find((u) => u.id === currentUserId) ?? null,
    [data.users, currentUserId],
  );

  useEffect(() => {
    // zustand/persist يعيد الحالة بعد أول رسم — ننتظر ذلك قبل الحكم على الجلسة
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!data.settings.onboarded) router.replace("/setup");
    else if (!currentUserId) router.replace("/");
  }, [ready, currentUserId, data.settings.onboarded, router]);

  useEffect(() => setOpen(false), [pathname]);

  const unread = user ? unreadFor(data, user).length : 0;

  if (!ready || !user) {
    return (
      <div className="min-h-dvh grid place-items-center bg-n50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-[3px] border-n200 border-t-brand-text animate-spin" />
          <p className="text-[13px] text-n500 font-semibold">جارٍ تحميل المنصة…</p>
        </div>
      </div>
    );
  }

  const nav = (
    <nav className="app-nav flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {NAV.map((g) => {
        const items = g.items.filter((i) => !i.adminOnly || user.role === "admin");
        if (!items.length) return null;
        return (
          <div key={g.group}>
            <p className="px-3 mb-2 text-[11px] font-bold tracking-wide text-n500/80 uppercase">
              {g.group}
            </p>
            <ul className="space-y-0.5">
              {items.map((it) => {
                const active = pathname === it.href || pathname.startsWith(it.href + "/");
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={clsx(
                        "group flex items-center gap-3 rounded-[10px] px-3 h-10 text-[13.5px] font-semibold transition-colors",
                        active
                          ? "bg-brand-solid text-white"
                          : "text-n700 hover:bg-n100 hover:text-ink",
                      )}
                    >
                      <Icon size={17} strokeWidth={2} />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.href === "/notifications" && unread > 0 ? (
                        <span className="shrink-0 min-w-[20px] h-5 px-1.5 grid place-items-center rounded-full bg-dga-red text-white text-[11px] font-bold tnum">
                          {unread}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-n50">
      {/* ---------------------------------------------------------- Sidebar */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden lg:flex w-[268px] flex-col bg-surface border-e border-n200">
        <div className="px-5 py-4 border-b border-n100">
          <Link href="/dashboard" className="flex items-center gap-3">
            <BrandMark size={36} />
            <span className="min-w-0">
              <span className="block text-[12.5px] font-bold text-ink leading-snug">
                نظام إدارة استراتيجية التحول الرقمي
              </span>
              <span className="block text-[11.5px] text-n500 truncate">
                {data.settings.entityName}
              </span>
            </span>
          </Link>
        </div>
        {nav}
        <UserCard user={user} onLogout={() => { logout(); router.replace("/"); }} />
      </aside>

      {/* ------------------------------------------------------ Mobile drawer */}
      {open ? (
        <div className="lg:hidden fixed inset-0 z-50 no-print">
          <div className="absolute inset-0 bg-[var(--scrim)]" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-[280px] bg-surface flex flex-col animate-in">
            <div className="flex items-center justify-between px-4 py-4 border-b border-n100">
              <span className="flex items-center gap-2.5">
                <BrandMark size={30} />
                <span className="text-[12.5px] font-bold leading-snug">نظام إدارة استراتيجية التحول الرقمي</span>
              </span>
              <button onClick={() => setOpen(false)} aria-label="إغلاق" className="p-1.5 rounded-lg hover:bg-n100">
                <X size={18} />
              </button>
            </div>
            {nav}
            <UserCard user={user} onLogout={() => { logout(); router.replace("/"); }} />
          </aside>
        </div>
      ) : null}

      {/* ------------------------------------------------------------- Main */}
      <div className="lg:ms-[268px] flex flex-col min-h-dvh">
        <header className="app-header sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-n200">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden p-2 -ms-2 rounded-[10px] text-n700 hover:bg-n100"
              aria-label="القائمة"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-ink truncate">{data.settings.strategyName}</p>
              <p className="text-[11.5px] text-n500 truncate">
                الفترة الحالية: الربع {data.settings.currentQuarter} · {data.settings.currentYear}
              </p>
            </div>
            <ThemeToggle />
            <Link
              href="/notifications"
              className="relative p-2 rounded-[10px] text-n700 hover:bg-n100 transition-colors"
              aria-label="الإشعارات"
            >
              <Bell size={19} />
              {unread > 0 ? (
                <span className="absolute top-1 end-1 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-dga-red text-white text-[10px] font-bold tnum">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <span className="hidden sm:flex items-center gap-2.5 ps-3 border-s border-n200">
              <span className="w-8 h-8 rounded-full bg-brand-solid text-white grid place-items-center text-[12px] font-bold">
                {initials(user.name)}
              </span>
              <span className="leading-tight">
                <span className="block text-[12.5px] font-bold text-ink">{user.name}</span>
                <span className="block text-[11px] text-n500">{ROLE_SHORT[user.role]}</span>
              </span>
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6 print-area">{children}</main>

        <footer className="no-print px-6 py-4 border-t border-n200 bg-surface">
          <p className="text-[11.5px] text-n500 text-center leading-relaxed">
            نظام إدارة استراتيجية التحول الرقمي · مبنية على هوية الهيئة الرقمية وكود المنصات
            السعودي · البيانات المعروضة تجريبية لأغراض العرض
          </p>
        </footer>
      </div>
    </div>
  );
}

const THEME_OPTIONS: Array<{ id: ThemeMode; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: "light", label: "فاتح", icon: Sun },
  { id: "dark", label: "داكن", icon: Moon },
  { id: "system", label: "تلقائي", icon: Monitor },
];

function ThemeToggle() {
  const { mode, theme, setMode } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-[10px] text-n700 hover:bg-n100 transition-colors"
        aria-label="وضع العرض"
        title={`وضع العرض: ${THEME_OPTIONS.find((o) => o.id === mode)?.label}`}
      >
        {theme === "dark" ? <Moon size={19} /> : <Sun size={19} />}
      </button>

      {open ? (
        <div className="absolute end-0 top-full mt-1.5 z-50 w-40 rounded-[12px] border border-n200 bg-surface shadow-pop p-1.5 animate-in">
          {THEME_OPTIONS.map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.id}
                onClick={() => {
                  setMode(o.id);
                  setOpen(false);
                }}
                className={clsx(
                  "w-full flex items-center gap-2.5 rounded-[8px] px-3 h-9 text-[13px] font-semibold transition-colors",
                  mode === o.id ? "bg-brand-solid text-white" : "text-n700 hover:bg-n100",
                )}
              >
                <Icon size={15} />
                {o.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function UserCard({
  user,
  onLogout,
}: {
  user: { name: string; role: keyof typeof ROLE_SHORT; jobTitle: string };
  onLogout: () => void;
}) {
  return (
    <div className="border-t border-n100 p-3">
      <div className="flex items-center gap-3 rounded-[10px] bg-n50 p-3">
        <span className="w-9 h-9 shrink-0 rounded-full bg-brand-solid text-white grid place-items-center text-[12.5px] font-bold">
          {initials(user.name)}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[12.5px] font-bold text-ink truncate">{user.name}</span>
          <span className="block text-[11px] text-n500 truncate">{ROLE_SHORT[user.role]}</span>
        </span>
        <button
          onClick={onLogout}
          title="تسجيل الخروج"
          aria-label="تسجيل الخروج"
          className="shrink-0 p-2 rounded-[8px] text-n500 hover:bg-surface hover:text-dga-red transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="flex items-center gap-1.5 mb-4 text-[12.5px] text-n500 no-print flex-wrap">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 ? <ChevronLeft size={13} className="text-n300" /> : null}
          {it.href ? (
            <Link href={it.href} className="hover:text-brand-text font-semibold transition-colors">
              {it.label}
            </Link>
          ) : (
            <span className="text-n700 font-semibold">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
