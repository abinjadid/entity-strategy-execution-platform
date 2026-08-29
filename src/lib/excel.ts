"use client";

// =============================================================================
// الاستيراد والتصدير — Excel (XLSX) عبر ExcelJS، وPDF عبر طباعة المتصفح.
// الطباعة هي المسار المعتمد للـ PDF لأنها تحافظ على تشكيل النص العربي واتجاه
// الصفحة من اليمين لليسار دون الحاجة لتضمين خطوط داخل ملف PDF.
// =============================================================================

import type { Workbook, Worksheet } from "exceljs";

import {
  achievement,
  initiativeProgress,
  kpiRag,
  latestReading,
  plannedProgress,
  projectRag,
  projectVariance,
  filterInitiatives,
  filterKpis,
  filterProjects,
  pillarProgress,
  budgetByPillar,
} from "./calc";
import { PRIORITY_LABELS, STATUS_LABELS, RAG_LABELS, UNIT_LABELS } from "./types";
import type { AppData, Filters, Priority, Status } from "./types";
import { EMPTY_FILTERS } from "./types";

const NAVY = "FF2A206A";
const LIGHT = "FFF2F1F6";

async function newWorkbook(): Promise<Workbook> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "نظام إدارة استراتيجية التحول الرقمي";
  wb.created = new Date();
  return wb;
}

function styleSheet(ws: Worksheet, widths: number[]) {
  ws.views = [{ rightToLeft: true, state: "frozen", ySplit: 1 }];
  ws.columns.forEach((c, i) => {
    c.width = widths[i] ?? 18;
    c.alignment = { vertical: "middle", horizontal: "right", wrapText: true };
  });
  const header = ws.getRow(1);
  header.height = 26;
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Arial" };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFFFFFFF" } } };
  });
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.height = 20;
    row.eachCell((cell) => {
      cell.font = { size: 10.5, name: "Arial" };
      cell.border = {
        bottom: { style: "hair", color: { argb: "FFE2E0E8" } },
      };
      if (n % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
    });
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
}

