import type { PropsWithChildren } from "react";
import SiteHeader from "@/components/layout/Header";
import SiteFooter from "@/components/layout/Footer";

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <SiteHeader />
      <main className="flex-1 grid place-items-center p-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
