"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Bell, 
  FileText, 
  BarChart3, 
  Users, 
  Settings,
  Activity,
  Layers,
  Shield
} from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AdminSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const navigationLinks = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Alerts", href: "/alerts", icon: Bell },
    { name: "Processes", href: "/processes", icon: Layers },
    { name: "Reports", href: "/reports", icon: BarChart3 },
  ];

  const adminLinks = [
    { name: "Users", href: "/users", icon: Users },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Security", href: "/admin/security", icon: Shield },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo Section */}
      <div className="flex items-center p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="relative w-8 h-8">
            <Image
              src="/assets/images/pulse.png"
              alt="Oversight"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <span className="text-xl font-bold text-gray-900">Oversight</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2">
        {/* Main Navigation */}
        <div className="space-y-1">
          {navigationLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:text-slate-500 hover:bg-gray-50"
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* Admin Links */}
        <div className="space-y-1">
          {adminLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:text-slate-500 hover:bg-gray-50"
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {link.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={session?.user?.profilePicture} alt="Profile" />
            <AvatarFallback>
              <Users className="h-5 w-5 text-gray-600" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {session?.user?.email || "Admin User"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {session?.user?.role || "Admin"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
