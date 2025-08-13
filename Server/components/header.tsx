"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

interface HeaderProps {
  title?: string;
  showUserInfo?: boolean;
  showLogout?: boolean;
}

export default function Header({ 
  title = "Dashboard", 
  showUserInfo = true, 
  showLogout = true 
}: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="pl-4 sm:pl-6 lg:pl-8 pr-0 mr-0">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
          
          {showUserInfo && (
            <div className="flex items-center space-x-4 pr-4 sm:pr-6 lg:pr-8">
              <span className="text-sm text-gray-600">
                Welcome, {session?.user?.email}
              </span>
              {showLogout && (
                <Button onClick={handleLogout} variant="outline" size="sm">
                  Logout
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
