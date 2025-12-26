import { Sidebar } from "@/components/Layouts/sidebar";
import { Header } from "@/components/Layouts/header";
import { AuthGate } from "@/components/AuthGate";
import NextTopLoader from "nextjs-toploader";
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s | DEJAPOO BMS",
    default: "DEJAPOO BMS",
  },
  description: "DEJAPOO Brand Management System",
};

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <>
      <NextTopLoader color="#5750F1" showSpinner={false} />
      <AuthGate />

      <div className="flex min-h-screen">
        <Sidebar />

        <div className="w-full bg-gray-2 dark:bg-[#020d1a]">
          <Header />

          <main className="isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
