import Image from "next/image";
import Link from "next/link";
import { HeroClock } from "@/components/HeroClock";
import { ThemeGallery } from "@/components/ThemeGallery";

const copy = {
  vi: {
    navLabel: "Điều hướng chính", menu: "Menu",
    nav: { timer: "Bộ hẹn giờ", themes: "Theme", studio: "Studio", community: "Cộng đồng", platforms: "Nền tảng", faq: "FAQ" },
    eyebrow: "BỘ HẸN GIỜ DESKTOP · OFFLINE-FIRST",
    title: "Hẹn giờ cho máy nghỉ. Giữ thời gian trong tầm mắt.",
    lead: "Chọn thời điểm Sleep, tắt máy, khóa máy hoặc nhận lời nhắc. Horune đếm ngược trên chiếc đồng hồ nổi và vẫn hoạt động khi bạn mất mạng.",
    primary: "Mở Theme Studio", secondary: "Xem cách hẹn giờ hoạt động",
    accountNote: "Dùng bộ hẹn giờ không cần tài khoản. Đăng nhập khi bạn muốn lưu, đồng bộ, chia sẻ hoặc mua theme.",
    accountStatus: "Horune Account đang được phát triển; hiện chưa có form đăng nhập hoạt động.",
    build: "Có source và build CI cho Windows/macOS · chưa phát hành bản cài ký số",
    strip: ["Lịch chạy trên máy", "Mô phỏng bật mặc định", "Không cần tài khoản để hẹn giờ"],
    timerKicker: "BỘ HẸN GIỜ / 01", timerTitle: "Chọn hành động. Kiểm tra thời điểm. Luôn giữ quyền kiểm soát.",
    timerLead: "Desktop xử lý lịch bằng một scheduler cục bộ. Website không thể ra lệnh Sleep hoặc tắt máy cho thiết bị của bạn.",
    timerSteps: [
      ["Chọn khi nào", "Đặt theo số phút hoặc một ngày giờ cụ thể; Horune luôn hiển thị thời điểm kết thúc trước khi bắt đầu."],
      ["Chọn điều gì xảy ra", "Sleep, tắt máy, khóa màn hình hoặc chỉ nhắc nhở. Simulation cho phép thử toàn bộ luồng mà không tác động hệ thống."],
      ["Theo dõi trên đồng hồ nổi", "Xem thời gian còn lại, tạm dừng, cộng 5 phút hoặc hủy ngay từ overlay và khay hệ thống."],
      ["Trở lại an toàn", "Lịch đã quá hạn sau sleep, restart hoặc đổi giờ sẽ chờ bạn xác nhận thay vì tự chạy."]
    ],
    themesKicker: "THEME / 02", themesTitle: "Một bộ đếm. Năm cách bắt đầu.",
    themesLead: "Thử các theme tích hợp ngay trên trang. Preview và desktop dùng chung schema cùng renderer khai báo.",
    studioKicker: "THEME STUDIO / 03", studioTitle: "Thiết kế đồng hồ của riêng bạn, không cần viết mã.",
    studioLead: "Studio hiện là editor thật trên web và desktop: chỉnh loại đồng hồ, màu, gradient, layer, motion, undo/redo, draft cục bộ và Theme JSON đã xác thực.",
    studioCta: "Bắt đầu từ theme mẫu", studioNow: "Hoạt động hiện tại", studioNext: "Mốc tiếp theo",
    studioNowItems: ["Digital, analog, flip, word và hybrid", "Layer text/sticker có kéo, khóa, ẩn và sắp thứ tự", "Draft trên thiết bị, undo/redo, import/export JSON"],
    studioNextItems: ["Chọn nhiều layer, group, constraint và auto layout", "PNG/WebP/GIF/SVG an toàn cùng theme package", "Component, variant, timeline và asset profiling"],
    communityKicker: "CỘNG ĐỒNG / 04 · PLANNED", communityTitle: "Khám phá và remix sẽ đến sau tài khoản chung.",
    communityLead: "Hồ sơ creator, follow, bình luận, remix, theme trả phí và quyền sở hữu chưa hoạt động. Chúng chỉ mở khi API, kiểm duyệt, phân quyền và thanh toán sandbox đã có kiểm thử.",
    communityItems: [
      ["Khách", "Sẽ được xem và thử theme công khai mà không cần đăng nhập."],
      ["Horune Account", "Sẽ dùng chung giữa web và desktop cho thư viện, đồng bộ và giao dịch."],
      ["Creator", "Sẽ có phiên bản, attribution, giấy phép, duyệt nội dung và báo cáo vi phạm."]
    ],
    roadmap: "Xem roadmap có trạng thái",
    offlineKicker: "OFFLINE & AN TOÀN / 05", offlineTitle: "Mất mạng không làm mất lịch đang chạy.",
    safetyCards: [
      ["Một scheduler", "Không tạo vòng lặp riêng cho từng lịch; thời gian còn lại luôn được tính từ deadline."],
      ["Tách khỏi tài khoản", "Đăng nhập, đăng xuất hoặc hết phiên sau này không được dừng lịch cục bộ."],
      ["Theme chỉ là dữ liệu", "Manifest không chứa JavaScript, HTML/CSS tùy ý, URL thực thi hoặc lệnh hệ thống."]
    ],
    platformsKicker: "NỀN TẢNG / 06", platformsTitle: "Build đã có. Phát hành vẫn cần kiểm chứng phần cứng.",
    platforms: [
      ["Windows", "Build đã xác minh trong CI", "Rust tests và NSIS bundle đã qua. Hành động nguồn điện thật và ký số vẫn chưa xác minh."],
      ["macOS", "Build đã xác minh trong CI", "Rust tests và DMG bundle đã qua. Chưa thử hành động thật trên máy Mac vật lý."],
      ["Linux", "Planned", "Hiện chỉ có capability reminder placeholder; chưa là mục tiêu phát hành."]
    ],
    builds: "Xem build CI đã xác minh",
    faqKicker: "CÂU HỎI / 07", faqTitle: "Biết rõ điều gì hoạt động trước khi cài.",
    faq: [
      ["Có cần tài khoản để dùng bộ hẹn giờ không?", "Không. Timer, SQLite, simulation, overlay và theme tích hợp chạy cục bộ. Account chỉ cần cho đồng bộ, cộng đồng và mua theme khi các mốc đó ra mắt."],
      ["Website có thể Sleep hoặc tắt máy của tôi không?", "Không. Chỉ adapter native trong desktop mới có capability hệ điều hành, và simulation được bật mặc định."],
      ["Horune có hoạt động khi mất mạng không?", "Có với các chức năng desktop cục bộ. Đồng bộ thư viện và các tính năng cộng đồng tương lai sẽ chờ kết nối trở lại."],
      ["Đã có bản phát hành chính thức chưa?", "Chưa. CI đã tạo NSIS và DMG preview, nhưng chưa có installer ký số hoặc release ổn định."],
      ["Theme có thể chạy mã của tác giả không?", "Không. Renderer chỉ nhận ThemeManifest đã xác thực và các asset thuộc danh sách cho phép."],
      ["Marketplace đã mở chưa?", "Chưa. Không có checkout, đơn hàng hoặc entitlement hoạt động trong mốc hiện tại."]
    ],
    finalKicker: "BẮT ĐẦU VỚI PHẦN ĐÃ HOẠT ĐỘNG", finalTitle: "Thử thiết kế đồng hồ ngay trên trình duyệt.",
    finalLead: "Không cần tài khoản. Draft được lưu trên thiết bị và theme có thể xuất thành JSON đã xác thực.",
    footer: "Horune · thời gian luôn ở phía bạn"
  },
  en: {
    navLabel: "Primary navigation", menu: "Menu",
    nav: { timer: "Timer", themes: "Themes", studio: "Studio", community: "Community", platforms: "Platforms", faq: "FAQ" },
    eyebrow: "DESKTOP TIMER · OFFLINE-FIRST",
    title: "Schedule your computer to rest. Keep time in sight.",
    lead: "Choose when to sleep, shut down, lock, or remind you. Horune counts down in a floating clock and keeps working when you are offline.",
    primary: "Open Theme Studio", secondary: "See how the timer works",
    accountNote: "Use the timer without an account. Sign in when you want to save, sync, share, or buy themes.",
    accountStatus: "Horune Account is in development; there is no active sign-in form yet.",
    build: "Windows and macOS source + CI builds available · no signed release yet",
    strip: ["Schedules stay on-device", "Simulation is on by default", "No account needed for timers"],
    timerKicker: "THE TIMER / 01", timerTitle: "Choose an action. Confirm the time. Stay in control.",
    timerLead: "The desktop app runs one local scheduler. The website cannot put your computer to sleep or shut it down.",
    timerSteps: [
      ["Choose when", "Schedule a duration or an exact date and time. Horune shows the finish time before anything starts."],
      ["Choose what happens", "Sleep, shut down, lock the screen, or show a reminder. Simulation lets you test the whole flow without changing system state."],
      ["Watch the floating clock", "See time remaining, pause, add five minutes, or cancel from the overlay and system tray."],
      ["Return safely", "An overdue schedule after sleep, restart, or a clock change waits for confirmation instead of running automatically."]
    ],
    themesKicker: "THEMES / 02", themesTitle: "One countdown. Five places to start.",
    themesLead: "Try the bundled themes on this page. Web previews and desktop share the same declarative schema and renderer.",
    studioKicker: "THEME STUDIO / 03", studioTitle: "Design a clock of your own—without writing code.",
    studioLead: "Studio is already a working editor on web and desktop: change clock type, color, gradient, layers, motion, undo/redo, local drafts, and validated Theme JSON.",
    studioCta: "Start from a sample theme", studioNow: "Available now", studioNext: "Next milestone",
    studioNowItems: ["Digital, analog, flip, word, and hybrid faces", "Draggable text/sticker layers with lock, hide, and ordering", "On-device drafts, undo/redo, and validated JSON import/export"],
    studioNextItems: ["Multi-select, groups, constraints, and auto layout", "Safe PNG/WebP/GIF/SVG assets and portable theme packages", "Components, variants, timeline, and asset profiling"],
    communityKicker: "COMMUNITY / 04 · PLANNED", communityTitle: "Discovery and remix come after shared accounts.",
    communityLead: "Creator profiles, follows, comments, remix, paid themes, and ownership are not active yet. They only open after the API, moderation, authorization, and sandbox payments are tested.",
    communityItems: [
      ["Guests", "Will be able to browse and try public themes without signing in."],
      ["Horune Account", "Will be shared by web and desktop for libraries, sync, and purchases."],
      ["Creators", "Will get versions, attribution, licensing, review, and infringement reports."]
    ],
    roadmap: "Read the status-labelled roadmap",
    offlineKicker: "OFFLINE & SAFE / 05", offlineTitle: "Losing the network never cancels a running schedule.",
    safetyCards: [
      ["One scheduler", "There is no loop per schedule; remaining time is always derived from a fixed deadline."],
      ["Separate from accounts", "Future sign-in, sign-out, or session expiry must never interrupt local schedules."],
      ["Themes are data", "A manifest cannot contain JavaScript, arbitrary HTML/CSS, executable URLs, or system commands."]
    ],
    platformsKicker: "PLATFORMS / 06", platformsTitle: "Builds exist. Release still needs hardware proof.",
    platforms: [
      ["Windows", "Build verified in CI", "Rust tests and the NSIS bundle pass. Real power actions and code signing are still unverified."],
      ["macOS", "Build verified in CI", "Rust tests and the DMG bundle pass. Real actions have not been tested on physical Mac hardware."],
      ["Linux", "Planned", "Only a reminder capability placeholder exists; Linux is not a release target yet."]
    ],
    builds: "View verified CI builds",
    faqKicker: "QUESTIONS / 07", faqTitle: "Know what works before you install.",
    faq: [
      ["Do I need an account to use the timer?", "No. The timer, SQLite data, simulation, overlay, and bundled themes work locally. Accounts are only for future sync, community, and purchases."],
      ["Can the website sleep or shut down my computer?", "No. Only native desktop adapters have operating-system capabilities, and simulation is enabled by default."],
      ["Does Horune work offline?", "Yes for local desktop features. Future library sync and community actions will wait until connectivity returns."],
      ["Is there an official release?", "Not yet. CI produces NSIS and DMG previews, but there is no signed, stable installer release."],
      ["Can a theme run creator code?", "No. The renderer accepts only validated ThemeManifest data and allow-listed assets."],
      ["Is the marketplace open?", "No. There is no active checkout, order, or entitlement flow in this milestone."]
    ],
    finalKicker: "START WITH WHAT WORKS TODAY", finalTitle: "Design a clock in your browser now.",
    finalLead: "No account required. Drafts stay on your device, and themes export as validated JSON.",
    footer: "Horune · keep time on your side"
  }
} as const;

