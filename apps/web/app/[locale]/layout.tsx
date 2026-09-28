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
    title: vi ? "Horune — Hẹn giờ theo cách của bạn" : "Horune — Time it your way",
    description: vi
      ? "Hẹn giờ Sleep, tắt máy, khóa màn hình và nhắc nhở bằng đồng hồ nổi có thể tùy biến."
      : "Schedule sleep, shutdown, lock, and reminders with a customizable floating clock.",
    alternates: { canonical: `/${locale}`, languages: { vi: "/vi", en: "/en" } }
  };
}

export default async function LocaleLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as (typeof LOCALES)[number])) notFound();
  return <html lang={locale}><body>{children}</body></html>;
}
