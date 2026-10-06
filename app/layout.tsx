import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "ثانوية الموهوبين التقنية · المنصة الذكية",
  description: "منصة المعلم الذكية في ثانوية الموهوبين التقنية",
};
export const viewport: Viewport = { themeColor: "#7c5cff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Readex+Pro:wght@400;600;700;800&family=Pacifico&display=swap"
        />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><defs><linearGradient id=%22g%22><stop offset=%220%22 stop-color=%22%2322c1dc%22/><stop offset=%221%22 stop-color=%22%237c5cff%22/></linearGradient></defs><rect width=%22100%22 height=%22100%22 rx=%2228%22 fill=%22url(%23g)%22/><text x=%2250%22 y=%2268%22 font-size=%2252%22 text-anchor=%22middle%22 fill=%22white%22 font-family=%22sans-serif%22 font-weight=%22bold%22>م</text></svg>" />
      </head>
      <body>
        <div className="aurora" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        {children}
      </body>
    </html>
  );
}
