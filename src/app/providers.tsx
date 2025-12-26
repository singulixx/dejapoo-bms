"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { NotifyProvider } from "@/components/ui/notify";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <NotifyProvider>
        <SidebarProvider>{children}</SidebarProvider>
      </NotifyProvider>
    </ThemeProvider>
  );
}
