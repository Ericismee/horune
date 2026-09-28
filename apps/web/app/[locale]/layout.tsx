import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@horune/design-system/fonts";
import "@horune/design-system/styles.css";
import "@horune/theme-renderer/styles.css";
import "@horune/theme-studio/styles.css";
import "../globals.css";

const LOCALES = ["vi", "en"] as const;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const vi = locale === "vi";
  return {
    title: vi ? "Horune — Hẹn giờ cho máy nghỉ" : "Horune — Schedule rest, keep time in sight",
    description: vi
      ? "Hẹn giờ Sleep, tắt máy, khóa màn hình hoặc nhắc nhở bằng đồng hồ nổi. Lịch chạy cục bộ và hoạt động offline."
      : "Schedule sleep, shutdown, screen lock, or reminders with a floating clock that keeps working offline.",
    alternates: { canonical: `/${locale}`, languages: { vi: "/vi", en: "/en", "x-default": "/en" } },
    openGraph: {
      title: vi ? "Horune — Hẹn giờ cho máy nghỉ" : "Horune — Schedule rest, keep time in sight",
      description: vi ? "Bộ hẹn giờ desktop offline-first với đồng hồ nổi có thể tùy biến." : "An offline-first desktop timer with a customizable floating clock.",
      locale: vi ? "vi_VN" : "en_US",
      alternateLocale: vi ? ["en_US"] : ["vi_VN"],
      type: "website"
    }
  };
}

export default async function LocaleLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as (typeof LOCALES)[number])) notFound();
  return <html lang={locale}><body>{children}</body></html>;
}
