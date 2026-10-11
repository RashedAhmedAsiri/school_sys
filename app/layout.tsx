import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "ثانوية الموهوبين التقنية · المنصة الذكية",
  description: "منصة المعلم الذكية في ثانوية الموهوبين التقنية",
};
export const viewport: Viewport = { themeColor: "#15803d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&family=Changa:wght@500;600;700;800&family=Pacifico&display=swap"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