async function download(wb: Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------- بناء الأوراق

function addPillarsSheet(wb: Workbook, data: AppData) {
  const ws = wb.addWorksheet("الركائز");
  ws.columns = [
    { header: "الرمز", key: "code" },
    { header: "الركيزة", key: "name" },
    { header: "الوصف", key: "description" },
    { header: "الوزن %", key: "weight" },
    { header: "نسبة الإنجاز %", key: "progress" },
    { header: "عدد المبادرات", key: "inits" },
  ];
  data.pillars.forEach((p) => {
    ws.addRow({
      code: p.code,
      name: p.name,
      description: p.description,
      weight: p.weight,
      progress: Math.round(pillarProgress(p, data.initiatives, data.projects)),
      inits: data.initiatives.filter((i) => i.pillarId === p.id).length,
    });
  });
  styleSheet(ws, [10, 34, 55, 10, 14, 14]);
}

function addObjectivesSheet(wb: Workbook, data: AppData) {
  const ws = wb.addWorksheet("الأهداف");
  ws.columns = [
    { header: "الرمز", key: "code" },
    { header: "الهدف", key: "name" },
    { header: "الركيزة", key: "pillar" },
    { header: "الوصف", key: "description" },
    { header: "الوزن %", key: "weight" },
    { header: "سنة الاستهداف", key: "year" },
  ];
  data.objectives.forEach((o) => {
    ws.addRow({
      code: o.code,
      name: o.name,
      pillar: data.pillars.find((p) => p.id === o.pillarId)?.name ?? "",
      description: o.description,
      weight: o.weight,
      year: o.targetYear,
    });
  });
  styleSheet(ws, [10, 36, 28, 50, 10, 14]);
}

function addInitiativesSheet(wb: Workbook, data: AppData, list = data.initiatives) {
  const ws = wb.addWorksheet("المبادرات");
  ws.columns = [
    { header: "الرمز", key: "code" },
    { header: "المبادرة", key: "name" },
    { header: "الركيزة", key: "pillar" },
    { header: "المالك", key: "owner" },
    { header: "الإدارة", key: "dept" },
    { header: "الحالة", key: "status" },
    { header: "الأولوية", key: "priority" },
    { header: "البداية", key: "start" },
    { header: "النهاية", key: "end" },
    { header: "الميزانية المعتمدة", key: "budget" },
    { header: "المصروف", key: "spent" },
    { header: "نسبة الصرف %", key: "util" },
    { header: "نسبة الإنجاز %", key: "progress" },
    { header: "الأثر المتوقع", key: "impact" },
  ];
  list.forEach((i) => {
    ws.addRow({
      code: i.code,
      name: i.name,
      pillar: data.pillars.find((p) => p.id === i.pillarId)?.name ?? "",
      owner: data.users.find((u) => u.id === i.ownerId)?.name ?? "",
      dept: i.department,
      status: STATUS_LABELS[i.status],
      priority: PRIORITY_LABELS[i.priority],
      start: i.startDate,
      end: i.endDate,
      budget: i.budgetPlanned,
      spent: i.budgetSpent,
      util: i.budgetPlanned ? Math.round((i.budgetSpent / i.budgetPlanned) * 100) : 0,
      progress: Math.round(initiativeProgress(i, data.projects)),
      impact: i.expectedImpact,
    });
  });
  ws.getColumn("budget").numFmt = "#,##0";
  ws.getColumn("spent").numFmt = "#,##0";
  styleSheet(ws, [10, 34, 24, 18, 18, 12, 10, 12, 12, 18, 16, 12, 13, 46]);
}

function addProjectsSheet(wb: Workbook, data: AppData, list = data.projects) {
  const ws = wb.addWorksheet("المشاريع");
  ws.columns = [
    { header: "الرمز", key: "code" },
    { header: "المشروع", key: "name" },
    { header: "المبادرة", key: "init" },
    { header: "المالك", key: "owner" },
    { header: "المورّد", key: "vendor" },
    { header: "الحالة", key: "status" },
    { header: "الأولوية", key: "priority" },
    { header: "البداية", key: "start" },
    { header: "النهاية", key: "end" },
    { header: "الميزانية", key: "budget" },
    { header: "المصروف", key: "spent" },
    { header: "الإنجاز الفعلي %", key: "actual" },
    { header: "الإنجاز المخطط %", key: "planned" },
    { header: "الانحراف", key: "variance" },
    { header: "التقييم", key: "rag" },
    { header: "المعالم المكتملة", key: "msDone" },
    { header: "المعالم المتأخرة", key: "msLate" },
  ];
  const now = new Date();
  list.forEach((p) => {
    ws.addRow({
      code: p.code,
      name: p.name,
      init: data.initiatives.find((i) => i.id === p.initiativeId)?.code ?? "",
      owner: data.users.find((u) => u.id === p.ownerId)?.name ?? "",
      vendor: p.vendor,
      status: STATUS_LABELS[p.status],
      priority: PRIORITY_LABELS[p.priority],
      start: p.startDate,
      end: p.endDate,
      budget: p.budgetPlanned,
      spent: p.budgetSpent,
      actual: Math.round(p.actualProgress),
      planned: Math.round(plannedProgress(p, now)),
      variance: projectVariance(p, now),
      rag: RAG_LABELS[projectRag(p, now)],
      msDone: p.milestones.filter((m) => m.status === "completed").length,
      msLate: p.milestones.filter((m) => m.status === "delayed").length,
    });
  });
  ws.getColumn("budget").numFmt = "#,##0";
  ws.getColumn("spent").numFmt = "#,##0";
  styleSheet(ws, [12, 36, 12, 18, 20, 12, 10, 12, 12, 16, 16, 14, 14, 10, 18, 14, 14]);
}

function addMilestonesSheet(wb: Workbook, data: AppData, list = data.projects) {
  const ws = wb.addWorksheet("المعالم");
  ws.columns = [
    { header: "المشروع", key: "project" },
    { header: "المعلم", key: "name" },
    { header: "تاريخ الاستحقاق", key: "due" },
    { header: "تاريخ الإنجاز", key: "done" },
    { header: "الحالة", key: "status" },
    { header: "الوزن %", key: "weight" },
    { header: "مبرر التأخر", key: "reason" },
  ];
  list.forEach((p) =>
    p.milestones.forEach((m) =>
      ws.addRow({
        project: `${p.code} · ${p.name}`,
        name: m.name,
        due: m.dueDate,
        done: m.completedDate ?? "",
        status: STATUS_LABELS[m.status],
        weight: m.weight,
        reason: m.delayReason,
      }),
    ),
  );
  styleSheet(ws, [38, 34, 16, 16, 12, 10, 52]);
}

function addKpisSheet(wb: Workbook, data: AppData, list = data.kpis) {
  const ws = wb.addWorksheet("مؤشرات الأداء");
  ws.columns = [
    { header: "الرمز", key: "code" },
    { header: "المؤشر", key: "name" },
    { header: "الهدف المرتبط", key: "objective" },
    { header: "المبادرة", key: "init" },
    { header: "منظور قياس", key: "perspective" },
    { header: "الوحدة", key: "unit" },
    { header: "الاتجاه", key: "direction" },
    { header: "خط الأساس", key: "baseline" },
    { header: "المستهدف النهائي", key: "target" },
    { header: "مستهدف الفترة", key: "qTarget" },
    { header: "القيمة الفعلية", key: "actual" },
    { header: "نسبة التحقق %", key: "ach" },
    { header: "التقييم", key: "rag" },
    { header: "الوزن", key: "weight" },
    { header: "آخر تعليق", key: "comment" },
  ];
  list.forEach((k) => {
    const r = latestReading(k);
    const a = achievement(k, r);
    ws.addRow({
      code: k.code,
      name: k.name,
      objective: data.objectives.find((o) => o.id === k.objectiveId)?.name ?? "",
      init: data.initiatives.find((i) => i.id === k.initiativeId)?.code ?? "",
      perspective: data.perspectives.find((p) => p.id === k.perspectiveId)?.name ?? "",
      unit: UNIT_LABELS[k.unit],
      direction: k.direction === "increase" ? "تصاعدي" : "تنازلي",
      baseline: k.baseline,
      target: k.target,
      qTarget: r?.target ?? "",
      actual: r?.actual ?? "",
      ach: a === null ? "" : Math.round(a),
      rag: RAG_LABELS[kpiRag(k, undefined, data.settings.ragGreen, data.settings.ragAmber).rag],
      weight: k.weight,
      comment: r?.comment ?? "",
    });
  });
  styleSheet(ws, [10, 38, 30, 12, 28, 10, 10, 12, 14, 14, 14, 13, 18, 8, 50]);
}

function addReadingsSheet(wb: Workbook, data: AppData, list = data.kpis) {
  const ws = wb.addWorksheet("قراءات المؤشرات");
  ws.columns = [
    { header: "رمز المؤشر", key: "code" },
    { header: "المؤشر", key: "name" },
    { header: "السنة", key: "year" },
    { header: "الربع", key: "quarter" },
    { header: "المستهدف", key: "target" },
    { header: "الفعلي", key: "actual" },
    { header: "نسبة التحقق %", key: "ach" },
    { header: "التعليق", key: "comment" },
    { header: "أُدخلت بواسطة", key: "by" },
  ];
  list.forEach((k) =>
    k.readings.forEach((r) =>
      ws.addRow({
        code: k.code,
        name: k.name,
        year: r.year,
        quarter: r.quarter,
        target: r.target,
        actual: r.actual ?? "",
        ach: r.actual === null ? "" : Math.round(achievement(k, r) ?? 0),
        comment: r.comment,
        by: data.users.find((u) => u.id === r.byUserId)?.name ?? "",
      }),
    ),
  );
  styleSheet(ws, [12, 34, 8, 8, 12, 12, 13, 52, 20]);
}

function addBudgetSheet(wb: Workbook, data: AppData) {
  const ws = wb.addWorksheet("الميزانية");
  ws.columns = [
    { header: "الركيزة", key: "name" },
    { header: "المعتمد", key: "planned" },
    { header: "المصروف", key: "spent" },
    { header: "المتبقي", key: "remaining" },
    { header: "نسبة الصرف %", key: "util" },
    { header: "نسبة الإنجاز %", key: "progress" },
    { header: "كفاءة الإنفاق", key: "eff" },
  ];
  budgetByPillar(data).forEach((r) =>
    ws.addRow({
      name: r.name,
      planned: r.planned,
      spent: r.spent,
      remaining: r.remaining,
      util: Math.round(r.utilization),
      progress: Math.round(r.progress),
      eff: Number(r.efficiency.toFixed(2)),
    }),
  );
  ["planned", "spent", "remaining"].forEach((c) => (ws.getColumn(c).numFmt = "#,##0"));
  styleSheet(ws, [34, 18, 18, 18, 14, 14, 14]);
}

function addSummarySheet(wb: Workbook, data: AppData, filters: Filters) {
  const ws = wb.addWorksheet("الملخص التنفيذي");
  ws.columns = [{ header: "البند", key: "k" }, { header: "القيمة", key: "v" }];
  const inits = filterInitiatives(data, filters);
  const projs = filterProjects(data, filters);
  const kpis = filterKpis(data, filters);
  const now = new Date();
  const w = projs.reduce((s, p) => s + (p.budgetPlanned || 1), 0) || 1;
  const actual = projs.reduce((s, p) => s + p.actualProgress * (p.budgetPlanned || 1), 0) / w;
  const planned = projs.reduce((s, p) => s + plannedProgress(p, now) * (p.budgetPlanned || 1), 0) / w;
  const rows: Array<[string, string | number]> = [
    ["الجهة", data.settings.entityName],
    ["الاستراتيجية", data.settings.strategyName],
    ["فترة التقرير", `الربع ${data.settings.currentQuarter} · ${data.settings.currentYear}`],
    ["تاريخ التصدير", new Date().toISOString().slice(0, 10)],
    ["عدد الركائز", data.pillars.length],
    ["عدد الأهداف", data.objectives.length],
    ["عدد المبادرات", inits.length],
    ["عدد المشاريع", projs.length],
    ["عدد مؤشرات الأداء", kpis.length],
    ["الإنجاز الفعلي %", Math.round(actual)],
    ["الإنجاز المخطط %", Math.round(planned)],
    ["الانحراف عن الخطة", Number((actual - planned).toFixed(1))],
    ["الميزانية المعتمدة", inits.reduce((s, i) => s + i.budgetPlanned, 0)],
    ["المصروف", inits.reduce((s, i) => s + i.budgetSpent, 0)],
    [
      "مؤشرات حمراء",
      kpis.filter((k) => kpiRag(k, undefined, data.settings.ragGreen, data.settings.ragAmber).rag === "red").length,
    ],
    ["معالم متأخرة", projs.reduce((s, p) => s + p.milestones.filter((m) => m.status === "delayed").length, 0)],
  ];
  rows.forEach(([k, v]) => ws.addRow({ k, v }));
  styleSheet(ws, [34, 40]);
}

// ------------------------------------------------------------ نقاط التصدير

export async function exportDashboardXlsx(data: AppData, filters: Filters) {
  const wb = await newWorkbook();
  addSummarySheet(wb, data, filters);
  addPillarsSheet(wb, data);
  addInitiativesSheet(wb, data, filterInitiatives(data, filters));
  addProjectsSheet(wb, data, filterProjects(data, filters));
  addKpisSheet(wb, data, filterKpis(data, filters));
  addBudgetSheet(wb, data);
  await download(wb, `لوحة-القيادة-${stamp()}.xlsx`);
}

export async function exportFullXlsx(data: AppData) {
  const wb = await newWorkbook();
  addSummarySheet(wb, data, { ...EMPTY_FILTERS });
  addPillarsSheet(wb, data);
  addObjectivesSheet(wb, data);
  addInitiativesSheet(wb, data);
  addProjectsSheet(wb, data);
  addMilestonesSheet(wb, data);
  addKpisSheet(wb, data);
  addReadingsSheet(wb, data);
  addBudgetSheet(wb, data);
  await download(wb, `الهيكل-الاستراتيجي-الكامل-${stamp()}.xlsx`);
}

export async function exportInitiativesXlsx(data: AppData, filters: Filters) {
  const wb = await newWorkbook();
  addInitiativesSheet(wb, data, filterInitiatives(data, filters));
  await download(wb, `المبادرات-${stamp()}.xlsx`);
}

export async function exportProjectsXlsx(data: AppData, filters: Filters) {
  const wb = await newWorkbook();
  const list = filterProjects(data, filters);
  addProjectsSheet(wb, data, list);
  addMilestonesSheet(wb, data, list);
  await download(wb, `المشاريع-${stamp()}.xlsx`);
}

export async function exportKpisXlsx(data: AppData, filters: Filters) {
  const wb = await newWorkbook();
  const list = filterKpis(data, filters);
  addKpisSheet(wb, data, list);
  addReadingsSheet(wb, data, list);
  await download(wb, `مؤشرات-الأداء-${stamp()}.xlsx`);
}

export async function exportBudgetXlsx(data: AppData) {
  const wb = await newWorkbook();
  addBudgetSheet(wb, data);
  addInitiativesSheet(wb, data);
  await download(wb, `متابعة-الميزانية-${stamp()}.xlsx`);
}

/** قالب Excel فارغ بالأعمدة المطلوبة للاستيراد */
export async function downloadImportTemplate() {
  const wb = await newWorkbook();

  const p = wb.addWorksheet("الركائز");
  p.columns = [
    { header: "code", key: "a" },
    { header: "name", key: "b" },
    { header: "description", key: "c" },
    { header: "weight", key: "d" },
    { header: "color", key: "e" },
  ];
  p.addRow({ a: "R1", b: "الخدمات الرقمية", c: "وصف الركيزة", d: 25, e: "#1d9af2" });
  styleSheet(p, [12, 34, 46, 12, 14]);

  const o = wb.addWorksheet("الأهداف");
  o.columns = [
    { header: "code", key: "a" },
    { header: "name", key: "b" },
    { header: "pillarCode", key: "c" },
    { header: "description", key: "d" },
    { header: "weight", key: "e" },
    { header: "targetYear", key: "f" },
  ];
  o.addRow({ a: "H1.1", b: "رفع نسبة الخدمات المؤتمتة", c: "R1", d: "وصف الهدف", e: 40, f: 2027 });
  styleSheet(o, [12, 34, 14, 46, 10, 14]);

  const i = wb.addWorksheet("المبادرات");
  i.columns = [
    { header: "code", key: "a" },
    { header: "name", key: "b" },
    { header: "pillarCode", key: "c" },
    { header: "objectiveCodes", key: "d" },
    { header: "ownerEmail", key: "e" },
    { header: "department", key: "f" },
    { header: "status", key: "g" },
    { header: "priority", key: "h" },
    { header: "startDate", key: "j" },
    { header: "endDate", key: "k" },
    { header: "budgetPlanned", key: "l" },
    { header: "budgetSpent", key: "m" },
    { header: "description", key: "n" },
  ];
  i.addRow({
    a: "MB-01",
    b: "مبادرة تجريبية",
    c: "R1",
    d: "H1.1",
    e: "owner@entity.gov.sa",
    f: "الخدمات الرقمية",
    g: "in_progress",
    h: "high",
    j: "2026-01-01",
    k: "2027-12-31",
    l: 1000000,
    m: 250000,
    n: "وصف المبادرة",
  });
  styleSheet(i, [12, 32, 12, 16, 24, 20, 14, 12, 14, 14, 18, 16, 40]);

  const pr = wb.addWorksheet("المشاريع");
  pr.columns = [
    { header: "code", key: "a" },
    { header: "name", key: "b" },
    { header: "initiativeCode", key: "c" },
    { header: "ownerEmail", key: "d" },
    { header: "vendor", key: "e" },
    { header: "status", key: "f" },
    { header: "priority", key: "g" },
    { header: "startDate", key: "h" },
    { header: "endDate", key: "j" },
    { header: "budgetPlanned", key: "k" },
    { header: "budgetSpent", key: "l" },
    { header: "actualProgress", key: "m" },
    { header: "description", key: "n" },
  ];
  pr.addRow({
    a: "MS-01-01",
    b: "مشروع تجريبي",
    c: "MB-01",
    d: "owner@entity.gov.sa",
    e: "داخلي",
    f: "in_progress",
    g: "high",
    h: "2026-01-01",
    j: "2026-12-31",
    k: 500000,
    l: 120000,
    m: 35,
    n: "وصف المشروع",
  });
  styleSheet(pr, [14, 32, 16, 24, 20, 14, 12, 14, 14, 18, 16, 14, 40]);

  const k = wb.addWorksheet("مؤشرات الأداء");
  k.columns = [
    { header: "code", key: "a" },
    { header: "name", key: "b" },
    { header: "objectiveCode", key: "c" },
    { header: "initiativeCode", key: "d" },
    { header: "perspectiveCode", key: "e" },
    { header: "unit", key: "f" },
    { header: "direction", key: "g" },
    { header: "baseline", key: "h" },
    { header: "target", key: "j" },
    { header: "weight", key: "l" },
    { header: "description", key: "m" },
  ];
  k.addRow({
    a: "MO-01",
    b: "مؤشر تجريبي",
    c: "H1.1",
    d: "MB-01",
    e: "M4",
    f: "percent",
    g: "increase",
    h: 30,
    j: 95,
    l: 10,
    m: "وصف المؤشر",
  });
  styleSheet(k, [12, 32, 16, 16, 16, 12, 12, 12, 12, 10, 40]);

  const guide = wb.addWorksheet("إرشادات");
  guide.columns = [{ header: "الحقل", key: "a" }, { header: "القيم المقبولة", key: "b" }];
  [
    ["status", "not_started · in_progress · completed · on_hold · cancelled · delayed"],
    ["priority", "critical · high · medium · low"],
    ["unit", "percent · number · days · sar · index · ratio"],
    ["direction", "increase (كلما زاد كان أفضل) · decrease (كلما قل كان أفضل)"],
    ["objectiveCodes", "رموز الأهداف مفصولة بفاصلة، مثال: H1.1,H1.2"],
    ["التواريخ", "بصيغة YYYY-MM-DD"],
    ["ownerEmail", "بريد مستخدم موجود في المنصة، وإلا يُسند للمستخدم الحالي"],
    ["ترتيب الاستيراد", "الركائز ثم الأهداف ثم المبادرات ثم المشاريع ثم المؤشرات"],
  ].forEach(([a, b]) => guide.addRow({ a, b }));
  styleSheet(guide, [22, 70]);

  await download(wb, `قالب-استيراد-الهيكل-الاستراتيجي.xlsx`);
}

// ------------------------------------------------------------- الاستيراد

export interface ImportResult {
  pillars: AppData["pillars"];
  objectives: AppData["objectives"];
  initiatives: AppData["initiatives"];
  projects: AppData["projects"];
  kpis: AppData["kpis"];
  errors: string[];
  counts: Record<string, number>;
}

const cell = (ws: Worksheet, row: number, col: number | undefined): string => {
  if (!col || col < 1) return "";
  const v = ws.getRow(row).getCell(col).value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "result" in v) return String((v as { result: unknown }).result ?? "");
  if (typeof v === "object" && "text" in v) return String((v as { text: unknown }).text ?? "");
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
};

