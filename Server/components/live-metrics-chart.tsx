"use client";

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

declare global {
  interface Window {
    Plotly: any;
  }
}

interface LiveMetricsChartProps {
  title?: string;
  selectedMachine?: string;
}

interface MetricsData {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
}

interface WebSocketData {
  timestamp: string;
  device: {
    deviceName: string;
  };
  cpu: {
    percentUsed: number[];
  };
  ram: {
    percentUsed: number;
  };
  disk: {
    partitions?: {
      [device: string]: {
        mountpoint: string;
        fstype: string;
        total: number;
        used: number;
        free: number;
        percent: number;
      };
    };
  };
}

export default function LiveMetricsChart({ title = "Live System Metrics", selectedMachine = "all" }: LiveMetricsChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'disk'>('cpu');
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [machines, setMachines] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch available machines
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const res = await fetch('/api/machines');
        if (!res.ok) throw new Error('Failed to fetch machines');
        const data = await res.json();
        setMachines(data.machines || []);
      } catch (e) {
        console.error('Error fetching machines:', e);
      }
    };
    fetchMachines();
  }, []);

  // WebSocket connection management
  useEffect(() => {
    if (machines.length === 0) return; // Wait for machines to be loaded

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/liveview`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        
        if (selectedMachine === 'all') {
          // Subscribe to all available machines
          machines.forEach(machine => {
            ws.send(JSON.stringify({
              type: 'subscribe',
              deviceName: machine
            }));
          });
        } else {
          // Subscribe to the selected machine
          ws.send(JSON.stringify({
            type: 'subscribe',
            deviceName: selectedMachine
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          // Skip non-JSON messages (like "Connected", "ping", etc.)
          if (typeof event.data !== 'string' || !event.data.trim().startsWith('{')) {
            console.log('WebSocket non-JSON message:', event.data);
            return;
          }
          
          const data: WebSocketData = JSON.parse(event.data);
          
          // Skip if this doesn't look like metrics data
          if (!data.cpu || !data.ram || !data.device || !data.timestamp) {
            console.log('WebSocket message missing required fields:', data);
            return;
          }
          
          // Calculate average CPU from individual core percentages
          const avgCpu = data.cpu.percentUsed.reduce((sum: number, core: number) => sum + core, 0) / data.cpu.percentUsed.length;
          
          // Calculate overall disk usage across all partitions 
          let diskUsage = 0;
          if (data.disk.partitions) {
            const partitions = Object.values(data.disk.partitions);
            if (partitions.length > 0) {
              // Calculate usage based on total capacity
              let totalCapacity = 0;
              let totalUsed = 0;
              
              partitions.forEach(partition => {
                totalCapacity += partition.total;
                totalUsed += partition.used;
              });
              
              if (totalCapacity > 0) {
                diskUsage = Math.round((totalUsed / totalCapacity) * 100);
              }
            }
          }

          const newMetricsData: MetricsData = {
            timestamp: data.timestamp,
            cpu: Math.round(avgCpu),
            memory: Math.round(data.ram.percentUsed),
            disk: diskUsage
          };

          setMetricsData(prev => {
            if (selectedMachine === 'all') {
              // For "all machines", accumulate data from different machines
              // Remove old data from this machine and add new data
              const otherMachineData = prev.filter(d => !d.timestamp.includes(data.device.deviceName));
              return [...otherMachineData, newMetricsData].slice(-50);
            } else {
              // For single machine, replace all data
              const newData = [...prev, newMetricsData];
              // Keep only last 50 data points to prevent memory issues
              return newData.slice(-50);
            }
          });
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setConnectionError('Connection lost');
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error');
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to connect');
    }

    return () => {
      if (wsRef.current) {
        // Unsubscribe before closing
        if (selectedMachine === 'all') {
          // Unsubscribe from all machines
          machines.forEach(machine => {
            wsRef.current?.send(JSON.stringify({
              type: 'unsubscribe',
              deviceName: machine
            }));
          });
        } else {
          wsRef.current.send(JSON.stringify({
            type: 'unsubscribe',
            deviceName: selectedMachine
          }));
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedMachine, machines]);

  // Clear metrics data when machine filter changes
  useEffect(() => {
    setMetricsData([]);
  }, [selectedMachine]);

  useEffect(() => {
    if (!chartRef.current || metricsData.length === 0) return;

    // Load Plotly if not already loaded
    if (!window.Plotly) {
      const script = document.createElement('script');
      script.src = 'https://cdn.plot.ly/plotly-latest.min.js';
      script.onload = () => {
        createChart();
      };
      document.head.appendChild(script);
    } else {
      createChart();
    }
  }, [metricsData, selectedMetric]);

  const createChart = () => {
    if (!chartRef.current || !window.Plotly) return;

    const timestamps = metricsData.map(d => new Date(d.timestamp));
    const values = metricsData.map(d => d[selectedMetric]);

    const data = [{
      x: timestamps,
      y: values,
      type: 'scatter',
      mode: 'lines+markers',
      line: {
        color: getMetricColor(selectedMetric),
        width: 2
      },
      marker: {
        size: 4,
        color: getMetricColor(selectedMetric)
      },
      name: getMetricLabel(selectedMetric)
    }];

    const layout = {
      xaxis: {
        title: 'Time',
        type: 'date',
        tickformat: '%H:%M:%S'
      },
      yaxis: {
        title: `${getMetricLabel(selectedMetric)} (%)`,
        range: [0, 100]
      },
      margin: { l: 50, r: 50, t: 50, b: 50 },
      height: 200,
      showlegend: false,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)'
    };

    const config = {
      responsive: true,
      displayModeBar: false
    };

    window.Plotly.newPlot(chartRef.current, data, layout, config);
  };

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'cpu': return '#3b82f6';
      case 'memory': return '#B514FC';
      case 'disk': return '#3BB516';
      default: return '#3b82f6';
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'cpu': return 'CPU';
      case 'memory': return 'Memory';
      case 'disk': return 'Disk';
      default: return 'CPU';
    }
  };

  const getCurrentValue = () => {
    if (metricsData.length === 0) return 0;
    return metricsData[metricsData.length - 1][selectedMetric];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Select value={selectedMetric} onValueChange={(value: 'cpu' | 'memory' | 'disk') => setSelectedMetric(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cpu">CPU</SelectItem>
              <SelectItem value="memory">Memory</SelectItem>
              <SelectItem value="disk">Disk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold" style={{ color: getMetricColor(selectedMetric) }}>
              {getCurrentValue()}%
            </span>
          </div>
        </div>
        <div ref={chartRef} className="w-full" />
        <div className="mt-4 text-xs text-muted-foreground text-center">
          {isConnected ? (
            <span className="text-green-600">
              ● Live data • {selectedMachine === 'all' ? 'All machines' : selectedMachine} • 
              Last updated: {metricsData.length > 0 ? new Date(metricsData[metricsData.length - 1].timestamp).toLocaleTimeString() : 'Waiting for data...'}
            </span>
          ) : connectionError ? (
            <span className="text-red-600">● {connectionError}</span>
          ) : (
            <span className="text-gray-600">● Connecting...</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
