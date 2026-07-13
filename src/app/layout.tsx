import type { Metadata } from "next";
import { Noto_Kufi_Arabic, Inter } from "next/font/google";
import "./globals.css";

const arabicFont = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-arabic",
});

const interFont = Inter({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "مُتقِن | إدارة تقارير حلقات تحفيظ القرآن الكريم",
  description: "المنصة الأسهل لمتابعة حفظ ومراجعة طلاب حلقات تحفيظ القرآن الكريم يومياً. بديل منظم لمجموعات الواتساب.",
  keywords: ["تحفيظ القرآن", "حلقات القرآن", "متابعة الحفظ", "تقارير تحفيظ", "متقن"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${arabicFont.variable} ${interFont.variable} antialiased`}
    >
      <body className="font-sans min-h-screen bg-stone-50/50 dark:bg-[#121212] text-stone-900 dark:text-stone-100 flex flex-col">
        {children}
      </body>
    </html>
  );
}

