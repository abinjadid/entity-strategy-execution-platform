"use client";

import { useMemo, useState } from "react";
import { Printer, Radar as RadarIcon, Save } from "lucide-react";

import { MaturityRadar } from "@/components/charts";
import {
  Button,
  Card,
  CardHead,
  Field,
  Input,
  Modal,
  PageTitle,
  ProgressBar,
  StatCard,
  TableWrap,
  Td,
  Th,
  Toast,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { can } from "@/lib/rbac";
import { num, pct } from "@/lib/format";

const LEVELS = [
  { level: 1, name: "أولي", desc: "ممارسات غير موثقة تعتمد على الجهود الفردية." },
  { level: 2, name: "متكرر", desc: "ممارسات متكررة لكنها غير موحدة على مستوى الجهة." },
  { level: 3, name: "معرّف", desc: "ممارسات موثقة ومعتمدة ومطبقة بشكل موحد." },
  { level: 4, name: "مُدار ومقاس", desc: "ممارسات مقاسة بمؤشرات وتُدار بالبيانات." },
  { level: 5, name: "محسّن", desc: "تحسين مستمر قائم على التحليل والابتكار." },
];

export default function MaturityPage() {
  const data = useStore((s) => s.data);
  const currentUserId = useStore((s) => s.currentUserId);
  const updateMaturity = useStore((s) => s.updateMaturity);
  const user = data.users.find((u) => u.id === currentUserId) ?? null;
  const editable = can(user?.role, "structure.manage");

  const [editing, setEditing] = useState<string | null>(null);
  const [current, setCurrent] = useState("");
  const [target, setTarget] = useState("");
  const [toast, setToast] = useState("");

  const radar = useMemo(
    () =>
      data.maturity.map((m) => ({
        domain: m.name,
        current: m.current,
        target: m.target,
        previous: m.previous,
      })),
    [data.maturity],
  );

  const avg = useMemo(() => {
    if (!data.maturity.length) return { cur: 0, prev: 0, tgt: 0 };
    const n = data.maturity.length;
    return {
      cur: data.maturity.reduce((s, m) => s + m.current, 0) / n,
      prev: data.maturity.reduce((s, m) => s + m.previous, 0) / n,
      tgt: data.maturity.reduce((s, m) => s + m.target, 0) / n,
    };
  }, [data.maturity]);

  const weakest = useMemo(
    () => data.maturity.slice().sort((a, b) => a.current - b.current)[0],
    [data.maturity],
  );

  const open = (id: string) => {
    const m = data.maturity.find((x) => x.id === id);
    if (!m) return;
    setEditing(id);
    setCurrent(String(m.current));
    setTarget(String(m.target));
  };

  const save = () => {
    if (!editing) return;
    updateMaturity(editing, {
      current: Math.max(0, Math.min(5, Number(current) || 0)),
      target: Math.max(0, Math.min(5, Number(target) || 0)),
    });
    setEditing(null);
    setToast("تم تحديث تقييم النضج للبُعد");
  };

  const levelName = (v: number) => LEVELS[Math.max(0, Math.min(4, Math.round(v) - 1))]?.name ?? "—";

  return (
    <>
      <PageTitle
        title="رادار النضج الرقمي"
        subtitle="تقييم مستوى النضج على مقياس من 1 إلى 5 عبر ثمانية أبعاد مؤسسية، مقارناً بالقياس السابق وبالمستهدف"
        actions={
          <Button variant="primary" onClick={() => window.print()}>
            <Printer size={16} />
            تصدير PDF
          </Button>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard
          label="متوسط النضج الحالي"
          value={num(avg.cur, 1)}
          icon={<RadarIcon size={16} />}
          accent="#2a206a"
          sub={`المستوى ${levelName(avg.cur)} من 5`}
          trend={{ value: avg.cur - avg.prev, label: "عن القياس السابق" }}
        />
        <StatCard label="القياس السابق" value={num(avg.prev, 1)} accent="#767286" sub="نتيجة الدورة الماضية" />
        <StatCard
          label="المستهدف"
          value={num(avg.tgt, 1)}
          accent="#852cd0"
          sub={`الفجوة ${num(avg.tgt - avg.cur, 1)} نقطة`}
        />
        <StatCard
          label="أضعف بُعد"
          value={num(weakest?.current ?? 0, 1)}
          accent="#c40000"
          sub={weakest?.name ?? "—"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-5 mb-5">
        <Card className="xl:col-span-3">
          <CardHead
            title="رادار النضج الرقمي"
            subtitle="الحالي مقابل المستهدف والقياس السابق عبر الأبعاد الثمانية"
          />
          <div className="p-4">
            <MaturityRadar data={radar} height={420} />
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHead title="مستويات النضج المرجعية" subtitle="مقياس من خمسة مستويات معتمد في التقييم" />
          <ul className="divide-y divide-n100">
            {LEVELS.map((l) => (
              <li key={l.level} className="flex gap-3.5 px-5 py-3.5">
                <span className="shrink-0 w-8 h-8 rounded-[9px] bg-dga-navy text-white grid place-items-center text-[13px] font-bold">
                  {l.level}
                </span>
                <span>
                  <span className="block text-[13px] font-bold text-ink">{l.name}</span>
                  <span className="block text-[12px] text-n500 mt-1 leading-relaxed">{l.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHead
          title="تفصيل أبعاد النضج"
          subtitle={
            editable
              ? "يمكن لمدير النظام ومكتب المشاريع تحديث التقييم بعد كل دورة قياس"
              : "التقييم معروض للاطلاع — التحديث من صلاحية مدير النظام ومكتب المشاريع"
          }
        />
        <TableWrap>
          <thead>
            <tr>
              <Th>البُعد</Th>
              <Th width={230}>المستوى الحالي</Th>
              <Th width={110}>القياس السابق</Th>
              <Th width={100}>المستهدف</Th>
              <Th width={100}>الفجوة</Th>
              <Th width={120}>التصنيف</Th>
              {editable ? <Th width={110}>الإجراء</Th> : null}
            </tr>
          </thead>
          <tbody>
            {data.maturity.map((m) => {
              const gap = m.target - m.current;
              return (
                <tr key={m.id} className="hover:bg-n50 transition-colors">
                  <Td>
                    <span className="block text-[13px] font-bold text-ink">{m.name}</span>
                    <span className="block text-[11.5px] text-n500 mt-0.5 leading-relaxed">{m.description}</span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <ProgressBar
                        value={(m.current / 5) * 100}
                        planned={(m.target / 5) * 100}
                        color={m.current >= m.target ? "#1cc182" : m.current >= 3 ? "#2a206a" : "#ffa300"}
                      />
                      <span className="text-[12.5px] font-bold tnum w-8 shrink-0">{m.current.toFixed(1)}</span>
                    </div>
                  </Td>
                  <Td className="text-[12.5px] tnum">{m.previous.toFixed(1)}</Td>
                  <Td className="text-[12.5px] tnum">{m.target.toFixed(1)}</Td>
                  <Td>
                    <span className={`text-[12.5px] font-bold tnum ${gap > 1 ? "text-dga-red" : gap > 0.5 ? "text-[#8a5a00]" : "text-dga-green-400"}`}>
                      {gap.toFixed(1)}
                    </span>
                  </Td>
                  <Td className="text-[12.5px] font-semibold">{levelName(m.current)}</Td>
                  {editable ? (
                    <Td>
                      <Button size="sm" onClick={() => open(m.id)}>
                        تحديث
                      </Button>
                    </Td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </Card>

      <p className="mt-6 text-[11.5px] text-n500 leading-relaxed">
        تُحدَّث نتائج الرادار بعد كل دورة تقييم نضج، ويُقارن القياس الحالي بالقياس السابق لرصد أثر
        المبادرات على النضج المؤسسي. الأبعاد قابلة للتعديل من شاشة إدارة المنصة لتتوافق مع نموذج
        التقييم المعتمد لدى الجهة.
      </p>

      {editing ? (
        <Modal
          open
          onClose={() => setEditing(null)}
          title="تحديث تقييم النضج"
          subtitle={data.maturity.find((m) => m.id === editing)?.name}
          width="max-w-lg"
          footer={
            <>
              <Button variant="primary" onClick={save}>
                <Save size={15} />
                حفظ التقييم
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                إلغاء
              </Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="المستوى الحالي" hint="من 1 إلى 5" required>
              <Input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </Field>
            <Field label="المستوى المستهدف" hint="من 1 إلى 5" required>
              <Input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </Field>
          </div>
          <p className="text-[12.5px] text-n700 mt-4 rounded-[10px] border border-n200 bg-n50 p-3.5 leading-relaxed">
            يُحتفظ بالقياس السابق كما هو للمقارنة. لتسجيل دورة قياس جديدة، انقل القيمة الحالية إلى
            «القياس السابق» من شاشة إدارة المنصة قبل إدخال النتيجة الجديدة.
          </p>
        </Modal>
      ) : null}

      {toast ? <Toast message={toast} onDone={() => setToast("")} /> : null}
    </>
  );
}