function headerMap(ws: Worksheet): Record<string, number> {
  const map: Record<string, number> = {};
  const row = ws.getRow(1);
  row.eachCell((c, i) => {
    const key = String(c.value ?? "").trim();
    if (key) map[key] = i;
  });
  return map;
}

/** يقرأ ملف Excel بصيغة القالب ويحوّله إلى كيانات جاهزة للدمج */
export async function importFromExcel(file: File, existing: AppData): Promise<ImportResult> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const errors: string[] = [];
  const out: ImportResult = {
    pillars: [],
    objectives: [],
    initiatives: [],
    projects: [],
    kpis: [],
    errors,
    counts: {},
  };

  const slug = (s: string) => s.replace(/[^\w؀-ۿ]/g, "").toLowerCase();
  const idOf = (prefix: string, code: string) => `${prefix}_${slug(code)}`;

  const pillarIdByCode = new Map(existing.pillars.map((p) => [p.code, p.id]));
  const objIdByCode = new Map(existing.objectives.map((o) => [o.code, o.id]));
  const initIdByCode = new Map(existing.initiatives.map((i) => [i.code, i.id]));
  const perspIdByCode = new Map(existing.perspectives.map((p) => [p.code, p.id]));
  const userIdByEmail = new Map(existing.users.map((u) => [u.email.toLowerCase(), u.id]));

  // ----- الركائز
  const wsP = wb.getWorksheet("الركائز");
  if (wsP) {
    const h = headerMap(wsP);
    for (let r = 2; r <= wsP.rowCount; r++) {
      const code = cell(wsP, r, h["code"]);
      const name = cell(wsP, r, h["name"]);
      if (!code || !name) continue;
      const id = pillarIdByCode.get(code) ?? idOf("p", code);
      pillarIdByCode.set(code, id);
      out.pillars.push({
        id,
        code,
        name,
        description: cell(wsP, r, h["description"]),
        weight: Number(cell(wsP, r, h["weight"])) || 20,
        color: cell(wsP, r, h["color"]) || "#2a206a",
        order: out.pillars.length + 1,
      });
    }
  }

  // ----- الأهداف
  const wsO = wb.getWorksheet("الأهداف");
  if (wsO) {
    const h = headerMap(wsO);
    for (let r = 2; r <= wsO.rowCount; r++) {
      const code = cell(wsO, r, h["code"]);
      const name = cell(wsO, r, h["name"]);
      if (!code || !name) continue;
      const pc = cell(wsO, r, h["pillarCode"]);
      const pillarId = pillarIdByCode.get(pc);
      if (!pillarId) {
        errors.push(`الهدف ${code}: الركيزة «${pc}» غير موجودة — تم تخطي الصف.`);
        continue;
      }
      const id = objIdByCode.get(code) ?? idOf("o", code);
      objIdByCode.set(code, id);
      out.objectives.push({
        id,
        code,
        name,
        pillarId,
        description: cell(wsO, r, h["description"]),
        weight: Number(cell(wsO, r, h["weight"])) || 25,
        targetYear: Number(cell(wsO, r, h["targetYear"])) || existing.settings.strategyEndYear,
      });
    }
  }

  // ----- المبادرات
  const wsI = wb.getWorksheet("المبادرات");
  if (wsI) {
    const h = headerMap(wsI);
    for (let r = 2; r <= wsI.rowCount; r++) {
      const code = cell(wsI, r, h["code"]);
      const name = cell(wsI, r, h["name"]);
      if (!code || !name) continue;
      const pc = cell(wsI, r, h["pillarCode"]);
      const pillarId = pillarIdByCode.get(pc);
      if (!pillarId) {
        errors.push(`المبادرة ${code}: الركيزة «${pc}» غير موجودة — تم تخطي الصف.`);
        continue;
      }
      const id = initIdByCode.get(code) ?? idOf("i", code);
      initIdByCode.set(code, id);
      const objCodes = cell(wsI, r, h["objectiveCodes"])
        .split(/[,،]/)
        .map((x) => x.trim())
        .filter(Boolean);
      out.initiatives.push({
        id,
        code,
        name,
        description: cell(wsI, r, h["description"]),
        expectedImpact: cell(wsI, r, h["expectedImpact"]) || "",
        pillarId,
        objectiveIds: objCodes.map((c) => objIdByCode.get(c)).filter(Boolean) as string[],
        ownerId:
          userIdByEmail.get(cell(wsI, r, h["ownerEmail"]).toLowerCase()) ?? existing.users[0]?.id ?? "u1",
        department: cell(wsI, r, h["department"]),
        status: (cell(wsI, r, h["status"]) || "not_started") as Status,
        priority: (cell(wsI, r, h["priority"]) || "medium") as Priority,
        startDate: cell(wsI, r, h["startDate"]) || `${existing.settings.currentYear}-01-01`,
        endDate: cell(wsI, r, h["endDate"]) || `${existing.settings.strategyEndYear}-12-31`,
        budgetPlanned: Number(cell(wsI, r, h["budgetPlanned"])) || 0,
        budgetSpent: Number(cell(wsI, r, h["budgetSpent"])) || 0,
      });
    }
  }

  // ----- المشاريع
  const wsPr = wb.getWorksheet("المشاريع");
  if (wsPr) {
    const h = headerMap(wsPr);
    for (let r = 2; r <= wsPr.rowCount; r++) {
      const code = cell(wsPr, r, h["code"]);
      const name = cell(wsPr, r, h["name"]);
      if (!code || !name) continue;
      const ic = cell(wsPr, r, h["initiativeCode"]);
      const initiativeId = initIdByCode.get(ic);
      if (!initiativeId) {
        errors.push(`المشروع ${code}: المبادرة «${ic}» غير موجودة — تم تخطي الصف.`);
        continue;
      }
      out.projects.push({
        id: idOf("pr", code),
        code,
        name,
        description: cell(wsPr, r, h["description"]),
        initiativeId,
        ownerId:
          userIdByEmail.get(cell(wsPr, r, h["ownerEmail"]).toLowerCase()) ?? existing.users[0]?.id ?? "u1",
        department: cell(wsPr, r, h["department"]),
        vendor: cell(wsPr, r, h["vendor"]) || "داخلي",
        status: (cell(wsPr, r, h["status"]) || "not_started") as Status,
        priority: (cell(wsPr, r, h["priority"]) || "medium") as Priority,
        startDate: cell(wsPr, r, h["startDate"]) || `${existing.settings.currentYear}-01-01`,
        endDate: cell(wsPr, r, h["endDate"]) || `${existing.settings.currentYear}-12-31`,
        budgetPlanned: Number(cell(wsPr, r, h["budgetPlanned"])) || 0,
        budgetSpent: Number(cell(wsPr, r, h["budgetSpent"])) || 0,
        actualProgress: Math.min(100, Math.max(0, Number(cell(wsPr, r, h["actualProgress"])) || 0)),
        lastUpdatedBy: null,
        lastUpdatedAt: null,
        milestones: [],
        updates: [],
      });
    }
  }

  // ----- المؤشرات
  const wsK = wb.getWorksheet("مؤشرات الأداء");
  if (wsK) {
    const h = headerMap(wsK);
    for (let r = 2; r <= wsK.rowCount; r++) {
      const code = cell(wsK, r, h["code"]);
      const name = cell(wsK, r, h["name"]);
      if (!code || !name) continue;
      const oc = cell(wsK, r, h["objectiveCode"]);
      const objectiveId = objIdByCode.get(oc);
      if (!objectiveId) {
        errors.push(`المؤشر ${code}: الهدف «${oc}» غير موجود — تم تخطي الصف.`);
        continue;
      }
      out.kpis.push({
        id: idOf("k", code),
        code,
        name,
        description: cell(wsK, r, h["description"]),
        objectiveId,
        initiativeId: initIdByCode.get(cell(wsK, r, h["initiativeCode"])) ?? null,
        perspectiveId:
          perspIdByCode.get(cell(wsK, r, h["perspectiveCode"])) ?? existing.perspectives[0]?.id ?? "q1",
        unit: (cell(wsK, r, h["unit"]) || "percent") as AppData["kpis"][number]["unit"],
        direction: (cell(wsK, r, h["direction"]) || "increase") as "increase" | "decrease",
        baseline: Number(cell(wsK, r, h["baseline"])) || 0,
        target: Number(cell(wsK, r, h["target"])) || 100,
        weight: Number(cell(wsK, r, h["weight"])) || 5,
        frequency: "quarterly",
        ownerId: existing.users[0]?.id ?? "u1",
        thresholdGreen: existing.settings.ragGreen,
        thresholdAmber: existing.settings.ragAmber,
        readings: [],
      });
    }
  }

  out.counts = {
    الركائز: out.pillars.length,
    الأهداف: out.objectives.length,
    المبادرات: out.initiatives.length,
    المشاريع: out.projects.length,
    "مؤشرات الأداء": out.kpis.length,
  };
  return out;
}

/** تصدير PDF عبر حوار طباعة المتصفح — يدعم العربية وRTL بالكامل */
export function exportPdf() {
  window.print();
}
