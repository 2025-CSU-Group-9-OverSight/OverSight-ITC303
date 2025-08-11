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
}

interface MetricsData {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
}

export default function LiveMetricsChart({ title = "Live System Metrics" }: LiveMetricsChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'disk'>('cpu');
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  // Mock data generator
  const generateMockMetrics = (): MetricsData => ({
    timestamp: new Date().toISOString(),
    cpu: Math.floor(Math.random() * 100),
    memory: Math.floor(Math.random() * 100),
    disk: Math.floor(Math.random() * 100),
  });

  useEffect(() => {
    // Initialize with some mock data
    const initialData = Array.from({ length: 10 }, (_, i) => {
      const time = new Date();
      time.setSeconds(time.getSeconds() - (10 - i) * 2);
      return {
        timestamp: time.toISOString(),
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        disk: Math.floor(Math.random() * 100),
      };
    });
    setMetricsData(initialData);

    // Update data every 2 seconds
    const interval = setInterval(() => {
      setMetricsData(prev => {
        const newData = [...prev, generateMockMetrics()];
        // Keep only last 50 data points to prevent memory issues
        return newData.slice(-50);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

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
          Data updates every 2 seconds • Last updated: {metricsData.length > 0 ? new Date(metricsData[metricsData.length - 1].timestamp).toLocaleTimeString() : 'Loading...'}
        </div>
      </CardContent>
    </Card>
  );
}
