import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/getDb';

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

interface AlertsReportData {
  type: 'alerts';
  summary: {
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    infoAlerts: number;
  };
  alerts: Array<{
    id: string;
    machineName: string;
    severity: 'critical' | 'warning' | 'info';
    type: string;
    message: string;
    timestamp: string;
  }>;
  timeRange: {
    from: string;
    to: string;
  };
  generatedAt: string;
}

type ReportData = PerformanceReportData | SystemHealthReportData | AlertsReportData;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceName = searchParams.get('deviceName') || 'all';
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const reportType = searchParams.get('reportType') || 'performance';

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'From date and to date are required' },
        { status: 400 }
      );
    }

    // Route to appropriate report generator based on type
    switch (reportType) {
      case 'performance':
        return await generatePerformanceReport(deviceName, fromDate, toDate);
      case 'system':
        return await generateSystemHealthReport(deviceName, fromDate, toDate);
      case 'alerts':
        // Alerts are now included in system health reports
        return await generateSystemHealthReport(deviceName, fromDate, toDate);
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function generatePerformanceReport(deviceName: string, fromDate: string, toDate: string): Promise<NextResponse> {
  const db = await getDb();
  const performanceLog = db.collection('performanceLog');

  // Build query for date range and device
  const query: any = {
    timestamp: {
      $gte: new Date(fromDate),
      $lte: new Date(toDate + 'T23:59:59.999Z')
    }
  };

  if (deviceName !== 'all') {
    query['meta.deviceName'] = deviceName;
  }

  const logs = await performanceLog.find(query).sort({ timestamp: 1 }).toArray();

  // Process performance data
  const machineMap = new Map<string, any>();
  const machineStats = new Map<string, {
    totalCpu: number;
    totalMemory: number;
    totalDisk: number;
    dataPoints: number;
    lastSeen: Date;
  }>();

  logs.forEach(log => {
    const machineName = log.meta?.deviceName;
    if (!machineName) return;

    if (!machineMap.has(machineName) || log.timestamp > machineMap.get(machineName).timestamp) {
      machineMap.set(machineName, log);
    }

    if (!machineStats.has(machineName)) {
      machineStats.set(machineName, {
        totalCpu: 0,
        totalMemory: 0,
        totalDisk: 0,
        dataPoints: 0,
        lastSeen: log.timestamp
      });
    }

    const stats = machineStats.get(machineName)!;
    stats.dataPoints++;
    stats.lastSeen = log.timestamp > stats.lastSeen ? log.timestamp : stats.lastSeen;

    if (log.cpu?.percentUsed && Array.isArray(log.cpu.percentUsed)) {
      const avgCpu = log.cpu.percentUsed.reduce((sum: number, core: number) => sum + core, 0) / log.cpu.percentUsed.length;
      stats.totalCpu += avgCpu;
    }

    if (log.ram?.percentUsed !== undefined) {
      stats.totalMemory += log.ram.percentUsed;
    }

    if (log.disk?.partitions) {
      const partitions = Object.values(log.disk.partitions);
      if (partitions.length > 0) {
        let totalCapacity = 0;
        let totalUsed = 0;
        
        partitions.forEach((partition: any) => {
          if (partition && typeof partition.total === 'number' && typeof partition.used === 'number') {
            totalCapacity += partition.total;
            totalUsed += partition.used;
          }
        });
        
        if (totalCapacity > 0) {
          const diskUsage = (totalUsed / totalCapacity) * 100;
          stats.totalDisk += diskUsage;
        }
      }
    }
  });

  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const machines = Array.from(machineMap.entries()).map(([name, latestLog]) => {
    const stats = machineStats.get(name)!;
    const lastSeen = stats.lastSeen;
    
    let status = 'offline';
    if (lastSeen > fiveMinutesAgo) {
      status = 'online';
    } else if (lastSeen > oneHourAgo) {
      status = 'warning';
    }

    return {
      name,
      status,
      lastSeen: lastSeen.toISOString(),
      avgCpuUsage: stats.dataPoints > 0 ? stats.totalCpu / stats.dataPoints : 0,
      avgMemoryUsage: stats.dataPoints > 0 ? stats.totalMemory / stats.dataPoints : 0,
      avgDiskUsage: stats.dataPoints > 0 ? stats.totalDisk / stats.dataPoints : 0,
      totalDataPoints: stats.dataPoints
    };
  });

  const totalMachines = machines.length;
  const onlineMachines = machines.filter(m => m.status === 'online').length;
  const offlineMachines = machines.filter(m => m.status === 'offline').length;
  const warningMachines = machines.filter(m => m.status === 'warning').length;

  const avgCpuUsage = totalMachines > 0 
    ? machines.reduce((sum, m) => sum + m.avgCpuUsage, 0) / totalMachines 
    : 0;
  const avgMemoryUsage = totalMachines > 0 
    ? machines.reduce((sum, m) => sum + m.avgMemoryUsage, 0) / totalMachines 
    : 0;
  const avgDiskUsage = totalMachines > 0 
    ? machines.reduce((sum, m) => sum + m.avgDiskUsage, 0) / totalMachines 
    : 0;

  const reportData: PerformanceReportData = {
    type: 'performance',
    summary: {
      totalMachines,
      onlineMachines,
      offlineMachines,
      warningMachines,
      avgCpuUsage,
      avgMemoryUsage,
      avgDiskUsage
    },
    machines,
    timeRange: {
      from: fromDate,
      to: toDate
    },
    generatedAt: new Date().toISOString()
  };

  return NextResponse.json(reportData);
}

async function generateSystemHealthReport(deviceName: string, fromDate: string, toDate: string): Promise<NextResponse> {
  const db = await getDb();
  const performanceLog = db.collection('performanceLog');
  const serviceLog = db.collection('serviceLog');
  const processLog = db.collection('processLog');
  const alertLog = db.collection('alertLog');

  const query: any = {
    timestamp: {
      $gte: new Date(fromDate),
      $lte: new Date(toDate + 'T23:59:59.999Z')
    }
  };

  if (deviceName !== 'all') {
    query['meta.deviceName'] = deviceName;
  }

  const [performanceLogs, serviceLogs, processLogs, alerts] = await Promise.all([
    performanceLog.find(query).sort({ timestamp: 1 }).toArray(),
    serviceLog.find(query).sort({ timestamp: 1 }).toArray(),
    processLog.find(query).sort({ timestamp: 1 }).toArray(),
    alertLog.find(query).sort({ timestamp: 1 }).toArray()
  ]);

  // Process system health data
  const machineMap = new Map<string, any>();
  const machineHealth = new Map<string, {
    uptime: number;
    healthScore: number;
    lastSeen: Date;
    services: Map<string, { status: string; lastCheck: Date }>;
    alerts: Array<{
      id: string;
      severity: string;
      type: string;
      message: string;
      timestamp: string;
    }>;
    resourceData?: {
      cpuReadings: number[];
      memoryReadings: number[];
      diskReadings: number[];
    };
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
  }>();

  // Process performance logs for health metrics (uptime and health score only)
  performanceLogs.forEach(log => {
    const machineName = log.meta?.deviceName;
    if (!machineName) return;

    if (!machineHealth.has(machineName)) {
      machineHealth.set(machineName, {
        uptime: 0,
        healthScore: 100,
        lastSeen: log.timestamp,
        services: new Map(),
        alerts: [],
        resourceData: {
          cpuReadings: [],
          memoryReadings: [],
          diskReadings: []
        },
        processHealth: {
          totalProcesses: 0,
          highResourceProcesses: 0,
          topProcessesByCpu: [],
          topProcessesByMemory: [],
          runningProcessesList: [],
          stoppedProcessesList: []
        },
        serviceHealth: {
          totalServices: 0,
          runningServices: 0,
          stoppedServices: 0,
          runningServicesList: [],
          stoppedServicesList: [],
          highCpuServices: [],
          highMemoryServices: []
        }
      });
    }

    const health = machineHealth.get(machineName)!;
    health.lastSeen = log.timestamp > health.lastSeen ? log.timestamp : health.lastSeen;

    // Accumulate resource usage data for health score calculation
    if (!health.resourceData) {
      health.resourceData = {
        cpuReadings: [],
        memoryReadings: [],
        diskReadings: []
      };
    }

    // Collect resource usage readings
    if (log.cpu?.percentUsed && Array.isArray(log.cpu.percentUsed)) {
      const avgCpu = log.cpu.percentUsed.reduce((sum: number, core: number) => sum + core, 0) / log.cpu.percentUsed.length;
      health.resourceData.cpuReadings.push(avgCpu);
    }

    if (log.ram?.percentUsed !== undefined) {
      health.resourceData.memoryReadings.push(log.ram.percentUsed);
    }

    if (log.disk?.partitions) {
      const partitions = Object.values(log.disk.partitions);
      let totalCapacity = 0;
      let totalUsed = 0;
      
      partitions.forEach((partition: any) => {
        if (partition && typeof partition.total === 'number' && typeof partition.used === 'number') {
          totalCapacity += partition.total;
          totalUsed += partition.used;
        }
      });
      
      if (totalCapacity > 0) {
        const overallDiskUsage = (totalUsed / totalCapacity) * 100;
        health.resourceData.diskReadings.push(overallDiskUsage);
      }
    }
  });


  // Process process logs for resource consumption analysis
  const machineProcessData = new Map<string, Array<any>>();
  
  processLogs.forEach(log => {
    const machineName = log.meta?.deviceName;
    if (!machineName || !log.processes) return;
    
    if (!machineProcessData.has(machineName)) {
      machineProcessData.set(machineName, []);
    }
    machineProcessData.get(machineName)!.push(...log.processes);
  });

  // Analyze process data for each machine
  machineProcessData.forEach((processes, machineName) => {
    if (!machineHealth.has(machineName)) {
      machineHealth.set(machineName, {
        uptime: 0,
        healthScore: 100,
        lastSeen: new Date(),
        services: new Map(),
        alerts: [],
        resourceData: {
          cpuReadings: [],
          memoryReadings: [],
          diskReadings: []
        },
        processHealth: {
          totalProcesses: 0,
          highResourceProcesses: 0,
          topProcessesByCpu: [],
          topProcessesByMemory: [],
          runningProcessesList: [],
          stoppedProcessesList: []
        },
        serviceHealth: {
          totalServices: 0,
          runningServices: 0,
          stoppedServices: 0,
          runningServicesList: [],
          stoppedServicesList: [],
          highCpuServices: [],
          highMemoryServices: []
        }
      });
    }

    const health = machineHealth.get(machineName)!;
    
    // Filter out system processes and invalid data
    const validProcesses = processes.filter((proc: any) => {
      const name = (proc.name || '').toLowerCase();
      return proc.name && 
             !name.includes('system idle process') && 
             !name.includes('system interrupts') &&
             !name.includes('dpc') &&
             (proc.cpu_percent !== undefined || proc.memory_percent !== undefined);
    });

    health.processHealth.totalProcesses = validProcesses.length;
    
    // Count high resource processes (>80% CPU or Memory)
    health.processHealth.highResourceProcesses = validProcesses.filter((proc: any) => 
      (proc.cpu_percent && proc.cpu_percent > 80) || 
      (proc.memory_percent && proc.memory_percent > 80)
    ).length;

    // Get top processes by CPU (average across time period)
    const cpuProcessMap = new Map<string, { total: number, count: number }>();
    validProcesses.forEach((proc: any) => {
      if (proc.cpu_percent && proc.cpu_percent > 0) {
        const key = proc.name;
        if (!cpuProcessMap.has(key)) {
          cpuProcessMap.set(key, { total: 0, count: 0 });
        }
        const data = cpuProcessMap.get(key)!;
        data.total += proc.cpu_percent;
        data.count += 1;
      }
    });

    health.processHealth.topProcessesByCpu = Array.from(cpuProcessMap.entries())
      .map(([name, data]) => ({ name, cpu: data.total / data.count }))
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 5);

    // Get top processes by Memory (average across time period)
    const memoryProcessMap = new Map<string, { total: number, count: number }>();
    validProcesses.forEach((proc: any) => {
      if (proc.memory_percent && proc.memory_percent > 0) {
        const key = proc.name;
        if (!memoryProcessMap.has(key)) {
          memoryProcessMap.set(key, { total: 0, count: 0 });
        }
        const data = memoryProcessMap.get(key)!;
        data.total += proc.memory_percent;
        data.count += 1;
      }
    });

    health.processHealth.topProcessesByMemory = Array.from(memoryProcessMap.entries())
      .map(([name, data]) => ({ name, memory: data.total / data.count }))
      .sort((a, b) => b.memory - a.memory)
      .slice(0, 5);

    // Get running and stopped processes for display (all processes for CSV export)
    const runningProcesses = validProcesses.filter((proc: any) => 
      proc.status === 'running' || proc.status === 'sleeping' || !proc.status
    );
    
    const stoppedProcesses = validProcesses.filter((proc: any) => 
      proc.status === 'stopped' || proc.status === 'terminated' || proc.status === 'zombie'
    );

    health.processHealth.runningProcessesList = runningProcesses.map((proc: any) => ({
      name: proc.name,
      cpu: proc.cpu_percent || 0,
      memory: proc.memory_percent || 0
    }));

    health.processHealth.stoppedProcessesList = stoppedProcesses.map((proc: any) => ({
      name: proc.name,
      status: proc.status || 'stopped'
    }));
  });

  // Enhanced service analysis
  serviceLogs.forEach(log => {
    const machineName = log.meta?.deviceName;
    if (!machineName || !log.services) return;

    if (!machineHealth.has(machineName)) {
      machineHealth.set(machineName, {
        uptime: 0,
        healthScore: 100,
        lastSeen: log.timestamp,
        services: new Map(),
        alerts: [],
        resourceData: {
          cpuReadings: [],
          memoryReadings: [],
          diskReadings: []
        },
        processHealth: {
          totalProcesses: 0,
          highResourceProcesses: 0,
          topProcessesByCpu: [],
          topProcessesByMemory: [],
          runningProcessesList: [],
          stoppedProcessesList: []
        },
        serviceHealth: {
          totalServices: 0,
          runningServices: 0,
          stoppedServices: 0,
          runningServicesList: [],
          stoppedServicesList: [],
          highCpuServices: [],
          highMemoryServices: []
        }
      });
    }

    const health = machineHealth.get(machineName)!;
    
    // Update service counts
    health.serviceHealth.totalServices = log.services.length;
    health.serviceHealth.runningServices = log.services.filter((s: any) => s.status === 'running').length;
    health.serviceHealth.stoppedServices = log.services.filter((s: any) => s.status === 'stopped').length;
    
    // Get running and stopped services for display (no limit for CSV export)
    const runningServices = log.services.filter((s: any) => s.status === 'running');
    const stoppedServices = log.services.filter((s: any) => s.status === 'stopped');
    
    // Store service data for display with resource usage
    health.serviceHealth.runningServicesList = runningServices.map((service: any) => ({
      name: service.name,
      displayName: service.display_name || service.name,
      status: service.status,
      cpu: service.cpu_percent || 0,
      memory: service.memory_percent || 0
    }));
    
    health.serviceHealth.stoppedServicesList = stoppedServices.map((service: any) => ({
      name: service.name,
      displayName: service.display_name || service.name,
      status: service.status,
      cpu: service.cpu_percent || 0,
      memory: service.memory_percent || 0
    }));

    // Identify high CPU and high memory services
    const highCpuServices = log.services
      .filter((service: any) => {
        const hasCpuData = service.cpu_percent !== undefined && service.cpu_percent !== null;
        return hasCpuData && service.cpu_percent > 10;
      })
      .sort((a: any, b: any) => (b.cpu_percent || 0) - (a.cpu_percent || 0));

    const highMemoryServices = log.services
      .filter((service: any) => {
        const hasMemoryData = service.memory_percent !== undefined && service.memory_percent !== null;
        return hasMemoryData && service.memory_percent > 5;
      })
      .sort((a: any, b: any) => (b.memory_percent || 0) - (a.memory_percent || 0));

    health.serviceHealth.highCpuServices = highCpuServices.map((service: any) => ({
      name: service.name,
      displayName: service.display_name || service.name,
      status: service.status,
      cpu: service.cpu_percent
    }));

    health.serviceHealth.highMemoryServices = highMemoryServices.map((service: any) => ({
      name: service.name,
      displayName: service.display_name || service.name,
      status: service.status,
      memory: service.memory_percent
    }));

    // Update services map for backward compatibility
    if (log.services && Array.isArray(log.services)) {
      log.services.forEach((service: any) => {
        if (service.name && service.status) {
          health.services.set(service.name, {
            status: service.status,
            lastCheck: log.timestamp
          });
        }
      });
    }
  });

  // Process alerts and assign to machines
  alerts.forEach((alert: any) => {
    const machineName = alert.meta?.deviceName;
    if (!machineName) return;

    if (!machineHealth.has(machineName)) {
      machineHealth.set(machineName, {
        uptime: 0,
        healthScore: 100,
        lastSeen: new Date(alert.timestamp),
        services: new Map(),
        alerts: [],
        resourceData: {
          cpuReadings: [],
          memoryReadings: [],
          diskReadings: []
        },
        processHealth: {
          totalProcesses: 0,
          highResourceProcesses: 0,
          topProcessesByCpu: [],
          topProcessesByMemory: [],
          runningProcessesList: [],
          stoppedProcessesList: []
        },
        serviceHealth: {
          totalServices: 0,
          runningServices: 0,
          stoppedServices: 0,
          runningServicesList: [],
          stoppedServicesList: [],
          highCpuServices: [],
          highMemoryServices: []
        }
      });
    }

    const health = machineHealth.get(machineName)!;
    health.alerts.push({
      id: alert._id?.toString() || alert.id,
      severity: alert.severity,
      type: alert.type,
      message: alert.message,
      timestamp: alert.timestamp
    });
  });

  // Calculate final health scores for all machines
  machineHealth.forEach((health, machineName) => {
    let healthScore = 100;
    
    if (health.resourceData) {
      // CPU Health Component (0-40 points)
      if (health.resourceData.cpuReadings.length > 0) {
        const avgCpu = health.resourceData.cpuReadings.reduce((sum, val) => sum + val, 0) / health.resourceData.cpuReadings.length;
        if (avgCpu > 90) {
          healthScore -= 40; // Critical CPU usage
        } else if (avgCpu > 80) {
          healthScore -= 25; // High CPU usage
        } else if (avgCpu > 70) {
          healthScore -= 15; // Moderate CPU usage
        }
      }
      
      // Memory Health Component (0-30 points)
      if (health.resourceData.memoryReadings.length > 0) {
        const avgMemory = health.resourceData.memoryReadings.reduce((sum, val) => sum + val, 0) / health.resourceData.memoryReadings.length;
        if (avgMemory > 95) {
          healthScore -= 30; // Critical memory usage
        } else if (avgMemory > 85) {
          healthScore -= 20; // High memory usage
        } else if (avgMemory > 75) {
          healthScore -= 10; // Moderate memory usage
        }
      }
      
      // Disk Health Component (0-20 points)
      if (health.resourceData.diskReadings.length > 0) {
        const avgDisk = health.resourceData.diskReadings.reduce((sum, val) => sum + val, 0) / health.resourceData.diskReadings.length;
        if (avgDisk > 95) {
          healthScore -= 20; // Critical disk usage
        } else if (avgDisk > 85) {
          healthScore -= 15; // High disk usage
        } else if (avgDisk > 75) {
          healthScore -= 8; // Moderate disk usage
        }
      }
    }
    
    // Calculate uptime for this machine
    const reportStartTime = new Date(fromDate);
    const reportEndTime = new Date(toDate + 'T23:59:59.999Z');
    const totalReportDuration = reportEndTime.getTime() - reportStartTime.getTime();
    
    const machinePerformanceLogs = performanceLogs
      .filter(log => log.meta?.deviceName === machineName)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    let uptime: number = 0;
    if (machinePerformanceLogs.length > 1) {
      let totalMonitoredTime = 0;
      const maxGapThreshold = 15 * 60 * 1000; // 15 minutes
      
      for (let i = 0; i < machinePerformanceLogs.length - 1; i++) {
        const currentTime = new Date(machinePerformanceLogs[i].timestamp).getTime();
        const nextTime = new Date(machinePerformanceLogs[i + 1].timestamp).getTime();
        const interval = nextTime - currentTime;
        
        if (interval <= maxGapThreshold) {
          totalMonitoredTime += interval;
        }
      }
      
      uptime = Math.min(100, (totalMonitoredTime / totalReportDuration) * 100);
    }
    
    // Uptime Impact (0-10 points)
    if (uptime < 50) {
      healthScore -= 10; // Very poor uptime
    } else if (uptime < 80) {
      healthScore -= 6; // Poor uptime
    } else if (uptime < 95) {
      healthScore -= 3; // Moderate uptime issues
    }
    
    // Alert Impact (0-10 points)
    const criticalAlertCount = health.alerts.filter(alert => alert.severity === 'critical').length;
    const warningAlertCount = health.alerts.filter(alert => alert.severity === 'warning').length;
    healthScore -= Math.min(10, criticalAlertCount * 2 + warningAlertCount * 0.5);
    
    health.healthScore = Math.max(0, Math.min(100, healthScore));
  });

  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const machines = Array.from(machineHealth.entries()).map(([name, health]) => {
    const lastSeen = health.lastSeen;
    
    let status = 'critical';
    if (lastSeen > fiveMinutesAgo && health.healthScore > 80) {
      status = 'healthy';
    } else if (lastSeen > oneHourAgo && health.healthScore > 50) {
      status = 'degraded';
    }

    // Calculate actual uptime based on data availability during the selected period
    const reportStartTime = new Date(fromDate);
    const reportEndTime = new Date(toDate + 'T23:59:59.999Z');
    const totalReportDuration = reportEndTime.getTime() - reportStartTime.getTime(); // milliseconds
    
    // Get all performance logs for this machine to calculate uptime
    const machinePerformanceLogs = performanceLogs
      .filter(log => log.meta?.deviceName === name)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    let uptime: number;
    if (machinePerformanceLogs.length === 0) {
      // No data during the period = 0% uptime
      uptime = 0;
    } else if (machinePerformanceLogs.length === 1) {
      // Only one data point - assume it represents minimal uptime
      uptime = Math.min(100, (5 * 60 * 1000 / totalReportDuration) * 100); // 5 minutes default
    } else {
      // Calculate actual intervals between timestamps
      let totalMonitoredTime = 0;
      let maxGapThreshold = 15 * 60 * 1000; // 15 minutes - if gap is larger, consider it downtime
      
      for (let i = 0; i < machinePerformanceLogs.length - 1; i++) {
        const currentTime = new Date(machinePerformanceLogs[i].timestamp).getTime();
        const nextTime = new Date(machinePerformanceLogs[i + 1].timestamp).getTime();
        const interval = nextTime - currentTime;
        
        // If interval is reasonable (< 15 minutes), count it as uptime
        if (interval <= maxGapThreshold) {
          totalMonitoredTime += interval;
        }
        // Large gaps are considered downtime and not counted
      }
      
      // Add time from first log to report start (if log is after start)
      const firstLogTime = new Date(machinePerformanceLogs[0].timestamp).getTime();
      if (firstLogTime > reportStartTime.getTime()) {
        // Machine came online after report start - don't count the gap as uptime
      } else {
        // Machine was online at report start
        const preReportTime = Math.min(maxGapThreshold, firstLogTime - reportStartTime.getTime());
        if (preReportTime > 0) totalMonitoredTime += preReportTime;
      }
      
      // Add time from last log to report end (if log is before end)
      const lastLogTime = new Date(machinePerformanceLogs[machinePerformanceLogs.length - 1].timestamp).getTime();
      if (lastLogTime < reportEndTime.getTime()) {
        const postReportTime = Math.min(maxGapThreshold, reportEndTime.getTime() - lastLogTime);
        totalMonitoredTime += postReportTime;
      }
      
      uptime = Math.min(100, (totalMonitoredTime / totalReportDuration) * 100);
    }

    // Count critical and warning alerts (ensure we always return numbers, not undefined)
    const criticalAlerts = health.alerts ? health.alerts.filter(alert => alert.severity === 'critical').length : 0;
    const warningAlerts = health.alerts ? health.alerts.filter(alert => alert.severity === 'warning').length : 0;

    return {
      name,
      status,
      uptime,
      lastSeen: lastSeen.toISOString(),
      healthScore: Math.round(health.healthScore),
      criticalAlerts,
      warningAlerts,
      alerts: health.alerts || [],
      processHealth: health.processHealth || {
        totalProcesses: 0,
        highResourceProcesses: 0,
        topProcessesByCpu: [],
        topProcessesByMemory: [],
        runningProcessesList: [],
        stoppedProcessesList: []
      },
      serviceHealth: health.serviceHealth || {
        totalServices: 0,
        runningServices: 0,
        stoppedServices: 0,
        runningServicesList: [],
        stoppedServicesList: [],
        highCpuServices: [],
        highMemoryServices: []
      },
      services: Array.from(health.services.entries()).map(([serviceName, serviceData]) => ({
        name: serviceName,
        status: serviceData.status,
        lastCheck: serviceData.lastCheck.toISOString()
      }))
    };
  });

  const totalMachines = machines.length;
  const healthyMachines = machines.filter(m => m.status === 'healthy').length;
  const degradedMachines = machines.filter(m => m.status === 'degraded').length;
  const criticalMachines = machines.filter(m => m.status === 'critical').length;
  const avgUptime = totalMachines > 0 
    ? machines.reduce((sum, m) => sum + m.uptime, 0) / totalMachines 
    : 0;
  const totalAlerts = alerts.length;

  const reportData: SystemHealthReportData = {
    type: 'system',
    summary: {
      totalMachines,
      healthyMachines,
      degradedMachines,
      criticalMachines,
      avgUptime,
      totalAlerts
    },
    machines,
    timeRange: {
      from: fromDate,
      to: toDate
    },
    generatedAt: new Date().toISOString()
  };

  return NextResponse.json(reportData);
}

