"use client";

// =============================================================================
// شعار الجهة — يعرض الشعار الذي رفعته الجهة في معالج الإعداد،
// ويعود إلى شعار الهيئة الرقمية عندما لا يكون هناك شعار مرفوع.
// نستخدم <img> لأن الشعار يُحفظ كـ data URL داخل إعدادات المنصة.
// =============================================================================

import clsx from "clsx";

import { useStore } from "@/lib/store";

export function BrandMark({
  size = 36,
  className,
  variant = "mark",
}: {
  size?: number;
  className?: string;
  /** mark: الرمز المربع · wide: الشعار الأفقي في شاشة الدخول */
  variant?: "mark" | "wide";
}) {
  const logo = useStore((s) => s.data.settings.logoDataUrl);
  const entityName = useStore((s) => s.data.settings.entityName);
  const fallback = variant === "wide" ? "/brand/dga-logo.png" : "/brand/dga-emblem.png";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo || fallback}
      alt={logo ? entityName : ""}
      style={variant === "wide" ? { height: size, width: "auto" } : { width: size, height: size }}
      className={clsx("shrink-0 object-contain", className)}
    />
  );
}
