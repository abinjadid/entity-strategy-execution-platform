"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gauge, Info, Printer, Save } from "lucide-react";

import { HorizontalBars } from "@/components/charts";
import {
  Button,
  Card,
  CardHead,
  Chip,
  EmptyState,
  Field,
  Input,
  Modal,
  PageTitle,
  ProgressBar,
  RagBadge,
  StatCard,
  TableWrap,
  Td,
  Th,
  Toast,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { can } from "@/lib/rbac";
import { kpiIndex, kpiRag } from "@/lib/calc";
import { num, pct } from "@/lib/format";

export default function QiyasPage() {
  const data = useStore((s) => s.data);
  const currentUserId = useStore((s) => s.currentUserId);
  const updatePerspective = useStore((s) => s.updatePerspective);
  const user = data.users.find((u) => u.id === currentUserId) ?? null;
  const editable = can(user?.role, "structure.manage");

  const [editing, setEditing] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [targetScore, setTargetScore] = useState("");
  const [weight, setWeight] = useState("");
  const [toast, setToast] = useState("");

  const { ragGreen, ragAmber } = data.settings;

  const rows = useMemo(
    () =>
      data.perspectives.map((p) => {
        const kpis = data.kpis.filter((k) => k.perspectiveId === p.id);
        const idx = kpiIndex(kpis, ragGreen, ragAmber);
        const red = kpis.filter((k) => kpiRag(k, undefined, ragGreen, ragAmber).rag === "red").length;
        return { p, kpis, idx, red };
      }),
    [data.perspectives, data.kpis, ragGreen, ragAmber],
  );

  const overall = useMemo(() => {
    const w = data.perspectives.reduce((s, p) => s + p.weight, 0) || 1;
    return data.perspectives.reduce((s, p) => s + p.score * p.weight, 0) / w;
  }, [data.perspectives]);

  const overallPrev = useMemo(() => {
    const w = data.perspectives.reduce((s, p) => s + p.weight, 0) || 1;
    return data.perspectives.reduce((s, p) => s + p.previousScore * p.weight, 0) / w;
  }, [data.perspectives]);

  const overallTarget = useMemo(() => {
    const w = data.perspectives.reduce((s, p) => s + p.weight, 0) || 1;
    return data.perspectives.reduce((s, p) => s + p.targetScore * p.weight, 0) / w;
  }, [data.perspectives]);

  const uncovered = rows.filter((r) => !r.kpis.length).length;

  const open = (id: string) => {
    const p = data.perspectives.find((x) => x.id === id);
    if (!p) return;
    setEditing(id);
    setScore(String(p.score));
    setTargetScore(String(p.targetScore));
    setWeight(String(p.weight));
  };

  const save = () => {
    if (!editing) return;
    updatePerspective(editing, {
      score: Math.max(0, Math.min(100, Number(score) || 0)),
      targetScore: Math.max(0, Math.min(100, Number(targetScore) || 0)),
      weight: Math.max(0, Number(weight) || 0),
    });
    setEditing(null);
    setToast("تم تحديث درجة المنظور");
  };

  return (
    <>
      <PageTitle
        title="إطار قياس التحول الرقمي — المناظير العشرة"
        subtitle="مواءمة الهيكل الاستراتيجي مع مناظير إطار القياس، وربط كل مؤشر أداء بالمنظور الذي يخدمه"
        actions={
          <Button variant="primary" onClick={() => window.print()}>
            <Printer size={16} />
            تصدير PDF
          </Button>
        }
      />

      <div className="flex gap-3 rounded-[12px] border border-dga-blue/25 bg-dga-blue/5 p-4 mb-5 no-print">
        <Info size={17} className="shrink-0 mt-0.5 text-dga-blue-400" />
        <p className="text-[12.5px] text-n700 leading-[1.85]">
          مسميات المناظير العشرة أدناه مبنية على الفهم العام لإطار قياس التحول الرقمي الحكومي، وهي
          قابلة للتعديل بالكامل من هذه الشاشة لمواءمتها مع النسخة الرسمية المعتمدة لدى الجهة. تعديل
          مسمى المنظور أو وزنه لا يؤثر على ارتباط المؤشرات به.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard
          label="الدرجة الإجمالية لإطار قياس"
          value={pct(overall, 1)}
          icon={<Gauge size={16} />}
          accent="#2a206a"
          sub={`المستهدف ${pct(overallTarget, 1)}`}
          trend={{ value: overall - overallPrev, label: "نقطة عن القياس السابق" }}
        />
        <StatCard label="القياس السابق" value={pct(overallPrev, 1)} accent="#767286" sub="نتيجة الدورة الماضية" />
        <StatCard
          label="مؤشرات مربوطة بمناظير"
          value={num(data.kpis.filter((k) => k.perspectiveId).length)}
          accent="#1cc182"
          sub={`من ${num(data.kpis.length)} مؤشراً`}
        />
        <StatCard
          label="مناظير بلا مؤشرات"
          value={num(uncovered)}
          accent={uncovered ? "#c40000" : "#1cc182"}
          sub={uncovered ? "تحتاج ربط مؤشرات لتغطية القياس" : "كل المناظير مغطاة بمؤشرات"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3 mb-5">
        <Card className="xl:col-span-2">
          <CardHead
            title="درجات المناظير العشرة"
            subtitle="الدرجة الحالية لكل منظور وفق آخر دورة تقييم"
          />
          <div className="p-4">
            <HorizontalBars
              height={400}
              data={data.perspectives.map((p) => ({
                name: p.code,
                value: p.score,
                color: p.score >= 85 ? "#1cc182" : p.score >= 70 ? "#1d9af2" : p.score >= 55 ? "#ffa300" : "#c40000",
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardHead title="توزيع المؤشرات على المناظير" subtitle="عدد مؤشرات الأداء المرتبطة بكل منظور" />
          <ul className="divide-y divide-n100 max-h-[430px] overflow-y-auto">
            {rows.map(({ p, kpis, idx }) => (
              <li key={p.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-[12.5px] font-bold text-ink truncate">
                    <span className="text-n500 tnum me-1.5">{p.code}</span>
                    {p.name}
                  </span>
                  <span className="text-[12px] font-bold text-ink tnum shrink-0">{kpis.length}</span>
                </div>
                {kpis.length ? (
                  <div className="flex items-center gap-2.5">
                    <ProgressBar value={Math.min(100, idx)} showPlanned={false} color="#2a206a" />
                    <span className="text-[11.5px] font-semibold text-n700 tnum w-10 shrink-0">
                      {Math.round(idx)}%
                    </span>
                  </div>
                ) : (
                  <p className="text-[11.5px] text-dga-red">لا توجد مؤشرات مرتبطة بهذا المنظور</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHead
          title="تفصيل المناظير"
          subtitle="الدرجة والوزن والمؤشرات المرتبطة بكل منظور من مناظير إطار القياس"
        />
        <TableWrap>
          <thead>
            <tr>
              <Th width={60}>الرمز</Th>
              <Th>المنظور</Th>
              <Th width={70}>الوزن</Th>
              <Th width={190}>الدرجة الحالية</Th>
              <Th width={100}>السابق</Th>
              <Th width={100}>المستهدف</Th>
              <Th width={110}>المؤشرات</Th>
              <Th width={90}>الحالة</Th>
              {editable ? <Th width={100}>الإجراء</Th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, kpis, red }) => (
              <tr key={p.id} className="hover:bg-n50 transition-colors">
                <Td>
                  <Chip>{p.code}</Chip>
                </Td>
                <Td>
                  <span className="block text-[13px] font-bold text-ink">{p.name}</span>
                  <span className="block text-[11.5px] text-n500 mt-0.5 leading-relaxed">{p.description}</span>
                </Td>
                <Td className="text-[12.5px] font-semibold tnum">{p.weight}%</Td>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <ProgressBar
                      value={p.score}
                      planned={p.targetScore}
                      color={p.score >= 85 ? "#1cc182" : p.score >= 70 ? "#2a206a" : p.score >= 55 ? "#ffa300" : "#c40000"}
                    />
                    <span className="text-[12.5px] font-bold tnum w-9 shrink-0">{p.score}</span>
                  </div>
                </Td>
                <Td className="text-[12.5px] tnum">{p.previousScore}</Td>
                <Td className="text-[12.5px] tnum">{p.targetScore}</Td>
                <Td className="text-[12px] tnum">
                  {kpis.length}
                  {red ? <span className="text-dga-red font-bold"> · {red} أحمر</span> : null}
                </Td>
                <Td>
                  <RagBadge
                    rag={p.score >= 85 ? "green" : p.score >= 65 ? "amber" : "red"}
                    label={p.score >= 85 ? "متقدم" : p.score >= 65 ? "متوسط" : "يحتاج تحسين"}
                  />
                </Td>
                {editable ? (
                  <Td>
                    <Button size="sm" onClick={() => open(p.id)}>
                      تحديث
                    </Button>
                  </Td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </TableWrap>
        {!rows.length ? <EmptyState title="لا توجد مناظير معرّفة" /> : null}
      </Card>

      <Card className="mt-5">
        <CardHead
          title="المؤشرات المرتبطة بكل منظور"
          subtitle="أثر مؤشرات الأداء التشغيلية على درجة كل منظور في إطار القياس"
        />
        <div className="p-5 space-y-5">
          {rows
            .filter((r) => r.kpis.length)
            .map(({ p, kpis }) => (
              <div key={p.id} className="print-block">
                <p className="text-[13px] font-bold text-ink mb-2.5">
                  <span className="text-n500 tnum me-2">{p.code}</span>
                  {p.name}
                </p>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {kpis.map((k) => {
                    const { rag, pct: a } = kpiRag(k, undefined, ragGreen, ragAmber);
                    return (
                      <Link
                        key={k.id}
                        href={`/kpis/${k.id}`}
                        className="flex items-center gap-2.5 rounded-[10px] border border-n200 p-3 hover:border-dga-navy transition-colors"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] font-semibold text-ink truncate">{k.name}</span>
                          <span className="block text-[11px] text-n500 tnum mt-0.5">{k.code}</span>
                        </span>
                        <RagBadge rag={rag} label={a === null ? "بانتظار" : `${Math.round(a)}%`} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </Card>

      {editing ? (
        <Modal
          open
          onClose={() => setEditing(null)}
          title="تحديث درجة المنظور"
          subtitle={data.perspectives.find((p) => p.id === editing)?.name}
          width="max-w-lg"
          footer={
            <>
              <Button variant="primary" onClick={save}>
                <Save size={15} />
                حفظ
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                إلغاء
              </Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="الدرجة الحالية" hint="من 0 إلى 100" required>
              <Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} />
            </Field>
            <Field label="المستهدف" hint="من 0 إلى 100" required>
              <Input type="number" min={0} max={100} value={targetScore} onChange={(e) => setTargetScore(e.target.value)} />
            </Field>
            <Field label="الوزن %" required>
              <Input type="number" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} />
            </Field>
          </div>
        </Modal>
      ) : null}

      {toast ? <Toast message={toast} onDone={() => setToast("")} /> : null}
    </>
  );
}
