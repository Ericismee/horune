<div align="center">
  <img src="assets/brand/horune-wordmark.png" width="420" alt="Horune">
  <p><strong>Bộ hẹn giờ ưu tiên chạy cục bộ và đồng hồ nổi sáng tạo cho máy tính.</strong></p>
  <p><a href="README.md">English</a> · <a href="README.vi.md">Tiếng Việt</a></p>
  <p>
    <a href="https://github.com/Ericismee/horune/actions/workflows/ci.yml"><img alt="Trạng thái CI" src="https://github.com/Ericismee/horune/actions/workflows/ci.yml/badge.svg"></a>
    <a href="LICENSE"><img alt="Giấy phép Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg"></a>
  </p>
</div>

Horune hẹn Sleep, tắt máy, khóa màn hình hoặc nhắc nhở, đồng thời hiển thị thời gian còn lại bằng một đồng hồ nổi có thể tùy biến. Dự án dành cho người muốn kết thúc phiên làm việc nhẹ nhàng mà không biến Internet thành điều kiện của một bộ hẹn giờ quan trọng. Lịch, dữ liệu khôi phục và phép tính đếm ngược nằm trên thiết bị; web dùng chung mô hình theme khai báo và renderer với desktop.

Horune hiện là phần mềm preview. Chưa có bản phát hành để tải, hành động hệ thống thật chưa được xác minh trên máy này và chế độ mô phỏng được bật mặc định.

## Mục lục

