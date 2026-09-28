import Link from "next/link";
import { ThemeStudio } from "@horune/theme-studio";

export default async function StudioPage({ params }: { params: Promise<{ locale: "vi" | "en" }> }) {
  const { locale } = await params;
  return (
    <main className="studio-page h-dot-grid">
      <nav className="studio-page__nav" aria-label={locale === "vi" ? "Điều hướng Studio" : "Studio navigation"}>
        <Link className="brand" href={`/${locale}`}><img className="brand-mark" src="/horune-mark.png" alt="" aria-hidden="true" /><span>HORUNE</span></Link>
        <Link className="h-button" href={`/${locale}`}>{locale === "vi" ? "← Về trang chủ" : "← Back home"}</Link>
      </nav>
      <ThemeStudio locale={locale} storageKey={`horune.theme-studio.v1.${locale}`} />
    </main>
  );
}