async function generateAlertsReport(deviceName: string, fromDate: string, toDate: string): Promise<NextResponse> {
  const db = await getDb();
  const alertLog = db.collection('alertLog');

  const query: any = {
    timestamp: {
      $gte: new Date(fromDate),
      $lte: new Date(toDate + 'T23:59:59.999Z')
    }
  };

  if (deviceName !== 'all') {
    query['meta.deviceName'] = deviceName;
  }

  // Get alerts from the database
  const alerts = await alertLog.find(query).sort({ timestamp: -1 }).toArray();

  // Process alerts for the report format
  const processedAlerts = alerts.map((alert: any) => ({
    id: alert._id?.toString() || alert.id,
    machineName: alert.meta?.deviceName || 'Unknown',
    severity: alert.severity || 'info',
    type: alert.type || 'System Alert',
    message: alert.message || 'No message available',
    timestamp: alert.timestamp.toISOString()
  }));

  // Calculate summary statistics
  const totalAlerts = processedAlerts.length;
  const criticalAlerts = processedAlerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = processedAlerts.filter(a => a.severity === 'warning').length;
  const infoAlerts = processedAlerts.filter(a => a.severity === 'info').length;

  const reportData: AlertsReportData = {
    type: 'alerts',
    summary: {
      totalAlerts,
      criticalAlerts,
      warningAlerts,
      infoAlerts
    },
    alerts: processedAlerts,
    timeRange: {
      from: fromDate,
      to: toDate
    },
    generatedAt: new Date().toISOString()
  };

  return NextResponse.json(reportData);
}
