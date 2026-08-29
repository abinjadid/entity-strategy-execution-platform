"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, BellOff, CheckCheck, Printer } from "lucide-react";
import clsx from "clsx";

import {
  Button,
  Card,
  CardHead,
  Chip,
  EmptyState,
  PageTitle,
  StatCard,
  Tabs,
} from "@/components/ui";
import { notificationsFor, unreadFor, useStore } from "@/lib/store";
import { NOTIFICATION_LABELS, ROLE_LABELS } from "@/lib/types";
import type { NotificationKind } from "@/lib/types";
import { dateTimeAr, initials, num, timeAgo } from "@/lib/format";

const SEVERITY_COLOR: Record<string, string> = {
  info: "#1d9af2",
  warning: "#ffa300",
  success: "#1cc182",
};

export default function NotificationsPage() {
  const data = useStore((s) => s.data);
  const currentUserId = useStore((s) => s.currentUserId);
  const markNotificationRead = useStore((s) => s.markNotificationRead);
  const markAllRead = useStore((s) => s.markAllRead);

  const user = data.users.find((u) => u.id === currentUserId) ?? null;
  const [tab, setTab] = useState("all");

  const all = useMemo(() => notificationsFor(data, user), [data, user]);
  const unread = useMemo(() => unreadFor(data, user), [data, user]);

  const list = useMemo(() => {
    if (tab === "unread") return unread;
    if (tab === "all") return all;
    return all.filter((n) => n.kind === tab);
  }, [tab, all, unread]);

  const kinds = useMemo(() => {
    const c: Partial<Record<NotificationKind, number>> = {};
    all.forEach((n) => (c[n.kind] = (c[n.kind] ?? 0) + 1));
    return c;
  }, [all]);

  const linkFor = (entityType: string, entityId: string) => {
    if (entityType === "project") return `/projects/${entityId}`;
    if (entityType === "initiative") return `/initiatives/${entityId}`;
    if (entityType === "kpi") return `/kpis/${entityId}`;
    return null;
  };

  const receivesAll = user?.role === "admin" || user?.role === "pmo";

  return (
    <>
      <PageTitle
        title="الإشعارات"
        subtitle={
          receivesAll
            ? "تنبيهات فورية عند كل تحديث ميداني — نسب الإنجاز، قيم المؤشرات، حالات المعالم، والمستندات"
            : "سجل التحديثات التي قمت بها على مبادراتك ومشاريعك"
        }
        actions={
          <>
            {unread.length ? (
              <Button onClick={markAllRead}>
                <CheckCheck size={16} />
                تعليم الكل كمقروء
              </Button>
            ) : null}
            <Button variant="primary" onClick={() => window.print()}>
              <Printer size={16} />
              تصدير PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard label="إجمالي الإشعارات" value={num(all.length)} icon={<Bell size={16} />} accent="#2a206a" />
        <StatCard label="غير المقروءة" value={num(unread.length)} accent={unread.length ? "#c40000" : "#1cc182"} />
        <StatCard
          label="تنبيهات تحتاج معالجة"
          value={num(all.filter((n) => n.severity === "warning").length)}
          accent="#ffa300"
          sub="معالم متأخرة وانحرافات في المؤشرات"
        />
        <StatCard
          label="دورك في المنصة"
          value={<span className="text-[15px] leading-snug">{user ? ROLE_LABELS[user.role] : "—"}</span>}
          accent="#852cd0"
          sub={receivesAll ? "تستقبل كل إشعارات التحديثات" : "تستقبل إشعارات ما تقوم بتحديثه"}
        />
      </div>

      <Card>
        <div className="px-2 pt-2">
          <Tabs
            active={tab}
            onChange={setTab}
            tabs={[
              { id: "all", label: "الكل", count: all.length },
              { id: "unread", label: "غير مقروءة", count: unread.length },
              ...(Object.keys(kinds) as NotificationKind[]).map((k) => ({
                id: k,
                label: NOTIFICATION_LABELS[k],
                count: kinds[k],
              })),
            ]}
          />
        </div>

        {list.length ? (
          <ul className="divide-y divide-n100">
            {list.map((n) => {
              const isUnread = user ? !n.readBy.includes(user.id) : false;
              const by = data.users.find((u) => u.id === n.byUserId);
              const href = linkFor(n.entityType, n.entityId);
              return (
                <li
                  key={n.id}
                  className={clsx("flex gap-4 px-5 py-4 transition-colors", isUnread && "bg-dga-blue/[0.035]")}
                >
                  <span className="relative shrink-0">
                    <span className="w-10 h-10 rounded-full bg-n100 text-n700 grid place-items-center text-[12px] font-bold">
                      {by ? initials(by.name) : "—"}
                    </span>
                    <span
                      className="absolute -bottom-0.5 -start-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                      style={{ background: SEVERITY_COLOR[n.severity] }}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-bold text-ink">{n.title}</p>
                      <Chip>{NOTIFICATION_LABELS[n.kind]}</Chip>
                      {isUnread ? (
                        <span className="text-[11px] font-bold text-dga-blue-400 bg-dga-blue/10 rounded-full px-2 py-0.5">
                          جديد
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[13px] text-n700 mt-1.5 leading-relaxed">{n.body}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-[11.5px] text-n500">
                      <span>{by?.name}</span>
                      <span className="tnum">{dateTimeAr(n.at)}</span>
                      <span>{timeAgo(n.at)}</span>
                      {href ? (
                        <Link href={href} className="font-semibold text-dga-navy hover:underline no-print">
                          فتح السجل
                        </Link>
                      ) : null}
                      {isUnread ? (
                        <button
                          onClick={() => markNotificationRead(n.id)}
                          className="font-semibold text-n500 hover:text-ink no-print"
                        >
                          تعليم كمقروء
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title={tab === "unread" ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات"}
            body={
              receivesAll
                ? "ستظهر هنا تنبيهات فورية عند كل تحديث يقوم به ملاك المبادرات والمشاريع."
                : "ستظهر هنا تحديثاتك على المشاريع والمؤشرات التي تملكها."
            }
            icon={<BellOff size={32} />}
          />
        )}
      </Card>

      <Card className="mt-5">
        <CardHead title="قواعد توجيه الإشعارات" subtitle="من يستقبل ماذا، ومتى" />
        <ul className="divide-y divide-n100 text-[13px]">
          {[
            ["تحديث نسبة إنجاز مشروع", "مدير النظام · مدير متابعة الاستراتيجية", "فور حفظ التحديث مع التعليق الإلزامي"],
            ["إدخال قيمة فعلية لمؤشر", "مدير النظام · مدير متابعة الاستراتيجية", "فور حفظ القراءة مع التعليق الإلزامي"],
            ["تسجيل معلم كمتأخر", "مدير النظام · مدير متابعة الاستراتيجية", "فوراً مع مبرر التأخر المسجل — بدرجة تنبيه"],
            ["إرفاق مستند تقدم", "مدير النظام · مدير متابعة الاستراتيجية", "فور رفع المستند"],
            ["تعديل على الهيكل الاستراتيجي", "مدير النظام · مدير متابعة الاستراتيجية", "عند إضافة أو تعديل ركيزة أو هدف"],
            ["استيراد بيانات من Excel", "مدير النظام · مدير متابعة الاستراتيجية", "بعد اكتمال الاستيراد مع عدد السجلات"],
          ].map(([what, who, when]) => (
            <li key={what} className="grid gap-2 sm:grid-cols-3 px-5 py-3.5">
              <span className="font-bold text-ink">{what}</span>
              <span className="text-n700">{who}</span>
              <span className="text-n500 text-[12.5px]">{when}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
