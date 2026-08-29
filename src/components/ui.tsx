"use client";

// =============================================================================
// عناصر واجهة أساسية مبنية على هوية DGA
// حواف معتدلة، حدود بسمك شعرة، ظلال منخفضة، حلقة تركيز بلون الكحلي المؤسسي.
// =============================================================================

import { X } from "lucide-react";
import clsx from "clsx";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { useAccent } from "@/components/ThemeProvider";
import { RAG_BG } from "@/lib/calc";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/types";
import type { Priority, Rag, Status } from "@/lib/types";

// ------------------------------------------------------------------- Card

export function Card({
  children,
  className,
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <As
      className={clsx(
        "bg-surface border border-n200 rounded-[16px] shadow-card print-block",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function CardHead({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-start justify-between gap-4 px-5 pt-5 pb-3 border-b border-n100",
        className,
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon ? (
          <span className="shrink-0 mt-0.5 w-9 h-9 rounded-[10px] bg-n100 text-brand-text grid place-items-center">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-ink leading-tight">{title}</h2>
          {subtitle ? <p className="text-[12.5px] text-n500 mt-1 leading-relaxed">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0 no-print">{action}</div> : null}
    </div>
  );
}

// ----------------------------------------------------------------- Button

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";

const BTN: Record<BtnVariant, string> = {
  primary: "bg-brand-solid text-white hover:brightness-110 active:brightness-95 border-transparent",
  secondary: "bg-surface text-brand-text border-n300 hover:bg-n50 active:bg-n100",
  ghost: "bg-transparent text-n700 border-transparent hover:bg-n100",
  danger: "bg-dga-red text-white hover:bg-[#a80000] border-transparent",
  subtle: "bg-n100 text-ink border-transparent hover:bg-n200",
};

export function Button({
  children,
  onClick,
  variant = "secondary",
  size = "md",
  disabled,
  type = "button",
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  title?: string;
}) {
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-[10px] border font-semibold transition-colors duration-150",
        "disabled:opacity-45 disabled:cursor-not-allowed",
        size === "sm" && "text-[12.5px] px-3 h-8",
        size === "md" && "text-[13.5px] px-4 h-10",
        size === "lg" && "text-[15px] px-6 h-12",
        BTN[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ Badge

export function RagBadge({ rag, label }: { rag: Rag; label?: string }) {
  const text =
    label ?? { green: "أخضر", amber: "أصفر", red: "أحمر", gray: "لا توجد قراءة" }[rag];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap",
        RAG_BG[rag],
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: { green: "#1cc182", amber: "#ffa300", red: "#c40000", gray: "#c3c1cc" }[rag],
        }}
      />
      {text}
    </span>
  );
}

const STATUS_STYLE: Record<Status, string> = {
  not_started: "bg-n100 text-n700 border-n200",
  in_progress: "bg-dga-blue/10 text-dga-blue-400 border-dga-blue/25",
  completed: "bg-dga-green/12 text-dga-green-400 border-dga-green/30",
  on_hold: "bg-dga-orange/12 text-warn-text border-dga-orange/35",
  cancelled: "bg-n100 text-n500 border-n200",
  delayed: "bg-dga-red/10 text-dga-red border-dga-red/30",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap",
        STATUS_STYLE[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_STYLE: Record<Priority, string> = {
  critical: "bg-dga-red/10 text-dga-red border-dga-red/25",
  high: "bg-dga-orange-deep/10 text-[#a13f00] border-dga-orange-deep/25",
  medium: "bg-dga-blue/10 text-dga-blue-400 border-dga-blue/25",
  low: "bg-n100 text-n700 border-n200",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap",
        PRIORITY_STYLE[priority],
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function Chip({
  children,
  color,
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  const accent = useAccent();
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border border-n200 bg-n50 px-2.5 py-0.5 text-[12px] font-semibold text-n700 whitespace-nowrap",
        className,
      )}
    >
      {color ? <span className="w-2 h-2 rounded-full" style={{ background: accent(color) }} /> : null}
      {children}
    </span>
  );
}

// ------------------------------------------------------------ Progress bar

export function ProgressBar({
  value,
  planned,
  color = "#2a206a",
  height = 8,
  showPlanned = true,
}: {
  value: number;
  planned?: number;
  color?: string;
  height?: number;
  showPlanned?: boolean;
}) {
  const accent = useAccent();
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative w-full rounded-full bg-n200 overflow-hidden" style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${v}%`, background: accent(color) }}
      />
      {showPlanned && planned !== undefined ? (
        <span
          className="absolute top-0 bottom-0 w-[2px] bg-[var(--scrim)]"
          style={{ right: `${Math.max(0, Math.min(100, planned))}%` }}
          title={`المخطط ${Math.round(planned)}%`}
        />
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ Fields

export function Field({
  label,
  hint,
  required,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="block text-[13px] font-semibold text-n700 mb-1.5">
        {label}
        {required ? <span className="text-dga-red mr-1">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="block text-[12px] text-dga-red mt-1.5">{error}</span>
      ) : hint ? (
        <span className="block text-[12px] text-n500 mt-1.5">{hint}</span>
      ) : null}
    </label>
  );
}

const INPUT_BASE =
  "w-full h-10 rounded-[10px] border border-n300 bg-surface px-3 text-[13.5px] text-ink placeholder:text-n300 outline-none transition-colors focus:border-brand-text disabled:bg-n100 disabled:text-n500";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(INPUT_BASE, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        INPUT_BASE,
        "h-auto min-h-[88px] py-2.5 leading-relaxed resize-y",
        props.className,
      )}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div className={clsx("relative", className)}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          "w-full rounded-[10px] border border-n300 bg-surface pe-3 ps-8 text-ink outline-none transition-colors focus:border-brand-text appearance-none disabled:bg-n100 disabled:text-n500",
          size === "sm" ? "h-9 text-[12.5px]" : "h-10 text-[13.5px]",
        )}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-n500"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

// ------------------------------------------------------------------- Modal

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8 no-print">
      <div className="fixed inset-0 bg-[var(--scrim)]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "relative w-full bg-surface rounded-[16px] shadow-pop border border-n200 animate-in my-auto",
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-n100">
          <div>
            <h3 className="text-[16px] font-bold text-ink">{title}</h3>
            {subtitle ? <p className="text-[12.5px] text-n500 mt-1">{subtitle}</p> : null}
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="shrink-0 w-8 h-8 grid place-items-center rounded-[8px] text-n500 hover:bg-n100 hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer ? (
          <div className="flex items-center justify-start gap-3 px-5 py-4 border-t border-n100 bg-n50 rounded-b-[16px]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// -------------------------------------------------------------- Empty state

export function EmptyState({
  title,
  body,
  icon,
  action,
}: {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="py-14 px-6 text-center">
      {icon ? <div className="mx-auto mb-3 text-n300 w-fit">{icon}</div> : null}
      <p className="text-[14px] font-bold text-n700">{title}</p>
      {body ? <p className="text-[13px] text-n500 mt-1.5 max-w-md mx-auto leading-relaxed">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

// --------------------------------------------------------------- Stat card

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "#2a206a",
  trend,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: string;
  trend?: { value: number; label?: string };
}) {
  const a = useAccent()(accent) ?? accent;
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-semibold text-n500 leading-snug">{label}</p>
        {icon ? (
          <span
            className="shrink-0 w-8 h-8 rounded-[9px] grid place-items-center"
            style={{ background: `${a}1f`, color: a }}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-[26px] font-bold text-ink leading-none tnum">{value}</p>
        {sub ? <p className="text-[12px] text-n500 mt-2 leading-snug">{sub}</p> : null}
        {trend ? (
          <p
            className={clsx(
              "text-[12px] font-semibold mt-2 tnum",
              trend.value >= 0 ? "text-dga-green-400" : "text-dga-red",
            )}
          >
            {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value).toFixed(1)}
            {trend.label ? ` ${trend.label}` : ""}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------- Table

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[720px] text-[13px] border-collapse">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
  width,
}: {
  children: ReactNode;
  className?: string;
  width?: string | number;
}) {
  return (
    <th
      style={{ width }}
      className={clsx(
        "text-start font-bold text-[12px] text-n500 px-4 py-3 border-b border-n200 bg-n50 whitespace-nowrap",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={clsx("px-4 py-3 border-b border-n100 align-middle", className)}>
      {children}
    </td>
  );
}

// -------------------------------------------------------------------- Tabs

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-n200 overflow-x-auto no-print">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            "relative px-4 py-2.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors",
            active === t.id ? "text-brand-text" : "text-n500 hover:text-n700",
          )}
        >
          {t.label}
          {t.count !== undefined ? (
            <span className="ms-1.5 text-[11.5px] text-n500 tnum">({t.count})</span>
          ) : null}
          {active === t.id ? (
            <span className="absolute inset-x-2 -bottom-px h-[2.5px] rounded-full bg-brand-solid" />
          ) : null}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------- Toast

export function Toast({
  message,
  kind = "success",
  onDone,
}: {
  message: string;
  kind?: "success" | "error" | "info";
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 start-6 z-[60] no-print animate-in">
      <div
        className={clsx(
          "flex items-center gap-3 rounded-[12px] border px-4 py-3 shadow-pop bg-surface max-w-md",
          kind === "success" && "border-dga-green/40",
          kind === "error" && "border-dga-red/40",
          kind === "info" && "border-n200",
        )}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: kind === "success" ? "#1cc182" : kind === "error" ? "#c40000" : "#1d9af2",
          }}
        />
        <p className="text-[13px] font-semibold text-ink">{message}</p>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- Skeleton

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-[22px] font-bold text-ink leading-tight">{title}</h1>
        {subtitle ? <p className="text-[13px] text-n500 mt-1.5 leading-relaxed">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div> : null}
    </div>
  );
}
