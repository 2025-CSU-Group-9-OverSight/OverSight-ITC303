"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRole } from "@/types/types";
import DashboardLayout from "@/components/dashboard-layout";
import { Progress } from "@/components/ui/progress";
import { DatePickerDemo } from "@/components/date-picker";
import LiveMetricsChart from "@/components/live-metrics-chart";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Users, 
  Cpu,
  Settings, 
  BarChart3, 
  Shield, 
  Activity, 
  Database,
  UserPlus,
  Key,
  Monitor,
  AlertTriangle,
  HardDrive,
  MemoryStick
} from "lucide-react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [diskUsage, setDiskUsage] = useState(0);
  const [machines, setMachines] = useState<string[]>([]);
  const [selectedMachine, setSelectedMachine] = useState('all');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('24');
  const [loading, setLoading] = useState(true);

  // Fetch machines list
  const fetchMachines = async () => {
    try {
      const response = await fetch('/api/machines');
      const data = await response.json();
      if (data.machines) {
        setMachines(data.machines);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  // Fetch metrics data
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/metrics?deviceName=${selectedMachine}&hours=${selectedTimePeriod}`);
      const data = await response.json();
      if (data.cpuUsage !== undefined) {
        setCpuUsage(data.cpuUsage);
        setMemoryUsage(data.memoryUsage);
        setDiskUsage(data.diskUsage);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // Fetch initial data
    fetchMachines();
    fetchMetrics();
  }, [status, session, router]);

  // Refetch metrics when machine or time period changes
  useEffect(() => {
    if (status === "authenticated") {
      fetchMetrics();
    }
  }, [selectedMachine, selectedTimePeriod, status]);

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const isAdmin = session?.user?.role === UserRole.ADMIN;
  const dashboardTitle = isAdmin ? "Admin Dashboard" : "Dashboard";

  return (
    <DashboardLayout title={dashboardTitle}>
        <div className="flex flex-row gap-4">
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a machine" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Machines</SelectItem>
                    {machines.map((machine) => (
                        <SelectItem key={machine} value={machine}>
                            {machine}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex flex-col gap-4">
            <Select value={selectedTimePeriod} onValueChange={setSelectedTimePeriod}>
                <SelectTrigger>
                    <SelectValue placeholder="Select Time Period" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="24">Last 24 Hrs</SelectItem>
                    <SelectItem value="168">Last 7 Days</SelectItem>
                    <SelectItem value="720">Last 30 Days</SelectItem>
                </SelectContent>
            </Select>
            </div>
        </div>
        <div className="flex flex-col gap-4"></div>
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Cpu className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-black">CPU Usage</p>
                  <p className="text-small text-muted-foreground text-gray-900">
                    {selectedMachine === 'all' ? 'Average across all machines' : selectedMachine}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : `${cpuUsage}%`}
                  </p>
                  <Progress value={cpuUsage} className="h-2 mt-2 [&>div]:bg-blue-500 bg-gray-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MemoryStick className="h-8 w-8 text-violet-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-black">Memory Usage</p>
                  <p className="text-small text-muted-foreground text-blue-900">
                    {selectedMachine === 'all' ? 'Average across all machines' : selectedMachine}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : `${memoryUsage}%`}
                  </p>
                  <Progress value={memoryUsage} className="h-2 mt-2 [&>div]:bg-violet-500 bg-gray-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <HardDrive className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-black">Disk Usage</p>
                  <p className="text-small text-muted-foreground text-gray-900">
                    {selectedMachine === 'all' ? 'Average across all machines' : selectedMachine}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : `${diskUsage}%`}
                  </p>
                  <Progress value={diskUsage} className="h-2 mt-2 [&>div]:bg-green-500 bg-gray-300" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
        {/* Live Metrics */}
        <div className="flex flex-col gap-4">
            <LiveMetricsChart title="Live System Metrics" selectedMachine={selectedMachine} />
        </div>

       
    </DashboardLayout>
  );
}
