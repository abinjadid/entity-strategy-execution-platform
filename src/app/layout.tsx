import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة رصد تنفيذ استراتيجية التحول الرقمي",
  description:
    "منصة تربط الركائز والأهداف بالمبادرات والمشاريع ومؤشرات الأداء، وتتابع تنفيذ استراتيجية التحول الرقمي لحظة بلحظة.",
  applicationName: "منصة رصد تنفيذ الاستراتيجية",
  icons: { icon: "/brand/dga-emblem.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2a206a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* خط احتياطي عربي يُستخدم فقط في حال عدم توفر ملفات Diodrum Arabic
            (الخط الأساسي لهوية الهيئة الرقمية) في بيئة النشر. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
