import type { Metadata, Viewport } from "next";
import { Archivo, Hahmlet, Shippori_Mincho, UnifrakturCook } from "next/font/google";
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

// 세로쓰기 텍스처. 몇 글자만 쓰므로 미리 불러오지 않는다.
const shippori = Shippori_Mincho({
  variable: "--font-shippori",
  weight: "500",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Jimin Lukas Lee / xkrjsznn",
  description: "이지민(Jimin Lukas Lee)의 포트폴리오. AI와 풀스택을 다루는 개발자.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

// 첫 페인트 전에 실행된다. 이번 세션에 이미 들어왔다면 진입 화면을 건너뛴다.
const enteredScript = `try{if(sessionStorage.getItem("xk-entered"))document.documentElement.dataset.entered="instant"}catch(e){}`;

// 스크립트가 꺼져 있으면 진입 화면 없이 바로 보여준다
const noScriptStyle = `.intro{display:none!important}body{overflow:auto!important}.cut{opacity:1!important}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [archivo, hahmlet, unifraktur, shippori].map((f) => f.variable).join(" ");
  return (
    <html lang="ko" className={`${fonts} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: enteredScript }} />
        <noscript>
          <style>{noScriptStyle}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
