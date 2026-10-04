import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XKRJSZNN",
  description: "xkrjsznn 개인 사이트",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
