import jsPDF from 'jspdf';

// Report data interfaces
interface PerformanceReportData {
  type: 'performance';
  summary: {
    totalMachines: number;
    onlineMachines: number;
    offlineMachines: number;
    warningMachines: number;
    avgCpuUsage: number;
    avgMemoryUsage: number;
    avgDiskUsage: number;
  };
  machines: Array<{
    name: string;
    status: string;
    lastSeen: string;
    avgCpuUsage: number;
    avgMemoryUsage: number;
    avgDiskUsage: number;
    totalDataPoints: number;
  }>;
  timeRange: {
    from: string;
    to: string;
  };
  generatedAt: string;
}

interface SystemHealthReportData {
  type: 'system';
  summary: {
    totalMachines: number;
    healthyMachines: number;
    degradedMachines: number;
    criticalMachines: number;
    avgUptime: number;
    totalAlerts: number;
  };
  machines: Array<{
    name: string;
    status: string;
    uptime: number;
    lastSeen: string;
    healthScore: number;
    criticalAlerts: number;
    warningAlerts: number;
    alerts: Array<{
      id: string;
      severity: string;
      type: string;
      message: string;
      timestamp: string;
    }>;
    processHealth: {
      totalProcesses: number;
      highResourceProcesses: number;
      topProcessesByCpu: Array<{ name: string; cpu: number }>;
      topProcessesByMemory: Array<{ name: string; memory: number }>;
    };
    serviceHealth: {
      totalServices: number;
      runningServices: number;
      stoppedServices: number;
      highCpuServices: Array<{ name: string; displayName: string; cpu: number }>;
      highMemoryServices: Array<{ name: string; displayName: string; memory: number }>;
    };
  }>;
  timeRange: {
    from: string;
    to: string;
  };
  generatedAt: string;
}

type ReportData = PerformanceReportData | SystemHealthReportData;

/**
 * Generates a clean, text-based PDF report
 */
