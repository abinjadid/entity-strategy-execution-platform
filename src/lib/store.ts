"use client";

// =============================================================================
// طبقة البيانات — مجرّدة عن وسيط التخزين.
// اليوم: تخزين محلي في متصفح كل مستخدم (localStorage) عبر zustand/persist.
// للترقية إلى قاعدة بيانات مشتركة لاحقاً: استبدال هذا الملف وحده بمناداة API
// مع الحفاظ على نفس أسماء الإجراءات، دون تعديل أي شاشة.
// =============================================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { buildEmptyData, buildSeedData } from "./seed";
import { uid } from "./format";
import type {
  AppData,
  AppNotification,
  Attachment,
  Filters,
  Initiative,
  Kpi,
  KpiReading,
  Milestone,
  NotificationKind,
  Objective,
  Pillar,
  Project,
  Role,
  Settings,
  Status,
  User,
} from "./types";
import { EMPTY_FILTERS } from "./types";

export const STORAGE_KEY = "dtsp-store-v1";

interface State {
  data: AppData;
  currentUserId: string | null;
  filters: Filters;
  hydrated: boolean;

  // ------- الجلسة
  login: (userId: string) => void;
  logout: () => void;
  currentUser: () => User | null;

  // ------- الفلاتر
  setFilter: (key: keyof Filters, value: string) => void;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;

  // ------- الإدخال الميداني
  updateProjectProgress: (projectId: string, progress: number, comment: string) => void;
  updateMilestone: (
    projectId: string,
    milestoneId: string,
    patch: { status: Status; delayReason?: string; completedDate?: string | null },
  ) => void;
  saveKpiReading: (
    kpiId: string,
    year: number,
    quarter: 1 | 2 | 3 | 4,
    actual: number,
    comment: string,
    target?: number,
  ) => void;
  addAttachment: (a: Omit<Attachment, "id" | "at" | "byUserId">) => void;
  removeAttachment: (id: string) => void;

  // ------- إدارة الهيكل
  upsertPillar: (p: Partial<Pillar> & { id?: string }) => void;
  removePillar: (id: string) => void;
  upsertObjective: (o: Partial<Objective> & { id?: string }) => void;
  removeObjective: (id: string) => void;
  upsertInitiative: (i: Partial<Initiative> & { id?: string }) => void;
  removeInitiative: (id: string) => void;
  upsertProject: (p: Partial<Project> & { id?: string }) => void;
  removeProject: (id: string) => void;
  upsertMilestone: (projectId: string, m: Partial<Milestone> & { id?: string }) => void;
  removeMilestone: (projectId: string, id: string) => void;
  upsertKpi: (k: Partial<Kpi> & { id?: string }) => void;
  removeKpi: (id: string) => void;

  // ------- المستخدمون والإعدادات
  upsertUser: (u: Partial<User> & { id?: string }) => void;
  removeUser: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  updateMaturity: (id: string, patch: { current?: number; target?: number }) => void;
  updatePerspective: (id: string, patch: Partial<{ score: number; targetScore: number; weight: number; name: string }>) => void;

  // ------- الإشعارات
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  pushNotification: (n: Omit<AppNotification, "id" | "at" | "readBy">) => void;

  // ------- البيانات
  replaceData: (d: AppData) => void;
  mergeImported: (partial: Partial<AppData>) => { added: Record<string, number> };
  resetToSeed: () => void;
  resetToEmpty: () => void;
}

const nowIso = () => new Date().toISOString();

