import type { Metadata } from "next";
import { Anton } from "next/font/google";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XKRJSZNN",
  description: "xkrjsznn 개인 사이트",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${anton.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
