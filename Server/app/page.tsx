"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Wait for session to load
    
    if (status === "authenticated" && session) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [status, session, router]);

  // Show loading while redirecting
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-lg">Loading...</div>
    </div>
  );
}
