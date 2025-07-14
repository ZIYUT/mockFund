import type { Metadata } from "next";
import "./globals.css";
import Web3Provider from "@/components/Web3Provider";

export const metadata: Metadata = {
  title: "MockFund - DeFi 投资基金",
  description: "基于区块链的智能投资基金平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
