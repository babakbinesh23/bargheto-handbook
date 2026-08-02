import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "هندبوک برقتو",
  description: "مسیر آشنایی و شروع همکاری با برقتو",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
