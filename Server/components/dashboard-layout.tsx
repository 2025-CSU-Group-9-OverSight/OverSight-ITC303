"use client";
import { ReactNode } from "react";
import AdminSidebar from "./admin-sidebar";
import StandardSidebar from "./standard-sidebar";
import Header from "./header";
import Footer from "./footer";
import { useSession } from "next-auth/react";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  showUserInfo?: boolean;
  showLogout?: boolean;
}

export default function DashboardLayout({ 
  children, 
  title = "Dashboard",
  showUserInfo = true,
  showLogout = true
}: DashboardLayoutProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        {isAdmin ? <AdminSidebar /> : <StandardSidebar />}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header 
          title={title} 
          showUserInfo={showUserInfo} 
          showLogout={showLogout} 
        />

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
