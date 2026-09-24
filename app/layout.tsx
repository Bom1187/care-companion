import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Care Companion | เพื่อนร่วมทางที่คุณไว้ใจ",
  description: "แพลตฟอร์มเชื่อมต่อผู้ต้องการความช่วยเหลือกับ Companion ที่เหมาะสม",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
