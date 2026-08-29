// =============================================================================
// نماذج البيانات — نظام إدارة استراتيجية التحول الرقمي
// Domain model for the Digital Transformation Strategy Execution Platform
// =============================================================================

export type Role = "admin" | "pmo" | "owner" | "viewer";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "مدير النظام",
  pmo: "مدير متابعة الاستراتيجية / مكتب المشاريع",
  owner: "مالك مبادرة / مشروع",
  viewer: "مشاهد التقارير",
};

export const ROLE_SHORT: Record<Role, string> = {
  admin: "مدير النظام",
  pmo: "مكتب المشاريع",
  owner: "مالك مبادرة",
  viewer: "مشاهد",
};

export type Status =
  | "not_started"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "cancelled"
  | "delayed";

export const STATUS_LABELS: Record<Status, string> = {
  not_started: "لم يبدأ",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  on_hold: "متوقف",
  cancelled: "ملغى",
  delayed: "متأخر",
};

export type Priority = "critical" | "high" | "medium" | "low";

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: "حرجة",
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

export type Rag = "green" | "amber" | "red" | "gray";

export const RAG_LABELS: Record<Rag, string> = {
  green: "أخضر — ضمن المستهدف",
  amber: "أصفر — يحتاج متابعة",
  red: "أحمر — متعثر",
  gray: "لا توجد قراءة",
};

export type KpiUnit = "percent" | "number" | "days" | "sar" | "index" | "ratio";

export const UNIT_LABELS: Record<KpiUnit, string> = {
  percent: "%",
  number: "عدد",
  days: "يوم",
  sar: "ريال",
  index: "نقطة",
  ratio: "نسبة",
};

export type Frequency = "monthly" | "quarterly" | "annual";

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  monthly: "شهري",
  quarterly: "ربعي",
  annual: "سنوي",
};

export type Direction = "increase" | "decrease";

// ------------------------------------------------------------------ الكيانات

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string;
  department: string;
  active: boolean;
  /** المبادرات التي يملكها المستخدم (لدور مالك المبادرة) */
  ownedInitiativeIds: string[];
  /** المشاريع التي يملكها المستخدم (لدور مالك المشروع) */
  ownedProjectIds: string[];
}

/** الركيزة الاستراتيجية */
export interface Pillar {
  id: string;
  code: string;
  name: string;
  description: string;
  weight: number; // الوزن النسبي ضمن الاستراتيجية (مجموعها 100)
  color: string;
  order: number;
}

/** الهدف الاستراتيجي */
export interface Objective {
  id: string;
  pillarId: string;
  code: string;
  name: string;
  description: string;
  weight: number; // الوزن ضمن الركيزة
  targetYear: number;
}

/** قراءة فعلية لمؤشر أداء */
export interface KpiReading {
  id: string;
  kpiId: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  target: number;
  actual: number | null;
  /** تعليق إلزامي عند إدخال القيمة الفعلية */
  comment: string;
  byUserId: string;
  at: string; // ISO
}

/** مؤشر الأداء */
export interface Kpi {
  id: string;
  code: string;
  name: string;
  description: string;
  objectiveId: string;
  initiativeId: string | null;
  perspectiveId: string; // منظور إطار قياس DGA
  unit: KpiUnit;
  direction: Direction;
  baseline: number;
  target: number; // المستهدف السنوي النهائي
  weight: number;
  frequency: Frequency;
  ownerId: string;
  /** حدود نظام RAG كنسبة إنجاز من المستهدف */
  thresholdGreen: number; // ≥ هذه النسبة = أخضر
  thresholdAmber: number; // ≥ هذه النسبة = أصفر، أقل = أحمر
  readings: KpiReading[];
}

/** المبادرة */
export interface Initiative {
  id: string;
  code: string;
  name: string;
  description: string;
  expectedImpact: string;
  pillarId: string;
  objectiveIds: string[];
  ownerId: string;
  department: string;
  status: Status;
  priority: Priority;
  startDate: string;
  endDate: string;
  budgetPlanned: number;
  budgetSpent: number;
}

