// CSV Generation Utilities for OverSight Reports
// Handles comprehensive CSV export for different report types

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
      runningProcessesList: Array<{ name: string; cpu: number; memory: number }>;
      stoppedProcessesList: Array<{ name: string; status: string }>;
    };
    serviceHealth: {
      totalServices: number;
      runningServices: number;
      stoppedServices: number;
      runningServicesList: Array<{ name: string; displayName: string; status: string; cpu: number; memory: number }>;
      stoppedServicesList: Array<{ name: string; displayName: string; status: string; cpu: number; memory: number }>;
      highCpuServices: Array<{ name: string; displayName: string; status: string; cpu: number }>;
      highMemoryServices: Array<{ name: string; displayName: string; status: string; memory: number }>;
    };
    services: Array<{
      name: string;
      status: string;
      lastCheck: string;
    }>;
  }>;
  timeRange: {
    from: string;
    to: string;
  };
  generatedAt: string;
}

export type ReportData = PerformanceReportData | SystemHealthReportData;

/**
 * Escapes CSV values to handle commas, quotes, and newlines
 */
const escapeCSV = (value: string | number): string => {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Formats dates using Australian locale (d/m/y)
 */
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-AU');
};

/**
 * Generates comprehensive CSV content for Performance Reports
 */
const generatePerformanceCSV = (data: PerformanceReportData): string => {
  const csvLines: string[] = [];
  
  // Report Header
  csvLines.push('OverSight Performance Report');
  csvLines.push(`Generated: ${formatDate(data.generatedAt)}`);
  csvLines.push(`Date Range: ${formatDate(data.timeRange.from)} - ${formatDate(data.timeRange.to)}`);
  csvLines.push('');
  
  // Summary Section
  csvLines.push('SUMMARY');
  csvLines.push(`Total Machines,${data.summary.totalMachines}`);
  csvLines.push(`Online Machines,${data.summary.onlineMachines}`);
  csvLines.push(`Warning Machines,${data.summary.warningMachines}`);
  csvLines.push(`Offline Machines,${data.summary.offlineMachines}`);
  csvLines.push(`Average CPU Usage (%),${data.summary.avgCpuUsage.toFixed(2)}`);
  csvLines.push(`Average Memory Usage (%),${data.summary.avgMemoryUsage.toFixed(2)}`);
  csvLines.push(`Average Disk Usage (%),${data.summary.avgDiskUsage.toFixed(2)}`);
  csvLines.push('');
  
  // Detailed Machine Data
  csvLines.push('MACHINE PERFORMANCE DETAILS');
  const headers = [
    'Machine Name',
    'Status',
    'Status Description',
    'Last Seen',
    'Avg CPU Usage (%)',
    'Avg Memory Usage (%)',
    'Avg Disk Usage (%)',
    'Total Data Points'
  ];
  csvLines.push(headers.map(escapeCSV).join(','));

  data.machines.forEach(machine => {
    const statusDesc = machine.status === 'online' ? 'Active within 5 minutes' :
                      machine.status === 'warning' ? 'Last seen 5min-1hr ago' :
                      'Offline for more than 1 hour';

    const row = [
      machine.name,
      machine.status,
      statusDesc,
      formatDate(machine.lastSeen),
      machine.avgCpuUsage.toFixed(2),
      machine.avgMemoryUsage.toFixed(2),
      machine.avgDiskUsage.toFixed(2),
      machine.totalDataPoints.toString()
    ];
    csvLines.push(row.map(escapeCSV).join(','));
  });

  return csvLines.join('\n');
};

/**
 * Generates comprehensive CSV content for System Health Reports
 */
