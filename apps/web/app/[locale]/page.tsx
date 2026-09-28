import Link from "next/link";
import { HeroClock } from "@/components/HeroClock";
import { ThemeGallery } from "@/components/ThemeGallery";

const copy = {
  vi: {
    nav: ["Tính năng", "Theme", "Studio", "Tải app"],
    eyebrow: "ĐỒNG HỒ NỔI · CHẠY CỤC BỘ",
    title: "Đến giờ nghỉ, theo cách của bạn.",
    lead: "Horune hẹn Sleep, tắt máy, khóa màn hình hoặc nhắc bạn nghỉ — kể cả khi mất mạng.",
    download: "Tải cho Windows",
    preview: "Thử Theme Studio",
    build: "Bản Windows đang được hoàn thiện",
    strip: ["Không cần tài khoản", "Không gọi API mỗi giây", "Luôn có chế độ mô phỏng"],
    themesKicker: "HORUNE THEMES / 01",
    themesTitle: "Một chiếc đồng hồ. Nhiều nhịp điệu.",
    themesLead: "Cùng một renderer chạy trên web và desktop, để bản xem trước gần với những gì bạn cài.",
    safetyKicker: "OFFLINE & SAFE / 02",
    safetyTitle: "Lịch ở lại trên máy bạn.",
    cards: [
      ["Một scheduler", "Horune dùng một bộ lập lịch cục bộ và tính thời gian từ mốc kết thúc."],
      ["Hành động rõ ràng", "Luôn hiển thị tác vụ và thời điểm trước khi bạn bắt đầu."],
      ["Không bất ngờ", "Lịch quá hạn sau sleep hoặc restart sẽ hỏi lại trước khi thực hiện."]
    ],
    platforms: "Windows trước. macOS tiếp theo. Linux đang phát triển.",
    footer: "Horune · time should feel like yours"
  },
  en: {
    nav: ["Features", "Themes", "Studio", "Download"],
    eyebrow: "FLOATING CLOCK · LOCAL FIRST",
    title: "When it is time to rest, make it yours.",
    lead: "Horune schedules sleep, shutdown, lock, or a gentle reminder — even when you are offline.",
    download: "Download for Windows",
    preview: "Try Theme Studio",
    build: "The Windows preview is being finalized",
    strip: ["No account required", "No per-second API calls", "Simulation mode included"],
    themesKicker: "HORUNE THEMES / 01",
    themesTitle: "One clock. Many rhythms.",
    themesLead: "The same renderer powers web and desktop, so previews stay close to what you install.",
    safetyKicker: "OFFLINE & SAFE / 02",
    safetyTitle: "Your schedule stays on your device.",
    cards: [
      ["One scheduler", "Horune uses one local scheduler and derives time from a fixed deadline."],
      ["Clear actions", "The action and exact finish time are shown before you start."],
      ["No surprises", "Overdue schedules after sleep or restart always ask before running."]
    ],
    platforms: "Windows first. macOS next. Linux in development.",
    footer: "Horune · time should feel like yours"
  }
} as const;

export default async function LandingPage({ params }: { params: Promise<{ locale: "vi" | "en" }> }) {
  const { locale } = await params;
  const t = copy[locale];
  const otherLocale = locale === "vi" ? "en" : "vi";

  return (
    <main className="landing h-dot-grid">
      <header className="site-header" aria-label="Primary navigation">
        <Link className="brand" href={`/${locale}`} aria-label="Horune home">
          <img className="brand-mark" src="/horune-mark.png" alt="" aria-hidden="true" />
          <span>HORUNE</span>
        </Link>
        <nav className="nav-links">
          <a href="#features">{t.nav[0]}</a><a href="#themes">{t.nav[1]}</a><Link href={`/${locale}/studio`}>{t.nav[2]}</Link><a href="#download">{t.nav[3]}</a>
        </nav>
        <Link className="locale-switch" href={`/${otherLocale}`} hrefLang={otherLocale}>{otherLocale.toUpperCase()}</Link>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker h-label"><i />{t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
          <div className="hero-actions">
            <a className="h-button h-button--primary" href="#download">{t.download}<span aria-hidden="true">↘</span></a>
            <Link className="h-button h-button--accent" href={`/${locale}/studio`}>{t.preview}<span aria-hidden="true">✦</span></Link>
          </div>
          <span className="build-note"><span aria-hidden="true">●</span>{t.build}</span>
        </div>
        <HeroClock locale={locale} />
      </section>

      <div className="trust-strip" aria-label="Horune principles">
        {t.strip.map((item, index) => <span key={item}><b>0{index + 1}</b>{item}</span>)}
      </div>

      <section className="themes-section" id="themes">
        <div className="section-heading"><span className="h-label">{t.themesKicker}</span><h2>{t.themesTitle}</h2><p>{t.themesLead}</p></div>
        <ThemeGallery locale={locale} />
      </section>

      <section className="safety-section" id="features">
        <div className="section-heading"><span className="h-label">{t.safetyKicker}</span><h2>{t.safetyTitle}</h2></div>
        <div className="feature-grid">
          {t.cards.map(([title, body], index) => <article className="h-card feature-card" key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}
        </div>
      </section>

      <section className="download-section h-card" id="download">
        <div><span className="h-label">DESKTOP MVP</span><h2>{t.platforms}</h2></div>
        <button className="h-button" disabled aria-describedby="download-status">{t.download}</button>
        <span id="download-status" className="sr-only">{t.build}</span>
      </section>

      <footer><span>{t.footer}</span><span className="h-label">© 2026 HORUNE</span></footer>
    </main>
  );
}
