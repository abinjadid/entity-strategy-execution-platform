// =============================================================================
// نظام الصلاحيات — أربعة أدوار
//  admin  مدير النظام: يعدّ ويهيئ كل شيء
//  pmo    مدير متابعة الاستراتيجية / مكتب المشاريع: يتابع الكل ويعتمد
//  owner  مالك المبادرة / المشروع: يحدّث مبادراته ومشاريعه فقط
//  viewer مشاهد التقارير: اطلاع فقط
// =============================================================================

import type { AppData, Role, User } from "./types";

export type Permission =
  | "structure.manage" // إدارة الركائز والأهداف والمبادرات والمشاريع والمؤشرات
  | "users.manage" // إدارة المستخدمين والصلاحيات
  | "settings.manage" // إعدادات المنصة
  | "data.import" // استيراد البيانات
  | "data.export" // تصدير البيانات
  | "data.reset" // إعادة تعيين البيانات
  | "progress.update.any" // تحديث نسب أي مشروع
  | "progress.update.owned" // تحديث نسب المشاريع المملوكة
  | "kpi.enter.any" // إدخال قيم أي مؤشر
  | "kpi.enter.owned" // إدخال قيم المؤشرات المملوكة
  | "milestone.update.any"
  | "milestone.update.owned"
  | "attachment.upload"
  | "notifications.receive" // استقبال إشعارات التحديثات
  | "reports.view";

const MATRIX: Record<Role, Permission[]> = {
  admin: [
    "structure.manage",
    "users.manage",
    "settings.manage",
    "data.import",
    "data.export",
    "data.reset",
    "progress.update.any",
    "kpi.enter.any",
    "milestone.update.any",
    "attachment.upload",
    "notifications.receive",
    "reports.view",
  ],
  pmo: [
    "structure.manage",
    "data.import",
    "data.export",
    "progress.update.any",
    "kpi.enter.any",
    "milestone.update.any",
    "attachment.upload",
    "notifications.receive",
    "reports.view",
  ],
  owner: [
    "data.export",
    "progress.update.owned",
    "kpi.enter.owned",
    "milestone.update.owned",
    "attachment.upload",
    "reports.view",
  ],
  viewer: ["data.export", "reports.view"],
};

export function can(role: Role | undefined, perm: Permission): boolean {
  if (!role) return false;
  return MATRIX[role].includes(perm);
}

export const ROLE_PERMISSIONS = MATRIX;

/** هل يملك المستخدم هذه المبادرة (مباشرة أو عبر أحد مشاريعها)؟ */
export function ownsInitiative(user: User | null, initiativeId: string, data: AppData): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "pmo") return true;
  if (user.ownedInitiativeIds.includes(initiativeId)) return true;
  const init = data.initiatives.find((i) => i.id === initiativeId);
  if (init && init.ownerId === user.id) return true;
  return data.projects.some(
    (p) => p.initiativeId === initiativeId && (p.ownerId === user.id || user.ownedProjectIds.includes(p.id)),
  );
}

export function ownsProject(user: User | null, projectId: string, data: AppData): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "pmo") return true;
  const p = data.projects.find((x) => x.id === projectId);
  if (!p) return false;
  if (p.ownerId === user.id || user.ownedProjectIds.includes(p.id)) return true;
  return user.ownedInitiativeIds.includes(p.initiativeId);
}

export function ownsKpi(user: User | null, kpiId: string, data: AppData): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "pmo") return true;
  const k = data.kpis.find((x) => x.id === kpiId);
  if (!k) return false;
  if (k.ownerId === user.id) return true;
  return k.initiativeId ? ownsInitiative(user, k.initiativeId, data) : false;
}

/** هل يستطيع المستخدم تحديث نسبة إنجاز هذا المشروع؟ */
export function canUpdateProject(user: User | null, projectId: string, data: AppData): boolean {
  if (!user) return false;
  if (can(user.role, "progress.update.any")) return true;
  return can(user.role, "progress.update.owned") && ownsProject(user, projectId, data);
}

export function canUpdateMilestone(user: User | null, projectId: string, data: AppData): boolean {
  if (!user) return false;
  if (can(user.role, "milestone.update.any")) return true;
  return can(user.role, "milestone.update.owned") && ownsProject(user, projectId, data);
}

export function canEnterKpi(user: User | null, kpiId: string, data: AppData): boolean {
  if (!user) return false;
  if (can(user.role, "kpi.enter.any")) return true;
  return can(user.role, "kpi.enter.owned") && ownsKpi(user, kpiId, data);
}

export function canAttach(user: User | null, projectId: string, data: AppData): boolean {
  if (!user) return false;
  if (!can(user.role, "attachment.upload")) return false;
  if (can(user.role, "progress.update.any")) return true;
  return ownsProject(user, projectId, data);
}

/** وصف مختصر لصلاحيات الدور — يُعرض في شاشة الدخول وإدارة المستخدمين */
export const ROLE_SUMMARY: Record<Role, string> = {
  admin: "يهيئ الهيكل الاستراتيجي والمستخدمين والإعدادات، ويستورد ويصدّر البيانات، ويستقبل كل الإشعارات.",
  pmo: "يتابع كامل المحفظة ويحدّث أي مشروع أو مؤشر، ويعتمد التقارير التنفيذية، ويستقبل كل الإشعارات.",
  owner: "يحدّث مبادراته ومشاريعه فقط: نسب الإنجاز، قيم المؤشرات، حالات المعالم، والمستندات.",
  viewer: "يطلع على لوحة القيادة والتقارير ويصدّرها دون أي صلاحية تعديل.",
};