/** المعلم (Milestone) */
export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  dueDate: string;
  completedDate: string | null;
  status: Status;
  weight: number;
  /** مبرر التأخر — إلزامي عند تعيين الحالة "متأخر" */
  delayReason: string;
  lastUpdatedBy: string | null;
  lastUpdatedAt: string | null;
}

/** تحديث نسبة تنفيذ مشروع */
export interface ProgressUpdate {
  id: string;
  projectId: string;
  previousProgress: number;
  progress: number;
  comment: string;
  byUserId: string;
  at: string;
}

/** مستند مرفق */
export interface Attachment {
  id: string;
  entityType: "project" | "initiative" | "kpi" | "milestone";
  entityId: string;
  name: string;
  size: number;
  mime: string;
  /** محتوى الملف كـ data URL (التخزين محلي في المتصفح) */
  dataUrl: string;
  byUserId: string;
  at: string;
}

/** المشروع */
export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  initiativeId: string;
  ownerId: string;
  department: string;
  vendor: string;
  status: Status;
  priority: Priority;
  startDate: string;
  endDate: string;
  budgetPlanned: number;
  budgetSpent: number;
  /** نسبة الإنجاز الفعلية 0-100 — تُحدَّث بشريط التمرير */
  actualProgress: number;
  lastUpdatedBy: string | null;
  lastUpdatedAt: string | null;
  milestones: Milestone[];
  updates: ProgressUpdate[];
}

/** منظور من مناظير إطار قياس DGA العشرة */
export interface Perspective {
  id: string;
  code: string;
  name: string;
  description: string;
  weight: number;
  /** الدرجة الحالية 0-100 حسب التقييم الأخير */
  score: number;
  previousScore: number;
  targetScore: number;
}

/** بُعد من أبعاد رادار النضج الرقمي */
export interface MaturityDomain {
  id: string;
  name: string;
  description: string;
  /** المستوى الحالي 1-5 */
  current: number;
  previous: number;
  target: number;
}

export type NotificationKind =
  | "project_progress"
  | "kpi_reading"
  | "milestone_status"
  | "attachment"
  | "structure_change"
  | "import";

export const NOTIFICATION_LABELS: Record<NotificationKind, string> = {
  project_progress: "تحديث نسبة إنجاز",
  kpi_reading: "إدخال قيمة مؤشر",
  milestone_status: "تحديث حالة معلم",
  attachment: "إرفاق مستند",
  structure_change: "تعديل على الهيكل",
  import: "استيراد بيانات",
};

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  entityType: "project" | "initiative" | "kpi" | "milestone" | "system";
  entityId: string;
  byUserId: string;
  at: string;
  /** الأدوار المستهدفة بالإشعار */
  toRoles: Role[];
  readBy: string[];
  severity: "info" | "warning" | "success";
}

/** إعدادات المنصة */
export interface Settings {
  entityName: string;
  strategyName: string;
  strategyStartYear: number;
  strategyEndYear: number;
  currentYear: number;
  currentQuarter: 1 | 2 | 3 | 4;
  currency: string;
  ragGreen: number;
  ragAmber: number;
}

/** الحالة الكاملة للمنصة */
export interface AppData {
  settings: Settings;
  users: User[];
  pillars: Pillar[];
  objectives: Objective[];
  kpis: Kpi[];
  initiatives: Initiative[];
  projects: Project[];
  perspectives: Perspective[];
  maturity: MaturityDomain[];
  notifications: AppNotification[];
  attachments: Attachment[];
}

// ------------------------------------------------------------------- الفلاتر

export interface Filters {
  pillarId: string;
  objectiveId: string;
  initiativeId: string;
  projectId: string;
  ownerId: string;
  year: string;
  quarter: string;
  status: string;
  priority: string;
  perspectiveId: string;
  search: string;
}

export const EMPTY_FILTERS: Filters = {
  pillarId: "",
  objectiveId: "",
  initiativeId: "",
  projectId: "",
  ownerId: "",
  year: "",
  quarter: "",
  status: "",
  priority: "",
  perspectiveId: "",
  search: "",
};
