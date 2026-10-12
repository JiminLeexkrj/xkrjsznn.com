import type { Metadata, Viewport } from "next";
import { Archivo, Hahmlet, UnifrakturCook } from "next/font/google";
import "./globals.css";

// 영문 본문과 디스플레이. 폭(wdth) 축을 장체부터 평체까지 쓴다.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const hahmlet = Hahmlet({
  variable: "--font-hahmlet",
  subsets: ["latin"],
});

// xkrjsznn 서명용 블랙레터
const unifraktur = UnifrakturCook({
  variable: "--font-unifraktur",
  weight: "700",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Jimin Lukas Lee / xkrjsznn",
    template: "%s / xkrjsznn",
  },
  description: "이지민(Jimin Lukas Lee)의 개인 사이트. AI와 풀스택을 다루는 개발자.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [archivo, hahmlet, unifraktur].map((f) => f.variable).join(" ");
  return (
    <html lang="ko" className={`${fonts} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