export const generateReportPDF = (data: ReportData): void => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let yPosition = 20;
  const pageHeight = 297;
  const margin = 20;
  const lineHeight = 6;

  // Helper function to add text with automatic page breaks
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = 20;
    }
    
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setTextColor('#000000'); // Always black text
    pdf.text(text, margin, yPosition);
    yPosition += lineHeight + (fontSize > 12 ? 2 : 0);
  };

  // Helper function to add a section break
  const addSectionBreak = () => {
    yPosition += 5;
    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = 20;
    }
  };

  // Report Header
  const reportTitle = data.type === 'performance' ? 'Performance Report' : 'System Health Report';
  addText(`OverSight ${reportTitle}`, 20, true);
  addText(`Generated: ${new Date(data.generatedAt).toLocaleString('en-AU')}`, 10);
  addText(`Date Range: ${new Date(data.timeRange.from).toLocaleDateString('en-AU')} - ${new Date(data.timeRange.to).toLocaleDateString('en-AU')}`, 10);
  
  addSectionBreak();
  addText('===============================================================================', 10);
  addSectionBreak();

  if (data.type === 'performance') {
    // Performance Report Content
    addText('PERFORMANCE SUMMARY', 16, true);
    addSectionBreak();
    
    addText(`Total Machines: ${data.summary.totalMachines}`, 12);
    addText(`Online Machines: ${data.summary.onlineMachines}`, 12);
    addText(`Offline Machines: ${data.summary.offlineMachines}`, 12);
    addText(`Warning Machines: ${data.summary.warningMachines}`, 12);
    addSectionBreak();
    
    addText(`Average CPU Usage: ${data.summary.avgCpuUsage.toFixed(1)}%`, 12);
    addText(`Average Memory Usage: ${data.summary.avgMemoryUsage.toFixed(1)}%`, 12);
    addText(`Average Disk Usage: ${data.summary.avgDiskUsage.toFixed(1)}%`, 12);
    
    addSectionBreak();
    addText('MACHINE PERFORMANCE DETAILS', 16, true);
    addSectionBreak();

    data.machines.forEach((machine, index) => {
      addText(`${index + 1}. ${machine.name} (${machine.status.toUpperCase()})`, 14, true);
      addText(`   CPU: ${machine.avgCpuUsage.toFixed(1)}% | Memory: ${machine.avgMemoryUsage.toFixed(1)}% | Disk: ${machine.avgDiskUsage.toFixed(1)}%`, 11);
      addText(`   Data Points: ${machine.totalDataPoints} | Last Seen: ${new Date(machine.lastSeen).toLocaleDateString('en-AU')}`, 11);
      addSectionBreak();
    });

  } else {
    // System Health Report Content
    addText('SYSTEM HEALTH SUMMARY', 16, true);
    addSectionBreak();
    
    addText(`Total Machines: ${data.summary.totalMachines}`, 12);
    addText(`Healthy Machines: ${data.summary.healthyMachines}`, 12);
    addText(`Degraded Machines: ${data.summary.degradedMachines}`, 12);
    addText(`Critical Machines: ${data.summary.criticalMachines}`, 12);
    addSectionBreak();
    
    addText(`Average Uptime: ${data.summary.avgUptime.toFixed(1)}%`, 12);
    addText(`Total Alerts Triggered: ${data.summary.totalAlerts}`, 12);
    
    addSectionBreak();
    addText('MACHINE HEALTH DETAILS', 16, true);
    addSectionBreak();

    data.machines.forEach((machine, index) => {
      addText(`${index + 1}. ${machine.name} (${machine.status.toUpperCase()})`, 14, true);
      addText(`   Health Score: ${machine.healthScore} | Uptime: ${machine.uptime.toFixed(1)}%`, 11);
      addText(`   Critical Alerts: ${machine.criticalAlerts || 0} | Warning Alerts: ${machine.warningAlerts || 0}`, 11);
      addText(`   Processes: ${machine.processHealth.totalProcesses} | Services: ${machine.serviceHealth.totalServices} (${machine.serviceHealth.runningServices} running)`, 11);
      addText(`   Last Seen: ${new Date(machine.lastSeen).toLocaleString('en-AU')}`, 11);
      
      // Recent Alerts
      if (machine.alerts && machine.alerts.length > 0) {
        addText(`   Recent Alerts:`, 11, true);
        machine.alerts.slice(0, 5).forEach(alert => {
          addText(`     • ${alert.severity.toUpperCase()}: ${alert.type} - ${alert.message}`, 10);
          addText(`       ${new Date(alert.timestamp).toLocaleString('en-AU')}`, 9);
        });
        if (machine.alerts.length > 5) {
          addText(`     ... and ${machine.alerts.length - 5} more alerts`, 10);
        }
      }
      
      // Top Resource Consumers
      if (machine.processHealth.topProcessesByCpu.length > 0) {
        addText(`   Top CPU Processes:`, 11, true);
        machine.processHealth.topProcessesByCpu.slice(0, 5).forEach(proc => {
          addText(`     • ${proc.name}: ${proc.cpu.toFixed(1)}%`, 10);
        });
      }
      
      if (machine.processHealth.topProcessesByMemory.length > 0) {
        addText(`   Top Memory Processes:`, 11, true);
        machine.processHealth.topProcessesByMemory.slice(0, 5).forEach(proc => {
          addText(`     • ${proc.name}: ${proc.memory.toFixed(1)}%`, 10);
        });
      }
      
      if (machine.serviceHealth.highCpuServices.length > 0) {
        addText(`   High CPU Services:`, 11, true);
        machine.serviceHealth.highCpuServices.slice(0, 3).forEach(service => {
          addText(`     • ${service.displayName}: ${service.cpu.toFixed(1)}%`, 10);
        });
      }
      
      if (machine.serviceHealth.highMemoryServices.length > 0) {
        addText(`   High Memory Services:`, 11, true);
        machine.serviceHealth.highMemoryServices.slice(0, 3).forEach(service => {
          addText(`     • ${service.displayName}: ${service.memory.toFixed(1)}%`, 10);
        });
      }
      
      addSectionBreak();
    });
  }

  // Generate filename and save
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `OverSight-${reportTitle.replace(' ', '-')}-${dateStr}.pdf`;
  pdf.save(filename);
};

/**
 * Generates appropriate filename for the PDF export
 */
export const generatePDFFilename = (reportType: string): string => {
  const reportTypeNames = {
    'performance': 'Performance-Report',
    'system': 'System-Health-Report',
    'alerts': 'System-Health-Report'
  };
  const reportTypeName = reportTypeNames[reportType as keyof typeof reportTypeNames] || 'Report';
  const dateStr = new Date().toISOString().split('T')[0];
  return `OverSight-${reportTypeName}-${dateStr}.pdf`;
};