const generateSystemHealthCSV = (data: SystemHealthReportData): string => {
  const csvLines: string[] = [];
  
  // Report Header
  csvLines.push('OverSight System Health Report');
  csvLines.push(`Generated: ${formatDate(data.generatedAt)}`);
  csvLines.push(`Date Range: ${formatDate(data.timeRange.from)} - ${formatDate(data.timeRange.to)}`);
  csvLines.push('');
  
  // Summary Section
  csvLines.push('HEALTH SUMMARY');
  csvLines.push(`Total Machines,${data.summary.totalMachines}`);
  csvLines.push(`Healthy Machines,${data.summary.healthyMachines}`);
  csvLines.push(`Degraded Machines,${data.summary.degradedMachines}`);
  csvLines.push(`Critical Machines,${data.summary.criticalMachines}`);
  csvLines.push(`Average Uptime (%),${data.summary.avgUptime.toFixed(2)}`);
  csvLines.push(`Total Alerts Triggered,${data.summary.totalAlerts}`);
  csvLines.push('');
  
  // Detailed Machine Health Data
  csvLines.push('MACHINE HEALTH DETAILS');
    const healthHeaders = [
      'Machine Name',
      'Health Status',
      'Health Score',
      'Health Grade',
      'Uptime (%)',
      'Critical Alerts',
      'Warning Alerts',
      'Total Alerts',
      'Last Seen',
      'Total Processes',
      'High Resource Processes',
      'Top CPU Process',
      'Top Memory Process',
      'Total Services',
      'Running Services',
      'Stopped Services',
      'Services Needing Attention'
    ];
  csvLines.push(healthHeaders.map(escapeCSV).join(','));

  data.machines.forEach(machine => {
    const healthGrade = machine.healthScore >= 90 ? 'A' :
                       machine.healthScore >= 80 ? 'B' :
                       machine.healthScore >= 70 ? 'C' :
                       machine.healthScore >= 60 ? 'D' : 'F';
    
    const activeServices = machine.services.filter(s => s.status === 'running' || s.status === 'active').length;
    const inactiveServices = machine.services.length - activeServices;

    const topCpuProcess = machine.processHealth.topProcessesByCpu.length > 0 
      ? `${machine.processHealth.topProcessesByCpu[0].name} (${machine.processHealth.topProcessesByCpu[0].cpu.toFixed(1)}%)`
      : 'None';
    
    const topMemoryProcess = machine.processHealth.topProcessesByMemory.length > 0
      ? `${machine.processHealth.topProcessesByMemory[0].name} (${machine.processHealth.topProcessesByMemory[0].memory.toFixed(1)}%)`
      : 'None';

    const row = [
      machine.name,
      machine.status,
      machine.healthScore.toString(),
      healthGrade,
      machine.uptime.toFixed(2),
      (machine.criticalAlerts || 0).toString(),
      (machine.warningAlerts || 0).toString(),
      ((machine.criticalAlerts || 0) + (machine.warningAlerts || 0)).toString(),
      formatDate(machine.lastSeen),
      machine.processHealth.totalProcesses.toString(),
      machine.processHealth.highResourceProcesses.toString(),
      topCpuProcess,
      topMemoryProcess,
      machine.serviceHealth.totalServices.toString(),
      machine.serviceHealth.runningServices.toString(),
      machine.serviceHealth.stoppedServices.toString(),
      (machine.serviceHealth.highCpuServices.length + machine.serviceHealth.highMemoryServices.length).toString()
    ];
    csvLines.push(row.map(escapeCSV).join(','));
  });

  // Alerts Details Section (prioritized - most important)
  csvLines.push('');
  csvLines.push('ALERT DETAILS BY MACHINE');
  const alertHeaders = [
    'Machine Name',
    'Alert ID',
    'Severity',
    'Alert Type',
    'Message',
    'Timestamp',
    'Date',
    'Time',
    'Age (hours)'
  ];
  csvLines.push(alertHeaders.map(escapeCSV).join(','));

  data.machines.forEach(machine => {
    if (machine.alerts.length > 0) {
      machine.alerts.forEach(alert => {
        const alertDate = new Date(alert.timestamp);
        const ageHours = ((new Date().getTime() - alertDate.getTime()) / (1000 * 60 * 60)).toFixed(1);

        const alertRow = [
          machine.name,
          alert.id,
          alert.severity,
          alert.type,
          alert.message,
          formatDate(alert.timestamp),
          alertDate.toLocaleDateString('en-AU'),
          alertDate.toLocaleTimeString('en-AU'),
          ageHours
        ];
        csvLines.push(alertRow.map(escapeCSV).join(','));
      });
    } else {
      csvLines.push([machine.name, 'No alerts', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'].map(escapeCSV).join(','));
    }
  });

  // Services Details Section
  csvLines.push('');
  csvLines.push('SERVICE DETAILS BY MACHINE');
  const serviceHeaders = [
    'Machine Name',
    'Service Name',
    'Service Display Name',
    'Service Status',
    'CPU Usage (%)',
    'Memory Usage (%)',
    'Last Check'
  ];
  csvLines.push(serviceHeaders.map(escapeCSV).join(','));

  data.machines.forEach(machine => {
    // Add running services with resource usage
    if (machine.serviceHealth.runningServicesList.length > 0) {
      machine.serviceHealth.runningServicesList.forEach(service => {
        const serviceRow = [
          machine.name,
          service.name,
          service.displayName,
          service.status,
          service.cpu > 0 ? service.cpu.toFixed(2) : '0.00',
          service.memory > 0 ? service.memory.toFixed(2) : '0.00',
          'Running'
        ];
        csvLines.push(serviceRow.map(escapeCSV).join(','));
      });
    }
    
    // Add stopped services
    if (machine.serviceHealth.stoppedServicesList.length > 0) {
      machine.serviceHealth.stoppedServicesList.forEach(service => {
        const serviceRow = [
          machine.name,
          service.name,
          service.displayName,
          service.status,
          'N/A',
          'N/A',
          'Stopped'
        ];
        csvLines.push(serviceRow.map(escapeCSV).join(','));
      });
    }
    
    // If no service data
    if (machine.serviceHealth.runningServicesList.length === 0 && machine.serviceHealth.stoppedServicesList.length === 0) {
      csvLines.push([machine.name, 'No services data', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'].map(escapeCSV).join(','));
    }
  });

  // Process Details Section
  csvLines.push('');
  csvLines.push('PROCESS DETAILS BY MACHINE');
  const processHeaders = [
    'Machine Name',
    'Process Name',
    'Process Status',
    'CPU Usage (%)',
    'Memory Usage (%)'
  ];
  csvLines.push(processHeaders.map(escapeCSV).join(','));

  data.machines.forEach(machine => {
    // Add running processes
    if (machine.processHealth.runningProcessesList.length > 0) {
      machine.processHealth.runningProcessesList.forEach(process => {
        const processRow = [
          machine.name,
          process.name,
          'running',
          process.cpu.toFixed(2),
          process.memory.toFixed(2)
        ];
        csvLines.push(processRow.map(escapeCSV).join(','));
      });
    }
    
    // Add stopped processes
    if (machine.processHealth.stoppedProcessesList.length > 0) {
      machine.processHealth.stoppedProcessesList.forEach(process => {
        const processRow = [
          machine.name,
          process.name,
          process.status,
          'N/A',
          'N/A'
        ];
        csvLines.push(processRow.map(escapeCSV).join(','));
      });
    }
    
    // If no process data
    if (machine.processHealth.runningProcessesList.length === 0 && machine.processHealth.stoppedProcessesList.length === 0) {
      csvLines.push([machine.name, 'No process data', 'N/A', 'N/A', 'N/A'].map(escapeCSV).join(','));
    }
  });


  return csvLines.join('\n');
};


/**
 * Main CSV generation function that routes to appropriate generator based on report type
 */
export const generateReportCSV = (data: ReportData): string => {
  switch (data.type) {
    case 'performance':
      return generatePerformanceCSV(data);
    case 'system':
      return generateSystemHealthCSV(data);
    default:
      throw new Error(`Unsupported report type: ${(data as any).type}`);
  }
};

/**
 * Generates appropriate filename for the CSV export based on report type
 */
export const generateCSVFilename = (reportType: string): string => {
  const reportTypeNames = {
    'performance': 'Performance-Report',
    'system': 'System-Health-Report',
    'alerts': 'Alerts-Issues-Report'
  };
  const reportTypeName = reportTypeNames[reportType as keyof typeof reportTypeNames] || 'Report';
  const dateStr = new Date().toISOString().split('T')[0];
  return `OverSight-${reportTypeName}-${dateStr}.csv`;
};
