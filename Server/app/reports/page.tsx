"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types/types';
import DashboardLayout from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  FileText, 
  Download, 
  Calendar, 
  Server, 
  BarChart3, 
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import { generateReportCSV, generateCSVFilename, type ReportData } from '@/lib/csvGenerator';
import { generateReportPDF } from '@/lib/reportPdfGenerator';

interface Machine {
  name: string;
  lastSeen: string;
  status: 'online' | 'offline' | 'warning';
}


export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  
  // State management
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [reportType, setReportType] = useState<string>('performance');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Set default date range (last 7 days)
  useEffect(() => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    setToDate(today.toISOString().split('T')[0]);
    setFromDate(weekAgo.toISOString().split('T')[0]);
  }, []);

  // Fetch available machines
  const fetchMachines = async () => {
    try {
      const response = await fetch('/api/machines');
      const data = await response.json();
      if (data.machines) {
        const machineList = data.machines.map((name: string) => ({
          name,
          lastSeen: new Date().toISOString(),
          status: 'online' as const
        }));
        setMachines(machineList);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
      showToast({ type: 'error', message: 'Failed to fetch machines' });
    }
  };

  // Generate report
  const generateReport = async () => {
    if (!fromDate || !toDate) {
      showToast({ type: 'error', message: 'Please select both from and to dates' });
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      showToast({ type: 'error', message: 'From date cannot be after to date' });
      return;
    }

    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        deviceName: selectedMachine,
        fromDate,
        toDate,
        reportType
      });

      const response = await fetch(`/api/reports?${params}`);
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setReportData(data);
      showToast({ type: 'success', message: 'Report generated successfully' });
    } catch (error) {
      console.error('Error generating report:', error);
      showToast({ type: 'error', message: 'Failed to generate report' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Export report as CSV (multiple files for system health reports)
  const exportReport = () => {
    if (!reportData) return;

    if (reportData.type === 'system') {
      // Generate multiple CSV files for system health reports
      reportData.machines.forEach(machine => {
        // 1. Summary + Alerts CSV
        const summaryContent = generateMachineSummaryCSV(machine, reportData);
        downloadCSV(summaryContent, `OverSight-${machine.name}-Summary-${new Date().toISOString().split('T')[0]}.csv`);

        // 2. Processes CSV
        if (machine.processHealth.runningProcessesList.length > 0 || machine.processHealth.stoppedProcessesList.length > 0) {
          const processContent = generateMachineProcessesCSV(machine, reportData);
          downloadCSV(processContent, `OverSight-${machine.name}-Processes-${new Date().toISOString().split('T')[0]}.csv`);
        }

        // 3. Services CSV
        if (machine.serviceHealth.runningServicesList.length > 0 || machine.serviceHealth.stoppedServicesList.length > 0) {
          const serviceContent = generateMachineServicesCSV(machine, reportData);
          downloadCSV(serviceContent, `OverSight-${machine.name}-Services-${new Date().toISOString().split('T')[0]}.csv`);
        }
      });
      
      showToast({ type: 'success', message: `Exported ${reportData.machines.length * 3} CSV files` });
    } else {
      // Single CSV for performance reports
      const csvContent = generateReportCSV(reportData);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateCSVFilename(reportData.type);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  // Helper function to download CSV content
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Generate machine summary CSV (health + alerts)
  const generateMachineSummaryCSV = (machine: any, reportData: any): string => {
    const csvLines: string[] = [];
    
    csvLines.push(`OverSight Machine Summary Report - ${machine.name}`);
    csvLines.push(`Generated: ${new Date(reportData.generatedAt).toLocaleString('en-AU')}`);
    csvLines.push(`Date Range: ${new Date(reportData.timeRange.from).toLocaleDateString('en-AU')} - ${new Date(reportData.timeRange.to).toLocaleDateString('en-AU')}`);
    csvLines.push('');
    
    // Machine Health
    csvLines.push('MACHINE HEALTH');
    csvLines.push(`Machine Name,${machine.name}`);
    csvLines.push(`Health Status,${machine.status}`);
    csvLines.push(`Health Score,${machine.healthScore}`);
    csvLines.push(`Uptime (%),${machine.uptime.toFixed(2)}`);
    csvLines.push(`Last Seen,${new Date(machine.lastSeen).toLocaleString('en-AU')}`);
    csvLines.push(`Critical Alerts,${machine.criticalAlerts || 0}`);
    csvLines.push(`Warning Alerts,${machine.warningAlerts || 0}`);
    csvLines.push(`Total Processes,${machine.processHealth.totalProcesses}`);
    csvLines.push(`Total Services,${machine.serviceHealth.totalServices}`);
    csvLines.push('');
    
    // Alerts Details
    if (machine.alerts && machine.alerts.length > 0) {
      csvLines.push('ALERTS');
      csvLines.push('Alert ID,Severity,Alert Type,Message,Timestamp,Age (hours)');
      machine.alerts.forEach((alert: any) => {
        const alertDate = new Date(alert.timestamp);
        const ageHours = ((new Date().getTime() - alertDate.getTime()) / (1000 * 60 * 60)).toFixed(1);
        csvLines.push(`${alert.id},${alert.severity},${alert.type},"${alert.message}",${alertDate.toLocaleString('en-AU')},${ageHours}`);
      });
    } else {
      csvLines.push('ALERTS');
      csvLines.push('No alerts during this period');
    }
    
    return csvLines.join('\n');
  };

  // Generate machine processes CSV
  const generateMachineProcessesCSV = (machine: any, reportData: any): string => {
    const csvLines: string[] = [];
    
    csvLines.push(`OverSight Process Report - ${machine.name}`);
    csvLines.push(`Generated: ${new Date(reportData.generatedAt).toLocaleString('en-AU')}`);
    csvLines.push(`Date Range: ${new Date(reportData.timeRange.from).toLocaleDateString('en-AU')} - ${new Date(reportData.timeRange.to).toLocaleDateString('en-AU')}`);
    csvLines.push('');
    
    csvLines.push('PROCESSES');
    csvLines.push('Process Name,Status,CPU Usage (%),Memory Usage (%)');
    
    // Running processes
    machine.processHealth.runningProcessesList.forEach((proc: any) => {
      csvLines.push(`${proc.name},running,${proc.cpu.toFixed(2)},${proc.memory.toFixed(2)}`);
    });
    
    // Stopped processes
    machine.processHealth.stoppedProcessesList.forEach((proc: any) => {
      csvLines.push(`${proc.name},${proc.status},N/A,N/A`);
    });
    
    return csvLines.join('\n');
  };

  // Generate machine services CSV
  const generateMachineServicesCSV = (machine: any, reportData: any): string => {
    const csvLines: string[] = [];
    
    csvLines.push(`OverSight Service Report - ${machine.name}`);
    csvLines.push(`Generated: ${new Date(reportData.generatedAt).toLocaleString('en-AU')}`);
    csvLines.push(`Date Range: ${new Date(reportData.timeRange.from).toLocaleDateString('en-AU')} - ${new Date(reportData.timeRange.to).toLocaleDateString('en-AU')}`);
    csvLines.push('');
    
    csvLines.push('SERVICES');
    csvLines.push('Service Name,Display Name,Status,CPU Usage (%),Memory Usage (%)');
    
    // Running services
    machine.serviceHealth.runningServicesList.forEach((service: any) => {
      csvLines.push(`${service.name},"${service.displayName}",${service.status},${service.cpu > 0 ? service.cpu.toFixed(2) : '0.00'},${service.memory > 0 ? service.memory.toFixed(2) : '0.00'}`);
    });
    
    // Stopped services
    machine.serviceHealth.stoppedServicesList.forEach((service: any) => {
      csvLines.push(`${service.name},"${service.displayName}",${service.status},N/A,N/A`);
    });
    
    return csvLines.join('\n');
  };

  // Export report as PDF using the utility
  const exportPDF = () => {
    if (!reportData) return;
    
    try {
      generateReportPDF(reportData);
      showToast({ type: 'success', message: 'PDF exported successfully!' });
    } catch (error) {
      console.error('PDF export error:', error);
      showToast({ type: 'error', message: 'Failed to generate PDF' });
    }
  };

  // Authentication check
  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user?.role !== UserRole.ADMIN) {
      router.push("/dashboard");
      return;
    }

    if (status === "authenticated") {
      fetchMachines();
      setIsLoading(false);
    }
  }, [status, session, router]);

  if (status === "loading" || isLoading) {
    return (
      <DashboardLayout title="Reports">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <TooltipProvider>
      <DashboardLayout title="Reports">
      <div className="space-y-6">
        {/* Report Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Report
            </CardTitle>
            <CardDescription>
              Configure your report parameters and generate comprehensive system reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Machine Selection */}
              <div className="space-y-2">
                <Label htmlFor="machine">Machine</Label>
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select machine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Machines</SelectItem>
                    {machines.map((machine) => (
                      <SelectItem key={machine.name} value={machine.name}>
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          {machine.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Report Type */}
              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Performance
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        System Health
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* From Date */}
              <div className="space-y-2">
                <Label htmlFor="fromDate">From Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="fromDate"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* To Date */}
              <div className="space-y-2">
                <Label htmlFor="toDate">To Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="toDate"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* System Health Report Warning */}
            {reportType === 'system' && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Note:</strong> System health reports analyze both performance and service data, 
                  which may take up to 10 minutes to generate for large datasets.
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={generateReport} 
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
{isGenerating ? 
                  (reportType === 'system' ? 'Generating (this may take up to 10 mins)...' : 'Generating...') : 
                  'Generate Report'
                }
              </Button>
              
              {reportData && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={exportReport}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {reportData.type === 'system' ? 'Export CSVs (Multiple Files)' : 'Export CSV'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={exportPDF}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Results */}
        {reportData && (
          <div id="report-content" className="space-y-6">
            {reportData.type === 'performance' && (
              <>
                {/* Performance Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Machines</p>
                          <p className="text-2xl font-bold">{reportData.summary.totalMachines}</p>
                        </div>
                        <Server className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="cursor-help">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Online</p>
                              <p className="text-2xl font-bold text-green-600">{reportData.summary.onlineMachines}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Machines that sent data within the last 5 minutes</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="cursor-help">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Offline</p>
                              <p className="text-2xl font-bold text-red-600">{reportData.summary.offlineMachines}</p>
                            </div>
                            <XCircle className="h-8 w-8 text-red-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Machines that haven't sent data for more than 1 hour</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="cursor-help">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Warning</p>
                              <p className="text-2xl font-bold text-yellow-600">{reportData.summary.warningMachines}</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-yellow-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Machines that last sent data 5 minutes to 1 hour ago</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Summary</CardTitle>
                    <CardDescription>
                      Average resource usage across all machines for the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {reportData.summary.avgCpuUsage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Average CPU Usage</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {reportData.summary.avgMemoryUsage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Average Memory Usage</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                          {reportData.summary.avgDiskUsage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Average Disk Usage</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Machine Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Machine Performance Details</CardTitle>
                    <CardDescription>
                      Individual machine performance for the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reportData.machines.map((machine, index) => (
                        <div key={machine.name}>
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Server className="h-5 w-5 text-gray-500" />
                                <span className="font-medium">{machine.name}</span>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    className="cursor-help"
                                    variant={
                                      machine.status === 'online' ? 'default' : 
                                      machine.status === 'warning' ? 'secondary' : 'destructive'
                                    }
                                  >
                                    {machine.status}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {machine.status === 'online' ? 'Last seen within 5 minutes' :
                                     machine.status === 'warning' ? 'Last seen 5 minutes to 1 hour ago' :
                                     'Last seen more than 1 hour ago'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm">
                              <div className="text-center">
                                <div className="font-medium text-blue-600">
                                  {machine.avgCpuUsage.toFixed(1)}%
                                </div>
                                <div className="text-gray-500">CPU</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-green-600">
                                  {machine.avgMemoryUsage.toFixed(1)}%
                                </div>
                                <div className="text-gray-500">Memory</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-purple-600">
                                  {machine.avgDiskUsage.toFixed(1)}%
                                </div>
                                <div className="text-gray-500">Disk</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-gray-600">
                                  {machine.totalDataPoints}
                                </div>
                                <div className="text-gray-500">Data Points</div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-500">
                                  <Clock className="h-4 w-4 inline mr-1" />
                                  {new Date(machine.lastSeen).toLocaleDateString('en-AU')}
                                </div>
                              </div>
                            </div>
                          </div>
                          {index < reportData.machines.length - 1 && <Separator className="my-2" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {reportData.type === 'system' && (
              <>
                {/* System Health Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Machines</p>
                          <p className="text-2xl font-bold">{reportData.summary.totalMachines}</p>
                        </div>
                        <Server className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="cursor-help">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Healthy</p>
                              <p className="text-2xl font-bold text-green-600">{reportData.summary.healthyMachines}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Machines with health score &gt; 80 and active within 5 minutes</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="cursor-help">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Degraded</p>
                              <p className="text-2xl font-bold text-yellow-600">{reportData.summary.degradedMachines}</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-yellow-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Machines with health score 50-80 or last seen within 1 hour</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="cursor-help">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Critical</p>
                              <p className="text-2xl font-bold text-red-600">{reportData.summary.criticalMachines}</p>
                            </div>
                            <XCircle className="h-8 w-8 text-red-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Machines with health score ≤ 50 or offline for &gt; 1 hour</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* System Health Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>System Health Summary</CardTitle>
                    <CardDescription>
                      Overall system health metrics and alert statistics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {reportData.summary.avgUptime.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Average Uptime</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-600">
                          {reportData.summary.totalAlerts}
                        </div>
                        <div className="text-sm text-gray-600">Alerts Triggered</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Machine Health Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Machine Health Details</CardTitle>
                    <CardDescription>
                      Individual machine health status and service information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reportData.machines.map((machine, index) => (
                        <div key={machine.name}>
                          <div className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Server className="h-5 w-5 text-gray-500" />
                                  <span className="font-medium">{machine.name}</span>
                                </div>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      className="cursor-help"
                                      variant={
                                        machine.status === 'healthy' ? 'default' : 
                                        machine.status === 'degraded' ? 'secondary' : 'destructive'
                                      }
                                    >
                                      {machine.status}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {machine.status === 'healthy' ? 'Health score > 80, active within 5 minutes' :
                                       machine.status === 'degraded' ? 'Health score 50-80, or last seen within 1 hour' :
                                       'Health score ≤ 50 or offline for > 1 hour'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              
                              <div className="flex items-center gap-6 text-sm">
                                <div className="text-center">
                                  <div className="font-medium text-green-600">
                                    {machine.uptime.toFixed(1)}%
                                  </div>
                                  <div className="text-gray-500">Uptime</div>
                                </div>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-center cursor-help">
                                      <div className="font-medium text-blue-600">
                                        {machine.healthScore}
                                      </div>
                                      <div className="text-gray-500">Health Score</div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-sm">
                                      <p>Health score (0-100) based on period averages:</p>
                                      <p><strong>CPU (40pts):</strong> &gt;90%=-40, &gt;80%=-25, &gt;70%=-15</p>
                                      <p><strong>Memory (30pts):</strong> &gt;95%=-30, &gt;85%=-20, &gt;75%=-10</p>
                                      <p><strong>Disk (20pts):</strong> &gt;95%=-20, &gt;85%=-15, &gt;75%=-8</p>
                                      <p><strong>Uptime (10pts):</strong> &lt;50%=-10, &lt;80%=-6, &lt;95%=-3</p>
                                      <p><strong>Alerts (10pts):</strong> Critical=-2ea, Warning=-0.5ea</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                                <div className="text-center">
                                  <div className="font-medium text-red-600">
                                    {machine.criticalAlerts || 0}
                                  </div>
                                  <div className="text-gray-500">Critical Alerts</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-yellow-600">
                                    {machine.warningAlerts || 0}
                                  </div>
                                  <div className="text-gray-500">Warning Alerts</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-gray-500">
                                    <Clock className="h-4 w-4 inline mr-1" />
                                    {new Date(machine.lastSeen).toLocaleDateString('en-AU')}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-sm font-medium text-gray-700 mb-2">
                                Last Seen: {new Date(machine.lastSeen).toLocaleString('en-AU')}
                              </div>
                            </div>

                            {machine.alerts && machine.alerts.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="text-sm font-medium text-gray-700 mb-2">Recent Alerts:</div>
                                <div className="space-y-2">
                                  {machine.alerts.slice(0, 3).map((alert) => (
                                    <div key={alert.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                                      <div className="flex items-center gap-2">
                                        <Badge 
                                          variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {alert.severity}
                                        </Badge>
                                        <span className="font-medium">{alert.type}</span>
                                      </div>
                                      <div className="text-gray-500">
                                        {new Date(alert.timestamp).toLocaleDateString('en-AU')}
                                      </div>
                                    </div>
                                  ))}
                                  {machine.alerts.length > 3 && (
                                    <div className="text-xs text-gray-500 text-center">
                                      +{machine.alerts.length - 3} more alerts
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Top Resource Consumers */}
                            {(machine.processHealth?.topProcessesByCpu.length > 0 || machine.processHealth?.topProcessesByMemory.length > 0 || machine.serviceHealth?.highCpuServices.length > 0 || machine.serviceHealth?.highMemoryServices.length > 0) && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                  Top Resource Consumers:
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                  <div>
                                    <div className="text-xs text-gray-600 mb-2 font-medium">High CPU Usage:</div>
                                    <div className="space-y-2">
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">Processes:</div>
                                        <div className="space-y-1">
                                          {machine.processHealth.topProcessesByCpu.slice(0, 3).map((proc, idx) => (
                                            <div key={idx} className="flex justify-between text-xs">
                                              <span className="truncate">{proc.name}</span>
                                              <span className="text-red-600 font-medium">{proc.cpu.toFixed(1)}%</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      {machine.serviceHealth.highCpuServices.length > 0 && (
                                        <div>
                                          <div className="text-xs text-gray-500 mb-1">Services:</div>
                                          <div className="space-y-1">
                                            {machine.serviceHealth.highCpuServices.slice(0, 3).map((service, idx) => (
                                              <div key={idx} className="flex justify-between text-xs">
                                                <span className="truncate">{service.displayName}</span>
                                                <span className="text-red-600 font-medium">{service.cpu.toFixed(1)}%</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600 mb-2 font-medium">High Memory Usage:</div>
                                    <div className="space-y-2">
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">Processes:</div>
                                        <div className="space-y-1">
                                          {machine.processHealth.topProcessesByMemory.slice(0, 3).map((proc, idx) => (
                                            <div key={idx} className="flex justify-between text-xs">
                                              <span className="truncate">{proc.name}</span>
                                              <span className="text-blue-600 font-medium">{proc.memory.toFixed(1)}%</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      {machine.serviceHealth.highMemoryServices.length > 0 && (
                                        <div>
                                          <div className="text-xs text-gray-500 mb-1">Services:</div>
                                          <div className="space-y-1">
                                            {machine.serviceHealth.highMemoryServices.slice(0, 3).map((service, idx) => (
                                              <div key={idx} className="flex justify-between text-xs">
                                                <span className="truncate">{service.displayName}</span>
                                                <span className="text-blue-600 font-medium">{service.memory.toFixed(1)}%</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Processes Section */}
                            {machine.processHealth && machine.processHealth.totalProcesses > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                  Processes ({machine.processHealth.totalProcesses} total):
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <div className="text-xs text-gray-600 mb-1">Running:</div>
                                    <div className="space-y-1">
                                      {machine.processHealth.runningProcessesList.slice(0, 5).map((proc, idx) => (
                                        <div key={idx} className="flex justify-between text-xs">
                                          <span className="truncate">{proc.name}</span>
                                          <span className="text-green-600 text-xs">
                                            {proc.cpu.toFixed(1)}% CPU, {proc.memory.toFixed(1)}% RAM
                                          </span>
                                        </div>
                                      ))}
                                      {machine.processHealth.runningProcessesList.length > 5 && (
                                        <div className="text-xs text-gray-500">
                                          +{machine.processHealth.runningProcessesList.length - 5} more
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600 mb-1">Stopped:</div>
                                    <div className="space-y-1">
                                      {machine.processHealth.stoppedProcessesList.slice(0, 5).map((proc, idx) => (
                                        <div key={idx} className="flex justify-between text-xs">
                                          <span className="truncate">{proc.name}</span>
                                          <span className="text-red-600 text-xs">{proc.status}</span>
                                        </div>
                                      ))}
                                      {machine.processHealth.stoppedProcessesList.length > 5 && (
                                        <div className="text-xs text-gray-500">
                                          +{machine.processHealth.stoppedProcessesList.length - 5} more
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Services Section */}
                            {machine.serviceHealth && machine.serviceHealth.totalServices > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                  Services ({machine.serviceHealth.runningServices}/{machine.serviceHealth.totalServices} running):
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <div className="text-xs text-gray-600 mb-1">Running ({machine.serviceHealth.runningServices}):</div>
                                    <div className="space-y-1">
                                      {machine.serviceHealth.runningServicesList.slice(0, 5).map((service, idx) => (
                                        <div key={idx} className="flex justify-between text-xs">
                                          <span className="truncate">{service.displayName}</span>
                                          <span className="text-green-600 text-xs">
                                            {service.cpu > 0 || service.memory > 0 
                                              ? `${service.cpu.toFixed(1)}% CPU, ${service.memory.toFixed(1)}% RAM`
                                              : 'running'
                                            }
                                          </span>
                                        </div>
                                      ))}
                                      {machine.serviceHealth.runningServices > machine.serviceHealth.runningServicesList.length && (
                                        <div className="text-xs text-gray-500">
                                          +{machine.serviceHealth.runningServices - machine.serviceHealth.runningServicesList.length} more
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600 mb-1">Stopped ({machine.serviceHealth.stoppedServices}):</div>
                                    <div className="space-y-1">
                                      {machine.serviceHealth.stoppedServicesList.slice(0, 5).map((service, idx) => (
                                        <div key={idx} className="flex justify-between text-xs">
                                          <span className="truncate">{service.displayName}</span>
                                          <span className="text-red-600 text-xs">stopped</span>
                                        </div>
                                      ))}
                                      {machine.serviceHealth.stoppedServices > machine.serviceHealth.stoppedServicesList.length && (
                                        <div className="text-xs text-gray-500">
                                          +{machine.serviceHealth.stoppedServices - machine.serviceHealth.stoppedServicesList.length} more
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          {index < reportData.machines.length - 1 && <Separator className="my-2" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}


            {/* Report Metadata */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div>
                    Report generated on {new Date(reportData.generatedAt).toLocaleString('en-AU')}
                  </div>
                  <div>
                    Data range: {new Date(reportData.timeRange.from).toLocaleDateString('en-AU')} - {new Date(reportData.timeRange.to).toLocaleDateString('en-AU')}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      </DashboardLayout>
    </TooltipProvider>
  );
}