const CI_URL = "https://github.com/Ericismee/horune/actions/workflows/ci.yml";
const ROADMAP_URL = "https://github.com/Ericismee/horune/blob/main/docs/roadmap.md";

export default async function LandingPage({ params }: { params: Promise<{ locale: "vi" | "en" }> }) {
  const { locale } = await params;
  const t = copy[locale];
  const otherLocale = locale === "vi" ? "en" : "vi";
  const navItems = [["#timer", t.nav.timer], ["#themes", t.nav.themes], [`/${locale}/studio`, t.nav.studio], ["#community", t.nav.community], ["#platforms", t.nav.platforms], ["#faq", t.nav.faq]] as const;
  const renderNavigation = () => navItems.map(([href, label]) => href.startsWith("/") ? <Link href={href} key={href}>{label}</Link> : <a href={href} key={href}>{label}</a>);

  return (
    <main className="landing h-dot-grid">
      <header className="site-header">
        <Link className="brand" href={`/${locale}`} aria-label="Horune home"><Image className="brand-mark" src="/horune-mark.png" alt="" aria-hidden="true" width={42} height={42} priority /><span>HORUNE</span></Link>
        <nav className="nav-links" aria-label={t.navLabel}>{renderNavigation()}</nav>
        <div className="header-actions"><details className="mobile-nav"><summary>{t.menu}</summary><nav aria-label={t.navLabel}>{renderNavigation()}</nav></details><Link className="locale-switch" href={`/${otherLocale}`} hrefLang={otherLocale}>{otherLocale.toUpperCase()}</Link></div>
      </header>

      <section className="hero">
        <div className="hero-copy"><span className="hero-kicker h-label"><i />{t.eyebrow}</span><h1>{t.title}</h1><p>{t.lead}</p>
          <div className="hero-actions"><Link className="h-button h-button--accent" href={`/${locale}/studio`}>{t.primary}<span aria-hidden="true">✦</span></Link><a className="h-button" href="#timer">{t.secondary}<span aria-hidden="true">↓</span></a></div>
          <p className="account-note"><strong>{t.accountNote}</strong><span>{t.accountStatus}</span></p><a className="build-note" href={CI_URL}><span aria-hidden="true">●</span>{t.build}</a>
        </div><HeroClock locale={locale} />
      </section>

      <div className="trust-strip" aria-label="Horune principles">{t.strip.map((item, index) => <span key={item}><b>0{index + 1}</b>{item}</span>)}</div>

      <section className="timer-section" id="timer"><div className="section-heading"><span className="h-label">{t.timerKicker}</span><h2>{t.timerTitle}</h2><p>{t.timerLead}</p></div><div className="step-grid">{t.timerSteps.map(([title, body], index) => <article className="timer-step" key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>

      <section className="themes-section" id="themes"><div className="section-heading"><span className="h-label">{t.themesKicker}</span><h2>{t.themesTitle}</h2><p>{t.themesLead}</p></div><ThemeGallery locale={locale} /></section>

      <section className="studio-intro" id="studio"><div className="section-heading"><span className="h-label">{t.studioKicker}</span><h2>{t.studioTitle}</h2><p>{t.studioLead}</p><Link className="h-button h-button--accent" href={`/${locale}/studio`}>{t.studioCta}<span aria-hidden="true">→</span></Link></div><div className="studio-status-grid"><article className="status-panel is-live"><span className="status-chip">LIVE</span><h3>{t.studioNow}</h3><ul>{t.studioNowItems.map((item) => <li key={item}>{item}</li>)}</ul></article><article className="status-panel"><span className="status-chip">PLANNED</span><h3>{t.studioNext}</h3><ul>{t.studioNextItems.map((item) => <li key={item}>{item}</li>)}</ul></article></div></section>

      <section className="community-section" id="community"><div className="section-heading"><span className="h-label">{t.communityKicker}</span><h2>{t.communityTitle}</h2><p>{t.communityLead}</p><a className="text-link" href={ROADMAP_URL}>{t.roadmap}<span aria-hidden="true">↗</span></a></div><div className="community-grid">{t.communityItems.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></section>

      <section className="safety-section" id="offline"><div className="section-heading"><span className="h-label">{t.offlineKicker}</span><h2>{t.offlineTitle}</h2></div><div className="feature-grid">{t.safetyCards.map(([title, body], index) => <article className="h-card feature-card" key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>

      <section className="platform-section" id="platforms"><div className="section-heading"><span className="h-label">{t.platformsKicker}</span><h2>{t.platformsTitle}</h2></div><div className="platform-grid">{t.platforms.map(([name, status, body], index) => <article key={name}><span className={`platform-index state-${index}`}>0{index + 1}</span><h3>{name}</h3><strong>{status}</strong><p>{body}</p></article>)}</div><a className="h-button" href={CI_URL}>{t.builds}<span aria-hidden="true">↗</span></a></section>

      <section className="faq-section" id="faq"><div className="section-heading"><span className="h-label">{t.faqKicker}</span><h2>{t.faqTitle}</h2></div><div className="faq-list">{t.faq.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">＋</span></summary><p>{answer}</p></details>)}</div></section>

      <section className="final-cta h-card"><div><span className="h-label">{t.finalKicker}</span><h2>{t.finalTitle}</h2><p>{t.finalLead}</p></div><Link className="h-button h-button--accent" href={`/${locale}/studio`}>{t.primary}<span aria-hidden="true">✦</span></Link></section>

      <footer><span>{t.footer}</span><span className="h-label">© 2026 HORUNE</span></footer>
    </main>
  );
}
