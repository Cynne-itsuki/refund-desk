import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "https://refund-desk.copperpony10.chatgpt.site";
  const imageUrl = `${origin}/og.png`;

  return {
    metadataBase: new URL(origin),
    title: "Refund Desk｜中途解約 返金額計算・対応ナビ",
    description: "4つのプランと契約情報から返金額を自動計算。打診の順番、送るタイミング、そのまま使える文面まで案内します。",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      type: "website",
      url: origin,
      title: "Refund Desk｜返金計算から、次に送る文面まで。",
      description: "中途解約対応の計算・提示・合意・返金を、迷わず進めるための実務ツール。",
      images: [{ url: imageUrl, width: 1920, height: 1000, alt: "Refund Desk — 返金計算から、次に送る文面まで。" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Refund Desk｜返金計算から、次に送る文面まで。",
      description: "中途解約対応の計算とコミュニケーションを一つの画面で。",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
