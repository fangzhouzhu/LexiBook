import "./globals.css";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
