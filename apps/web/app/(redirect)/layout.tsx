import "@horune/design-system/fonts";
import "@horune/design-system/styles.css";
import "@horune/theme-renderer/styles.css";
import "../globals.css";

export default function RedirectLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