function notify(
  state: State,
  kind: NotificationKind,
  title: string,
  body: string,
  entityType: AppNotification["entityType"],
  entityId: string,
  severity: AppNotification["severity"] = "info",
): AppNotification {
  return {
    id: uid("n"),
    kind,
    title,
    body,
    entityType,
    entityId,
    byUserId: state.currentUserId ?? "system",
    at: nowIso(),
    toRoles: ["admin", "pmo"] as Role[],
    readBy: [],
    severity,
  };
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      data: buildSeedData(),
      currentUserId: null,
      filters: { ...EMPTY_FILTERS },
      hydrated: false,

      // ---------------------------------------------------------- الجلسة
      login: (userId) => set({ currentUserId: userId, filters: { ...EMPTY_FILTERS } }),
      logout: () => set({ currentUserId: null }),
      currentUser: () => {
        const { data, currentUserId } = get();
        return data.users.find((u) => u.id === currentUserId) ?? null;
      },

      // ---------------------------------------------------------- الفلاتر
      setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
      setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set({ filters: { ...EMPTY_FILTERS } }),

      // -------------------------------------------------- الإدخال الميداني
      updateProjectProgress: (projectId, progress, comment) =>
        set((s) => {
          const user = s.data.users.find((u) => u.id === s.currentUserId);
          const projects = s.data.projects.map((p) => {
            if (p.id !== projectId) return p;
            const prev = p.actualProgress;
            const status: Status =
              progress >= 100 ? "completed" : progress > 0 && p.status === "not_started" ? "in_progress" : p.status;
            return {
              ...p,
              actualProgress: progress,
              status,
              lastUpdatedBy: s.currentUserId,
              lastUpdatedAt: nowIso(),
              updates: [
                {
                  id: uid("u"),
                  projectId,
                  previousProgress: prev,
                  progress,
                  comment,
                  byUserId: s.currentUserId ?? "system",
                  at: nowIso(),
                },
                ...p.updates,
              ],
            };
          });
          const proj = projects.find((p) => p.id === projectId);
          const n = notify(
            s,
            "project_progress",
            "تحديث نسبة إنجاز مشروع",
            `حدّث ${user?.name ?? "مستخدم"} نسبة إنجاز «${proj?.name}» إلى ${progress}%.`,
            "project",
            projectId,
            "info",
          );
          return { data: { ...s.data, projects, notifications: [n, ...s.data.notifications] } };
        }),

      updateMilestone: (projectId, milestoneId, patch) =>
        set((s) => {
          const user = s.data.users.find((u) => u.id === s.currentUserId);
          let msName = "";
          const projects = s.data.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              milestones: p.milestones.map((m) => {
                if (m.id !== milestoneId) return m;
                msName = m.name;
                return {
                  ...m,
                  status: patch.status,
                  delayReason: patch.status === "delayed" ? (patch.delayReason ?? m.delayReason) : "",
                  completedDate:
                    patch.status === "completed"
                      ? (patch.completedDate ?? nowIso().slice(0, 10))
                      : null,
                  lastUpdatedBy: s.currentUserId,
                  lastUpdatedAt: nowIso(),
                };
              }),
            };
          });
          const n = notify(
            s,
            "milestone_status",
            patch.status === "delayed" ? "معلم متأخر يحتاج معالجة" : "تحديث حالة معلم",
            `سجّل ${user?.name ?? "مستخدم"} حالة «${msName}» كـ ${patch.status === "delayed" ? "متأخر" : patch.status === "completed" ? "مكتمل" : "قيد التنفيذ"}.`,
            "milestone",
            milestoneId,
            patch.status === "delayed" ? "warning" : "success",
          );
          return { data: { ...s.data, projects, notifications: [n, ...s.data.notifications] } };
        }),

      saveKpiReading: (kpiId, year, quarter, actual, comment, target) =>
        set((s) => {
          const user = s.data.users.find((u) => u.id === s.currentUserId);
          let kpiName = "";
          const kpis = s.data.kpis.map((k) => {
            if (k.id !== kpiId) return k;
            kpiName = k.name;
            const existing = k.readings.find((r) => r.year === year && r.quarter === quarter);
            const reading: KpiReading = {
              id: existing?.id ?? uid("r"),
              kpiId,
              year,
              quarter,
              target: target ?? existing?.target ?? k.target,
              actual,
              comment,
              byUserId: s.currentUserId ?? "system",
              at: nowIso(),
            };
            const readings = existing
              ? k.readings.map((r) => (r.id === existing.id ? reading : r))
              : [...k.readings, reading];
            return { ...k, readings };
          });
          const n = notify(
            s,
            "kpi_reading",
            "إدخال قيمة فعلية لمؤشر",
            `أدخل ${user?.name ?? "مستخدم"} القيمة الفعلية لمؤشر «${kpiName}» للربع ${quarter} ${year}.`,
            "kpi",
            kpiId,
            "success",
          );
          return { data: { ...s.data, kpis, notifications: [n, ...s.data.notifications] } };
        }),

      addAttachment: (a) =>
        set((s) => {
          const user = s.data.users.find((u) => u.id === s.currentUserId);
          const att: Attachment = {
            ...a,
            id: uid("a"),
            byUserId: s.currentUserId ?? "system",
            at: nowIso(),
          };
          const n = notify(
            s,
            "attachment",
            "إرفاق مستند تقدم",
            `أرفق ${user?.name ?? "مستخدم"} المستند «${a.name}».`,
            a.entityType === "milestone" ? "milestone" : a.entityType,
            a.entityId,
            "info",
          );
          return {
            data: {
              ...s.data,
              attachments: [att, ...s.data.attachments],
              notifications: [n, ...s.data.notifications],
            },
          };
        }),

      removeAttachment: (id) =>
        set((s) => ({
          data: { ...s.data, attachments: s.data.attachments.filter((a) => a.id !== id) },
        })),

      // ------------------------------------------------------ إدارة الهيكل
      upsertPillar: (p) =>
        set((s) => {
          const id = p.id ?? uid("p");
          const exists = s.data.pillars.some((x) => x.id === id);
          const base: Pillar = {
            id,
            code: p.code ?? `R${s.data.pillars.length + 1}`,
            name: p.name ?? "ركيزة جديدة",
            description: p.description ?? "",
            weight: p.weight ?? 20,
            color: p.color ?? "#2a206a",
            order: p.order ?? s.data.pillars.length + 1,
          };
          const pillars = exists
            ? s.data.pillars.map((x) => (x.id === id ? { ...x, ...p, id } : x))
            : [...s.data.pillars, base];
          return {
            data: {
              ...s.data,
              pillars,
              notifications: [
                notify(s, "structure_change", "تعديل على الهيكل الاستراتيجي", `تم ${exists ? "تعديل" : "إضافة"} الركيزة «${p.name ?? base.name}».`, "system", id),
                ...s.data.notifications,
              ],
            },
          };
        }),

      removePillar: (id) =>
        set((s) => ({
          data: {
            ...s.data,
            pillars: s.data.pillars.filter((x) => x.id !== id),
            objectives: s.data.objectives.filter((o) => o.pillarId !== id),
          },
        })),

      upsertObjective: (o) =>
        set((s) => {
          const id = o.id ?? uid("o");
          const exists = s.data.objectives.some((x) => x.id === id);
          const base: Objective = {
            id,
            pillarId: o.pillarId ?? s.data.pillars[0]?.id ?? "",
            code: o.code ?? `H${s.data.objectives.length + 1}`,
            name: o.name ?? "هدف جديد",
            description: o.description ?? "",
            weight: o.weight ?? 25,
            targetYear: o.targetYear ?? s.data.settings.strategyEndYear,
          };
          const objectives = exists
            ? s.data.objectives.map((x) => (x.id === id ? { ...x, ...o, id } : x))
            : [...s.data.objectives, base];
          return { data: { ...s.data, objectives } };
        }),

      removeObjective: (id) =>
        set((s) => ({ data: { ...s.data, objectives: s.data.objectives.filter((x) => x.id !== id) } })),

      upsertInitiative: (i) =>
        set((s) => {
          const id = i.id ?? uid("i");
          const exists = s.data.initiatives.some((x) => x.id === id);
          const base: Initiative = {
            id,
            code: i.code ?? `MB-${String(s.data.initiatives.length + 1).padStart(2, "0")}`,
            name: i.name ?? "مبادرة جديدة",
            description: i.description ?? "",
            expectedImpact: i.expectedImpact ?? "",
            pillarId: i.pillarId ?? s.data.pillars[0]?.id ?? "",
            objectiveIds: i.objectiveIds ?? [],
            ownerId: i.ownerId ?? s.currentUserId ?? "u1",
            department: i.department ?? "",
            status: i.status ?? "not_started",
            priority: i.priority ?? "medium",
            startDate: i.startDate ?? `${s.data.settings.currentYear}-01-01`,
            endDate: i.endDate ?? `${s.data.settings.strategyEndYear}-12-31`,
            budgetPlanned: i.budgetPlanned ?? 0,
            budgetSpent: i.budgetSpent ?? 0,
          };
          const initiatives = exists
            ? s.data.initiatives.map((x) => (x.id === id ? { ...x, ...i, id } : x))
            : [...s.data.initiatives, base];
          return { data: { ...s.data, initiatives } };
        }),

      removeInitiative: (id) =>
        set((s) => ({
          data: {
            ...s.data,
            initiatives: s.data.initiatives.filter((x) => x.id !== id),
            projects: s.data.projects.filter((p) => p.initiativeId !== id),
          },
        })),

      upsertProject: (p) =>
        set((s) => {
          const id = p.id ?? uid("pr");
          const exists = s.data.projects.some((x) => x.id === id);
          const init = s.data.initiatives.find((x) => x.id === p.initiativeId);
          const base: Project = {
            id,
            code: p.code ?? `MS-${String(s.data.projects.length + 1).padStart(2, "0")}`,
            name: p.name ?? "مشروع جديد",
            description: p.description ?? "",
            initiativeId: p.initiativeId ?? s.data.initiatives[0]?.id ?? "",
            ownerId: p.ownerId ?? init?.ownerId ?? s.currentUserId ?? "u1",
            department: p.department ?? init?.department ?? "",
            vendor: p.vendor ?? "داخلي",
            status: p.status ?? "not_started",
            priority: p.priority ?? "medium",
            startDate: p.startDate ?? `${s.data.settings.currentYear}-01-01`,
            endDate: p.endDate ?? `${s.data.settings.currentYear}-12-31`,
            budgetPlanned: p.budgetPlanned ?? 0,
            budgetSpent: p.budgetSpent ?? 0,
            actualProgress: p.actualProgress ?? 0,
            lastUpdatedBy: null,
            lastUpdatedAt: null,
            milestones: p.milestones ?? [],
            updates: p.updates ?? [],
          };
          const projects = exists
            ? s.data.projects.map((x) => (x.id === id ? { ...x, ...p, id } : x))
            : [...s.data.projects, base];
          return { data: { ...s.data, projects } };
        }),

      removeProject: (id) =>
        set((s) => ({ data: { ...s.data, projects: s.data.projects.filter((x) => x.id !== id) } })),

      upsertMilestone: (projectId, m) =>
        set((s) => ({
          data: {
            ...s.data,
            projects: s.data.projects.map((p) => {
              if (p.id !== projectId) return p;
              const id = m.id ?? uid("ms");
              const exists = p.milestones.some((x) => x.id === id);
              const base: Milestone = {
                id,
                projectId,
                name: m.name ?? "معلم جديد",
                description: m.description ?? "",
                dueDate: m.dueDate ?? p.endDate,
                completedDate: m.completedDate ?? null,
                status: m.status ?? "not_started",
                weight: m.weight ?? 25,
                delayReason: m.delayReason ?? "",
                lastUpdatedBy: null,
                lastUpdatedAt: null,
              };
              return {
                ...p,
                milestones: exists
                  ? p.milestones.map((x) => (x.id === id ? { ...x, ...m, id } : x))
                  : [...p.milestones, base],
              };
            }),
          },
        })),

      removeMilestone: (projectId, id) =>
        set((s) => ({
          data: {
            ...s.data,
            projects: s.data.projects.map((p) =>
              p.id === projectId ? { ...p, milestones: p.milestones.filter((m) => m.id !== id) } : p,
            ),
          },
        })),

      upsertKpi: (k) =>
        set((s) => {
          const id = k.id ?? uid("k");
          const exists = s.data.kpis.some((x) => x.id === id);
          const base: Kpi = {
            id,
            code: k.code ?? `MO-${String(s.data.kpis.length + 1).padStart(2, "0")}`,
            name: k.name ?? "مؤشر جديد",
            description: k.description ?? "",
            objectiveId: k.objectiveId ?? s.data.objectives[0]?.id ?? "",
            initiativeId: k.initiativeId ?? null,
            perspectiveId: k.perspectiveId ?? s.data.perspectives[0]?.id ?? "",
            unit: k.unit ?? "percent",
            direction: k.direction ?? "increase",
            baseline: k.baseline ?? 0,
            target: k.target ?? 100,
            weight: k.weight ?? 5,
            frequency: k.frequency ?? "quarterly",
            ownerId: k.ownerId ?? s.currentUserId ?? "u1",
            thresholdGreen: k.thresholdGreen ?? s.data.settings.ragGreen,
            thresholdAmber: k.thresholdAmber ?? s.data.settings.ragAmber,
            readings: k.readings ?? [],
          };
          const kpis = exists
            ? s.data.kpis.map((x) => (x.id === id ? { ...x, ...k, id } : x))
            : [...s.data.kpis, base];
          return { data: { ...s.data, kpis } };
        }),

      removeKpi: (id) =>
        set((s) => ({ data: { ...s.data, kpis: s.data.kpis.filter((x) => x.id !== id) } })),

      // ------------------------------------------- المستخدمون والإعدادات
      upsertUser: (u) =>
        set((s) => {
          const id = u.id ?? uid("u");
          const exists = s.data.users.some((x) => x.id === id);
          const base: User = {
            id,
            name: u.name ?? "مستخدم جديد",
            email: u.email ?? "",
            role: u.role ?? "viewer",
            jobTitle: u.jobTitle ?? "",
            department: u.department ?? "",
            active: u.active ?? true,
            ownedInitiativeIds: u.ownedInitiativeIds ?? [],
            ownedProjectIds: u.ownedProjectIds ?? [],
          };
          const users = exists
            ? s.data.users.map((x) => (x.id === id ? { ...x, ...u, id } : x))
            : [...s.data.users, base];
          return { data: { ...s.data, users } };
        }),

      removeUser: (id) =>
        set((s) => ({ data: { ...s.data, users: s.data.users.filter((x) => x.id !== id) } })),

      updateSettings: (patch) =>
        set((s) => ({ data: { ...s.data, settings: { ...s.data.settings, ...patch } } })),

      updateMaturity: (id, patch) =>
        set((s) => ({
          data: {
            ...s.data,
            maturity: s.data.maturity.map((m) => (m.id === id ? { ...m, ...patch } : m)),
          },
        })),

      updatePerspective: (id, patch) =>
        set((s) => ({
          data: {
            ...s.data,
            perspectives: s.data.perspectives.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          },
        })),

      // ------------------------------------------------------- الإشعارات
      markNotificationRead: (id) =>
        set((s) => ({
          data: {
            ...s.data,
            notifications: s.data.notifications.map((n) =>
              n.id === id && s.currentUserId && !n.readBy.includes(s.currentUserId)
                ? { ...n, readBy: [...n.readBy, s.currentUserId] }
                : n,
            ),
          },
        })),

      markAllRead: () =>
        set((s) => ({
          data: {
            ...s.data,
            notifications: s.data.notifications.map((n) =>
              s.currentUserId && !n.readBy.includes(s.currentUserId)
                ? { ...n, readBy: [...n.readBy, s.currentUserId] }
                : n,
            ),
          },
        })),

      pushNotification: (n) =>
        set((s) => ({
          data: {
            ...s.data,
            notifications: [{ ...n, id: uid("n"), at: nowIso(), readBy: [] }, ...s.data.notifications],
          },
        })),

      // --------------------------------------------------------- البيانات
      replaceData: (d) => set({ data: d }),

      mergeImported: (partial) => {
        const added: Record<string, number> = {};
        set((s) => {
          const d = { ...s.data };
          const mergeBy = <T extends { id: string }>(cur: T[], inc: T[] | undefined, key: string) => {
            if (!inc?.length) return cur;
            const map = new Map(cur.map((x) => [x.id, x]));
            let n = 0;
            inc.forEach((x) => {
              if (!map.has(x.id)) n++;
              map.set(x.id, { ...(map.get(x.id) ?? {}), ...x } as T);
            });
            added[key] = n;
            return Array.from(map.values());
          };
          d.pillars = mergeBy(d.pillars, partial.pillars, "pillars");
          d.objectives = mergeBy(d.objectives, partial.objectives, "objectives");
          d.initiatives = mergeBy(d.initiatives, partial.initiatives, "initiatives");
          d.projects = mergeBy(d.projects, partial.projects, "projects");
          d.kpis = mergeBy(d.kpis, partial.kpis, "kpis");
          d.users = mergeBy(d.users, partial.users, "users");
          const total = Object.values(added).reduce((a, b) => a + b, 0);
          const n = notify(
            s,
            "import",
            "استيراد بيانات من ملف Excel",
            `تمت إضافة ${total} سجلاً جديداً إلى الهيكل الاستراتيجي.`,
            "system",
            "import",
            "success",
          );
          d.notifications = [n, ...d.notifications];
          return { data: d };
        });
        return { added };
      },

      resetToSeed: () => set({ data: buildSeedData(), filters: { ...EMPTY_FILTERS } }),
      resetToEmpty: () => set({ data: buildEmptyData(), filters: { ...EMPTY_FILTERS } }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ data: s.data, currentUserId: s.currentUserId }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
      version: 1,
    },
  ),
);

/** الإشعارات غير المقروءة الموجهة لدور المستخدم الحالي */
export function unreadFor(data: AppData, user: User | null): AppNotification[] {
  if (!user) return [];
  return data.notifications.filter(
    (n) => n.toRoles.includes(user.role) && !n.readBy.includes(user.id),
  );
}

/** إشعارات المستخدم الحالي حسب دوره */
export function notificationsFor(data: AppData, user: User | null): AppNotification[] {
  if (!user) return [];
  if (user.role === "admin" || user.role === "pmo") return data.notifications;
  return data.notifications.filter((n) => n.byUserId === user.id);
}
