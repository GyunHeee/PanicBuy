import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PanicBuy",
  description: "S&P500 market signal alerts and backtesting"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
