'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface AlertThresholds {
  cpu: number;
  ram: number;
  disk: number;
  timeout: number;
}

interface AlertThresholdManagerProps {
  className?: string;
}

export default function AlertThresholdManager({ className }: AlertThresholdManagerProps) {
  const [thresholds, setThresholds] = useState<AlertThresholds>({
    cpu: 85,
    ram: 80,
    disk: 95,
    timeout: 30
  });
  const [originalThresholds, setOriginalThresholds] = useState<AlertThresholds>({
    cpu: 85,
    ram: 80,
    disk: 95,
    timeout: 30
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current thresholds
  const fetchThresholds = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/alert-thresholds');
      
      if (!response.ok) {
        throw new Error('Failed to fetch thresholds');
      }
      
      const data = await response.json();
      if (data.success) {
        const thresholdData = {
          ...data.thresholds,
          timeout: data.timeout
        };
        setThresholds(thresholdData);
        setOriginalThresholds(thresholdData);
        setMessage({ type: 'info', text: 'Current thresholds loaded successfully' });
      } else {
        throw new Error(data.error || 'Failed to load thresholds');
      }
    } catch (error) {
      console.error('Error fetching thresholds:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to load thresholds: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save thresholds
  const saveThresholds = async () => {
    try {
      setIsSaving(true);
      setMessage(null);
      
      const response = await fetch('/api/admin/alert-thresholds', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(thresholds),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOriginalThresholds(thresholds);
        setHasChanges(false);
        setMessage({ type: 'success', text: 'Alert thresholds updated successfully!' });
      } else {
        throw new Error(data.error || 'Failed to update thresholds');
      }
    } catch (error) {
      console.error('Error saving thresholds:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to save thresholds: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original values
  const resetThresholds = () => {
    setThresholds(originalThresholds);
    setHasChanges(false);
    setMessage(null);
  };

  // Handle input changes
  const handleThresholdChange = (type: keyof AlertThresholds, value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setThresholds(prev => ({ ...prev, [type]: numValue }));
    }
  };

  // Check for changes
  useEffect(() => {
    const changed = Object.keys(thresholds).some(
      key => thresholds[key as keyof AlertThresholds] !== originalThresholds[key as keyof AlertThresholds]
    );
    setHasChanges(changed);
  }, [thresholds, originalThresholds]);

  // Load thresholds on mount
  useEffect(() => {
    fetchThresholds();
  }, []);

  // Get status badge for threshold value
  const getThresholdStatus = (value: number, type: 'cpu' | 'ram' | 'disk') => {
    if (value < 50) return { variant: 'outline' as const, text: 'Low', color: 'text-green-600' };
    if (value < 80) return { variant: 'secondary' as const, text: 'Moderate', color: 'text-yellow-600' };
    if (value < 95) return { variant: 'destructive' as const, text: 'High', color: 'text-white' };
    return { variant: 'destructive' as const, text: 'High', color: 'text-white' };
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading alert thresholds...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full space-y-4 sm:space-y-0">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Alert Threshold Management</span>
            </CardTitle>
            <CardDescription className="mt-1">
              Configure alert thresholds for CPU, RAM, and Disk usage monitoring
            </CardDescription>
          </div>
          <div className="flex space-x-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchThresholds}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 w-full">
        {/* Message Display */}
        {message && (
          <div className="w-full">
            <Alert className={`!grid-cols-1 !gap-0 w-full max-w-none ${message.type === 'error' ? 'border-red-200 bg-red-50' : 
                             message.type === 'success' ? 'border-green-200 bg-green-50' : 
                             'border-blue-200 bg-blue-50'}`}>
              <div className="flex items-start space-x-2 w-full">
                {message.type === 'error' && <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />}
                {message.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />}
                {message.type === 'info' && <AlertTriangle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />}
                <div className={`flex-1 min-w-0 text-left text-sm ${message.type === 'error' ? 'text-red-800' : 
                               message.type === 'success' ? 'text-green-800' : 
                               'text-blue-800'}`}>
                  {message.text}
                </div>
              </div>
            </Alert>
          </div>
        )}

        {/* Threshold Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CPU Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="cpu-threshold" className="text-sm font-medium">
                CPU Usage Threshold
              </Label>
              <Badge 
                variant={getThresholdStatus(thresholds.cpu, 'cpu').variant}
                className={getThresholdStatus(thresholds.cpu, 'cpu').color}
              >
                {getThresholdStatus(thresholds.cpu, 'cpu').text}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                id="cpu-threshold"
                type="number"
                min="1"
                max="100"
                value={thresholds.cpu}
                onChange={(e) => handleThresholdChange('cpu', e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Alert when CPU usage exceeds this percentage
            </p>
          </div>

          {/* RAM Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="ram-threshold" className="text-sm font-medium">
                RAM Usage Threshold
              </Label>
              <Badge 
                variant={getThresholdStatus(thresholds.ram, 'ram').variant}
                className={getThresholdStatus(thresholds.ram, 'ram').color}
              >
                {getThresholdStatus(thresholds.ram, 'ram').text}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                id="ram-threshold"
                type="number"
                min="1"
                max="100"
                value={thresholds.ram}
                onChange={(e) => handleThresholdChange('ram', e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Alert when RAM usage exceeds this percentage
            </p>
          </div>

          {/* Disk Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="disk-threshold" className="text-sm font-medium">
                Disk Usage Threshold
              </Label>
              <Badge 
                variant={getThresholdStatus(thresholds.disk, 'disk').variant}
                className={getThresholdStatus(thresholds.disk, 'disk').color}
              >
                {getThresholdStatus(thresholds.disk, 'disk').text}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                id="disk-threshold"
                type="number"
                min="1"
                max="100"
                value={thresholds.disk}
                onChange={(e) => handleThresholdChange('disk', e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Alert when Disk usage exceeds this percentage
            </p>
          </div>

          {/* Timeout Setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="timeout" className="text-sm font-medium">
                Alert Cooldown Timeout
              </Label>
              <Badge variant="outline" className="text-blue-600">
                {thresholds.timeout}s
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                id="timeout"
                type="number"
                min="5"
                max="300"
                value={thresholds.timeout}
                onChange={(e) => handleThresholdChange('timeout', e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum time between alerts of the same type
            </p>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full">
          <div className="text-sm text-muted-foreground flex-1 min-w-0">
            {hasChanges ? (
              <span className="text-orange-600 font-medium">You have unsaved changes</span>
            ) : (
              <span className="text-green-600">All changes saved</span>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            {hasChanges && (
              <Button
                variant="outline"
                onClick={resetThresholds}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                Reset
              </Button>
            )}
            <Button
              onClick={saveThresholds}
              disabled={!hasChanges || isSaving}
              className="w-full sm:w-auto min-w-[120px]"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Information Panel */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Changes to alert thresholds take effect immediately. 
            The system uses hysteresis logic (alert at threshold, clear 10% below threshold) 
            to prevent alert spam. Consider the impact on existing alerts when making changes.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