- [Trạng thái hiện tại](#trạng-thái-hiện-tại)
- [Ảnh giao diện](#ảnh-giao-diện)
- [Tính năng](#tính-năng)
- [Chạy cục bộ](#chạy-cục-bộ)
- [Cách sử dụng](#cách-sử-dụng)
- [Kiến trúc và an toàn](#kiến-trúc-và-an-toàn)
- [Kiểm thử và hiệu năng](#kiểm-thử-và-hiệu-năng)
- [Lộ trình](#lộ-trình)
- [Đóng góp và bảo mật](#đóng-góp-và-bảo-mật)
- [Tác giả và giấy phép](#tác-giả-và-giấy-phép)

## Trạng thái hiện tại

| Khu vực | Trạng thái | Bằng chứng / giới hạn |
| --- | --- | --- |
| UI desktop Windows và mã scheduler cục bộ | **Có trong mã nguồn** | React/Vite build và browser preview đã qua; adapter Rust đã được triển khai |
| Build native Windows | **Đã xác minh trong CI** | Rust test và bundle NSIS đã qua; hành động nguồn điện thật vẫn cần kiểm tra phần cứng |
| Build native macOS | **Đã xác minh trong CI / chưa xác minh phần cứng** | Rust test và bundle DMG đã qua; chưa thử hành động trên máy Mac thật |
| Linux | **Planned** | Placeholder chỉ hỗ trợ reminder; chưa là mục tiêu phát hành |
| Landing song ngữ (`/vi`, `/en`) | **Có trong mã nguồn** | Render tĩnh và đã kiểm tra desktop, tablet, mobile |
| Theme Studio cốt lõi | **Có trong mã nguồn** | Editor web/desktop dùng chung, renderer, draft, undo/redo, phím tắt có phạm vi, Command Palette và import/export JSON hợp lệ |
| Horune Account dùng chung | **Planned / ADR nhà cung cấp đang đề xuất** | Chưa có form đăng nhập; nhà cung cấp OIDC phải qua thử nghiệm PKCE desktop và session |
| Import ảnh/GIF/SVG ngoài | **Planned tiếp theo** | Đã có giới hạn và chính sách; chưa có nút giả trong UI |
| Tài khoản, cộng đồng, chia sẻ, remix | **Planned** | Chờ mốc API dùng chung |
| Marketplace và thanh toán | **Planned** | Client chưa có logic thanh toán hoặc quyền sở hữu trả phí |

“Có trong mã nguồn” nghĩa là tính năng đã được triển khai và qua các phép kiểm tra liệt kê bên dưới; không có nghĩa là đã có bản phát hành ký số.

## Ảnh giao diện

Đây là ảnh Playwright chụp từ ứng dụng cục bộ đang chạy, không phải mockup thiết kế.

| Landing page | Browser preview của desktop scheduler |
| --- | --- |
| <img src="docs/screenshots/landing-desktop.png" alt="Landing Horune giao diện English với đồng hồ Sleep nổi" width="680"> | <img src="docs/screenshots/desktop-main.png" alt="Horune desktop giao diện English đang bật mô phỏng" width="680"> |

<img src="docs/screenshots/editor-desktop.png" alt="Horune Theme Studio đang chạy với layer, canvas và bảng thuộc tính" width="1100">

Overlay native trong suốt đã có mã, nhưng README không dùng ảnh overlay làm bằng chứng phát hành vì máy hiện tại chưa tạo được executable Tauri. Các ảnh responsive nằm trong [`docs/screenshots`](docs/screenshots).

## Tính năng

| Tính năng | Hiện hoạt động |
| --- | --- |
| Hẹn giờ cục bộ | Theo khoảng hoặc ngày giờ; Sleep, tắt máy, khóa, reminder; cảnh báo; pause/resume; +5 phút; hủy |
| Khôi phục an toàn | Một scheduler Rust; tính từ deadline; lịch quá hạn phải xác nhận lại |
| Mô phỏng | Bật ở lần đầu; test tự động không gọi hành động hệ điều hành thật |
| Đồng hồ nổi | Renderer dùng chung, cửa sổ Tauri trong suốt/always-on-top, tray và 5 theme mẫu |
| Theme Studio | Đồng hồ số, kim, flip, chữ, hybrid; màu/gradient; kích thước, opacity, hiệu ứng, ngày/giây/hành động |
| Layer | Thêm text hoặc sticker dựng sẵn; chọn, kéo, chỉnh vị trí/tỷ lệ/góc, ẩn, khóa, đổi thứ tự, xóa |
| Quy trình chỉnh sửa | Zoom, grid, snap, tối đa 50 trạng thái undo, redo, phím nhân bản/xóa/nudge, Command Palette có tìm kiếm, draft cục bộ, reset, import/export Theme JSON nghiêm ngặt |
| Chuyển động và tiếp cận | `static`, `subtle`, `full`; reduced-motion; focus rõ; web responsive |

Xem [Theme Studio](docs/theme-studio.md) để biết ranh giới chính xác giữa hiện tại, mốc tiếp theo và dài hạn.

## Chạy cục bộ

### Yêu cầu

- Node.js 24 trở lên
- pnpm 11
- Rust stable
- Windows: MSVC C++ Build Tools và WebView2
- macOS: Xcode command-line tools

```bash
git clone https://github.com/Ericismee/horune.git
cd horune
pnpm install
```

Chạy mọi lệnh workspace tại thư mục gốc repository (nơi có `package.json` gốc). Trên Windows, nếu đã cài pnpm hoặc Cargo nhưng PowerShell hiện tại chưa tìm thấy, cập nhật PATH cho phiên đó:

```powershell
$env:Path = "$(npm config get prefix);$env:USERPROFILE\.cargo\bin;$env:Path"
pnpm --version
cargo --version
```

Nếu chưa cài pnpm global, dùng `npx pnpm@11.19.0 install`—không có dấu gạch chéo ngược trước `@`. Xem [development.md](docs/development.md) để thiết lập PATH vĩnh viễn và xử lý lỗi.

```bash
# Chạy các lệnh này tại thư mục gốc repository
# Landing Next.js và Theme Studio trên trình duyệt
pnpm dev:web

# Ứng dụng desktop Tauri native
pnpm dev:desktop
```

Mở `http://localhost:3000` (mặc định chuyển đến English), `http://localhost:3000/vi` hoặc route `/studio` tương ứng. Dự án chủ ý không đặt link installer cho tới khi có artifact phát hành thật.

<details>
<summary>Lệnh build và kiểm thử</summary>

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build

# Installer native cho nền tảng hiện tại
pnpm tauri build --bundles nsis  # Windows
pnpm tauri build --bundles dmg   # macOS
```

Artifact native nằm trong `apps/desktop/src-tauri/target/release/bundle/`. Chỉ build bundle tương ứng với hệ điều hành hiện tại và cài các prerequisite trong [development.md](docs/development.md).
</details>

### Cấu trúc monorepo

```text
apps/
  desktop/              Tauri 2, React, TypeScript, Rust, SQLite
  web/                  Next.js 16 App Router
packages/
  design-system/        Token, typography, motion, focus dùng chung
  theme-schema/         ThemeManifest có phiên bản và xác thực nghiêm ngặt
  theme-renderer/       Renderer đồng hồ và layer dùng chung
  theme-studio/         Editor web/desktop và JSON I/O dùng chung
docs/                   Kiến trúc, bảo mật, kiểm thử, roadmap
```

## Cách sử dụng

### Hẹn Sleep mô phỏng sau 30 phút

1. Giữ **Chế độ mô phỏng** đang bật.
2. Chọn **Sau một khoảng**, nhập `30` và chọn **Sleep**.
3. Kiểm tra thời điểm kết thúc rồi chọn **Bắt đầu**.
4. Dùng cửa sổ chính, overlay hoặc tray để tạm dừng, cộng năm phút hay hủy.

Nếu Horune trở lại sau deadline vì sleep, restart, thoát app hoặc thay đổi đồng hồ, lịch chuyển sang `awaiting_confirmation` và không tự thực thi.

### Đổi hoặc chỉnh theme

Chọn theme có sẵn trong phần preview của scheduler, hoặc mở **Studio**. Studio hiện hỗ trợ 5 loại đồng hồ, điều khiển hình thức, layer text/sticker dựng sẵn, kéo trên canvas, thứ tự, undo/redo và draft cục bộ.

**Xuất JSON** tạo file `.horune.json`. **Nhập JSON** chỉ nhận tài liệu `ThemeManifestV1` hợp lệ không quá 256 KiB. HTML, CSS, JavaScript, URL và lệnh hệ thống tùy ý không thể biểu diễn. Import asset nhị phân là planned, không được chấp nhận ngầm.

## Kiến trúc và an toàn

UI desktop gọi Tauri commands dùng SQLite và một scheduler cục bộ duy nhất. Web và desktop import chung schema theme, renderer, Studio và design token. Website không thể kích hoạt Sleep/tắt máy; các hành động đó chỉ thuộc adapter desktop native.

Trong tương lai, tài khoản, cộng đồng, kiểm duyệt, đơn hàng và quyền sở hữu sẽ nằm sau API Fastify/PostgreSQL, object storage tương thích S3 và client tạo từ OpenAPI. Client không được quyết định quyền theme trả phí hay logic tài chính.

- [Kiến trúc](docs/architecture.md)
- [Mô hình Theme Studio](docs/theme-studio.md)
- [Ma trận tính năng Theme Studio](docs/theme-studio-feature-matrix.md)
- [Bảo mật theme và asset](docs/theme-security.md)
- [Giới hạn nền tảng](docs/platform-limitations.md)
- [Kế hoạch triển khai theo thứ tự](docs/implementation-plan.md)
- [ADR nhà cung cấp định danh](docs/adr/0002-identity-provider.md)
- [Ma trận phân quyền](docs/authorization-matrix.md)
- [Mô hình dữ liệu server dự kiến](docs/data-model.md)

## Kiểm thử và hiệu năng

Baseline hiện đã xác minh gồm typecheck 6 workspace TypeScript, 12 unit test, production build và 24 Playwright test tại `1440×900`, `768×1024`, `390×844`. Rust test cùng bundle NSIS và DMG chưa ký đã qua trên Windows/macOS trong [CI run #3](https://github.com/Ericismee/horune/actions/runs/36442542223). Kiểm tra native trên máy cục bộ này chưa hoàn tất vì môi trường MSVC hiện không tìm thấy `msvcrt.lib`; hành động nguồn điện thật và hành vi trên máy Mac vật lý vẫn chưa được xác minh.

Horune được thiết kế để tránh vòng lặp riêng cho từng lịch và không render khi cửa sổ ẩn, nhưng dự án **không** tự gọi mình “nhẹ” khi chưa có số đo native. Quy trình đo CPU/RAM 60 giây và bảng kết quả đang chờ được công bố minh bạch.

- [Kiểm thử](docs/testing.md)
- [Hiệu năng](docs/performance.md)
- [Báo cáo xác minh theo ngày](docs/test-report-2026-09-28.md)

## Lộ trình

1. Ổn định scheduler desktop, native build, overlay/tray, Theme Studio cốt lõi và baseline tài nguyên thật.
2. Thêm PNG/WebP/GIF/SVG an toàn, căn chỉnh/group phong phú, phiên bản autosave và chuyển đổi Figma khai báo được kiểm chứng.
3. Thêm tài khoản, đồng bộ, xuất bản, kiểm duyệt, khám phá, follow, bình luận, ghi nguồn và remix.
4. Thêm marketplace sandbox với phí kích hoạt tác giả, bản chụp tỷ lệ phí đơn hàng, quyền sở hữu, hoàn tiền, đối soát và audit log ở backend.
5. Xác minh điều kiện thanh toán/phân phối, tối ưu khi dùng pin, ký installer và phát hành.

Kế hoạch chi tiết có nhãn trạng thái nằm trong [roadmap.md](docs/roadmap.md).

## Đóng góp và bảo mật

Đọc [CONTRIBUTING.md](CONTRIBUTING.md) trước khi gửi thay đổi. Báo lỗi qua [GitHub Issues](https://github.com/Ericismee/horune/issues), kèm bước tái hiện và dùng simulation cho lỗi scheduler. Báo cáo lỗ hổng riêng tư theo [SECURITY.md](SECURITY.md), nhất là đường dẫn có thể vượt qua xác thực theme hoặc gọi hành động hệ thống ngoài ý muốn.

## Tác giả và giấy phép

<p>
  <img src="https://avatars.githubusercontent.com/u/151176410?v=4&amp;s=96" width="64" height="64" alt="Avatar GitHub công khai của Ericismee" align="left">
  Phát triển bởi <a href="https://github.com/Ericismee">Ericismee</a>.<br>
  Liên hệ: <a href="mailto:eric.wk08@gmail.com">eric.wk08@gmail.com</a>
</p>

<br clear="left">

Horune dùng [Apache License 2.0](LICENSE).

By Eric [Ericismee](https://github.com/Ericismee)
