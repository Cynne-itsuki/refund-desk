import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "https://refund-desk.copperpony10.chatgpt.site";

  return {
    metadataBase: new URL(origin),
    title: "VISION 返金額算出シュミレーター",
    description: "中途解約の返金額を算出します。",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      type: "website",
      url: origin,
      title: "VISION 返金額算出シュミレーター",
      description: "中途解約の返金額を算出します。",
    },
    twitter: {
      card: "summary",
      title: "VISION 返金額算出シュミレーター",
      description: "中途解約の返金額を算出します。",
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
