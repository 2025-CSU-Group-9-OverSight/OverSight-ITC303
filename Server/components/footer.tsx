"use client";
import { Activity } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <div className="relative w-4 h-4">
            <Image
              src="/assets/images/pulse.png"
              alt="Oversight"
              width={16}
              height={16}
              className="object-contain"
            />
          </div>
          <span>Live System Monitoring and Reporting System 2025</span>
        </div>
      </div>
    </footer>
  );
}
