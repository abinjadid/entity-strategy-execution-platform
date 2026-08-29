import type { Metadata, Viewport } from "next";

import { THEME_INIT_SCRIPT, ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام إدارة استراتيجية التحول الرقمي",
  description:
    "منصة تربط الركائز والأهداف بالمبادرات والمشاريع ومؤشرات الأداء، وتتابع تنفيذ استراتيجية التحول الرقمي لحظة بلحظة.",
  applicationName: "نظام إدارة استراتيجية التحول الرقمي",
  icons: { icon: "/brand/dga-emblem.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2a206a" },
    { media: "(prefers-color-scheme: dark)", color: "#14122a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/* يطبّق الوضع المحفوظ قبل أول رسم لمنع وميض الوضع الفاتح */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
