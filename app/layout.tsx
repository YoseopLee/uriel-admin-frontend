import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 🌟 방금 만든 클라이언트 초기화 컴포넌트 불러오기
import ConfigureAmplifyClientSide from "../components/ConfigureAmplifyClientSide";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "우리엘 어드민 대시보드",
  description: "회사 홈페이지 리뉴얼 어드민 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {/* 🌟 렌더링 최상단에 초기화 컴포넌트를 배치 (UI는 안 보임) */}
        <ConfigureAmplifyClientSide />

        {/* 실제 화면 컨텐츠 */}
        {children}
      </body>
    </html>
  );
}
