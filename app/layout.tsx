import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Refund Desk｜中途解約 返金額計算",
  description: "契約情報・期間・休会日数から、中途解約に伴う返金額と3段階の提示額を自動計算します。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
