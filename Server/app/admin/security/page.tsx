"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Shield, Key, FileCheck, RefreshCw, AlertTriangle, CheckCircle, XCircle, Calendar, Server, Eye, EyeOff, Copy } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface SecurityStatus {
  certificate: {
    exists: boolean;
    expiryDate?: string;
    daysUntilExpiry?: number;
    subject?: string;
    keyPath?: string;
    certPath?: string;
    status: 'healthy' | 'warning' | 'expired' | 'error' | 'disabled';
    error?: string;
  };
  websocketToken: {
    configured: boolean;
    length: number;
    token: string | null;
    status: 'configured' | 'missing';
  };
  nextAuthSecret: {
    configured: boolean;
    length: number;
    secret: string | null;
    status: 'configured' | 'missing';
  };
  system: {
    httpsEnabled: boolean;
    nodeEnv: string;
    hostname: string;
    port: number | string;
    websocketUri?: string;
  };
}

export default function AdminSecurityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewalHostname, setRenewalHostname] = useState('');
  const [operationInProgress, setOperationInProgress] = useState(false);
  const [rotatingToken, setRotatingToken] = useState<string | null>(null);
  const [showWebSocketToken, setShowWebSocketToken] = useState(false);
  const [showNextAuthSecret, setShowNextAuthSecret] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role !== 'admin') router.push("/dashboard");
  }, [status, session, router]);

  useEffect(() => {
    fetchSecurityStatus();
  }, []);

  const fetchSecurityStatus = async () => {
    try {
      const response = await fetch('/api/admin/security/status');
      if (response.ok) {
        const data = await response.json();
        setSecurityStatus(data);
        setRenewalHostname(data.system.hostname || 'localhost');
      } else {
        showToast({ type: 'error', message: 'Failed to fetch security status' });
      }
    } catch (error) {
      console.error('Error fetching security status:', error);
      showToast({ type: 'error', message: 'Error fetching security status' });
    } finally {
      setLoading(false);
    }
  };

  const rotateTokens = async (tokenType: 'websocket' | 'nextauth' | 'both') => {
    setRotatingToken(tokenType);
    try {
      const response = await fetch('/api/admin/security/rotate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenType })
      });

      const data = await response.json();
      
      if (response.ok) {
        showToast({ 
          type: 'success', 
          message: `${tokenType} token(s) rotated successfully. Restart server to apply.` 
        });
        
        // Note: Don't refresh status here since new tokens won't be loaded until server restart
      } else {
        showToast({ type: 'error', message: data.error || 'Failed to rotate tokens' });
      }
    } catch (error) {
      console.error('Error rotating tokens:', error);
      showToast({ type: 'error', message: 'Error rotating tokens' });
    } finally {
      setRotatingToken(null);
    }
  };

  const renewCertificate = async () => {
    if (!renewalHostname.trim()) {
      showToast({ type: 'error', message: 'Hostname is required for certificate renewal' });
      return;
    }

    setOperationInProgress(true);
    try {
      const response = await fetch('/api/admin/security/renew-cert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: renewalHostname })
      });

      const data = await response.json();
      
      if (response.ok) {
        showToast({ type: 'success', message: 'SSL certificate renewed successfully' });
        
        const message = `Certificate renewed successfully!\n\n` +
                       `Subject: ${data.certificate.subject}\n` +
                       `Expires: ${new Date(data.certificate.expiryDate).toLocaleDateString()}\n` +
                       `Valid for: ${data.certificate.daysValid} days\n\n` +
                       `⚠️ Server restart required for new certificate to take effect`;
        
        alert(message);
        
        // Refresh status
        await fetchSecurityStatus();
      } else {
        showToast({ type: 'error', message: data.error || 'Failed to renew certificate' });
      }
    } catch (error) {
      console.error('Error renewing certificate:', error);
      showToast({ type: 'error', message: 'Error renewing certificate' });
    } finally {
      setOperationInProgress(false);
    }
  };

  const copyToClipboard = async (text: string, tokenType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast({ type: 'success', message: `${tokenType} copied to clipboard` });
    } catch (error) {
      showToast({ type: 'error', message: `Failed to copy ${tokenType}` });
    }
  };

  const TokenDisplay = ({ 
    label, 
    token, 
    isVisible, 
    onToggleVisibility, 
    configured 
  }: { 
    label: string; 
    token: string | null; 
    isVisible: boolean; 
    onToggleVisibility: () => void; 
    configured: boolean; 
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}:</Label>
        <div className="flex items-center space-x-2">
          {configured && token && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleVisibility}
                className="h-8 w-8 p-0"
              >
                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(token, label)}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="bg-gray-50 p-3 rounded-md border">
        {configured && token ? (
          <code className="text-sm font-mono break-all">
            {isVisible ? token : '•'.repeat(Math.min(token.length, 64))}
          </code>
        ) : (
          <span className="text-sm text-gray-500 italic">Not configured</span>
        )}
      </div>
    </div>
  );

  const getCertificateStatusBadge = (status: string, daysUntilExpiry?: number) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="outline" className="text-green-600 border-green-600">✅ Valid ({daysUntilExpiry} days)</Badge>;
      case 'warning':
        return <Badge variant="destructive">⚠️ Expires Soon ({daysUntilExpiry} days)</Badge>;
      case 'expired':
        return <Badge variant="destructive">❌ Expired</Badge>;
      case 'disabled':
        return <Badge variant="secondary">🔓 HTTPS Disabled</Badge>;
      case 'error':
        return <Badge variant="destructive">❌ Error</Badge>;
      default:
        return <Badge variant="secondary">❓ Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!securityStatus) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load security status. Please try again.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Security Management</h1>
        </div>

        {/* System Security Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>System Security Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium">Environment</Label>
                <div className="text-lg">{securityStatus.system.nodeEnv}</div>
              </div>
              <div>
                <Label className="text-sm font-medium">HTTPS</Label>
                <div className="text-lg">
                  {securityStatus.system.httpsEnabled ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">✅ Enabled</Badge>
                  ) : (
                    <Badge variant="destructive">❌ Disabled</Badge>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Hostname</Label>
                <div className="text-lg">{securityStatus.system.hostname}</div>
              </div>
              <div>
                <Label className="text-sm font-medium">Port</Label>
                <div className="text-lg">{securityStatus.system.port}</div>
              </div>
            </div>
            
            {securityStatus.system.websocketUri && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">WebSocket URI for Monitoring Scripts:</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(securityStatus.system.websocketUri!, 'WebSocket URI')}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md border">
                    <code className="text-sm font-mono break-all">{securityStatus.system.websocketUri}</code>
                  </div>
                  <div className="text-sm text-gray-600">
                    Use this URI in your MonitoringScript/config.json files
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* SSL Certificate Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileCheck className="h-5 w-5" />
              <span>SSL Certificate</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label className="text-sm font-medium">Status:</Label>
                  {getCertificateStatusBadge(securityStatus.certificate.status, securityStatus.certificate.daysUntilExpiry)}
                </div>
                
                {securityStatus.certificate.exists && (
                  <>
                    <div className="text-sm text-gray-600">
                      <strong>Subject:</strong> {securityStatus.certificate.subject}
                    </div>
                    {securityStatus.certificate.expiryDate && (
                      <div className="text-sm text-gray-600">
                        <strong>Expires:</strong> {new Date(securityStatus.certificate.expiryDate).toLocaleDateString()}
                      </div>
                    )}
                  </>
                )}
                
                {securityStatus.certificate.error && (
                  <div className="text-sm text-red-600">
                    <strong>Error:</strong> {securityStatus.certificate.error}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label htmlFor="hostname">Hostname for Certificate Renewal</Label>
              <div className="flex space-x-2">
                <Input
                  id="hostname"
                  value={renewalHostname}
                  onChange={(e) => setRenewalHostname(e.target.value)}
                  placeholder="localhost, your-server.com, 192.168.1.100"
                  className="flex-1"
                />
                <Button 
                  onClick={renewCertificate}
                  disabled={operationInProgress || !renewalHostname.trim()}
                  className="flex items-center space-x-2"
                >
                  <FileCheck className="h-4 w-4" />
                  <span>Renew Certificate</span>
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                Enter the hostname or IP address that clients will use to connect to this server.
              </div>
            </div>

            {(securityStatus.certificate.status === 'warning' || securityStatus.certificate.status === 'expired') && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {securityStatus.certificate.status === 'expired' 
                    ? 'Certificate has expired! WebSocket connections will fail. Renew immediately.'
                    : `Certificate expires in ${securityStatus.certificate.daysUntilExpiry} days. Consider renewing soon.`
                  }
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Token Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Token Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* WebSocket Token Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <h3 className="text-lg font-semibold">WebSocket Authentication Token</h3>
                {securityStatus.websocketToken.configured ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">✅ Configured</Badge>
                ) : (
                  <Badge variant="destructive">❌ Missing</Badge>
                )}
              </div>
              
              <TokenDisplay
                label="WebSocket Bearer Token"
                token={securityStatus.websocketToken.token}
                isVisible={showWebSocketToken}
                onToggleVisibility={() => setShowWebSocketToken(!showWebSocketToken)}
                configured={securityStatus.websocketToken.configured}
              />
              
              {securityStatus.websocketToken.configured && (
                <div className="text-sm text-gray-600 mt-2">
                  <strong>Token Length:</strong> {securityStatus.websocketToken.length} characters
                </div>
              )}
            </div>

            <Separator />

            {/* NextAuth Secret Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <h3 className="text-lg font-semibold">NextAuth Secret</h3>
                {securityStatus.nextAuthSecret.configured ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">✅ Configured</Badge>
                ) : (
                  <Badge variant="destructive">❌ Missing</Badge>
                )}
              </div>
              
              <TokenDisplay
                label="NextAuth Secret"
                token={securityStatus.nextAuthSecret.secret}
                isVisible={showNextAuthSecret}
                onToggleVisibility={() => setShowNextAuthSecret(!showNextAuthSecret)}
                configured={securityStatus.nextAuthSecret.configured}
              />
              
              {securityStatus.nextAuthSecret.configured && (
                <div className="text-sm text-gray-600 mt-2">
                  <strong>Secret Length:</strong> {securityStatus.nextAuthSecret.length} characters
                </div>
              )}
            </div>

            <Separator />

            {/* Token Rotation Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Token Rotation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button 
                  onClick={() => rotateTokens('websocket')}
                  disabled={!!rotatingToken}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  {rotatingToken === 'websocket' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4" />
                  )}
                  <span>Rotate WebSocket Token</span>
                </Button>
                <Button 
                  onClick={() => rotateTokens('nextauth')}
                  disabled={!!rotatingToken}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  {rotatingToken === 'nextauth' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span>Rotate NextAuth Secret</span>
                </Button>
                <Button 
                  onClick={() => rotateTokens('both')}
                  disabled={!!rotatingToken}
                  className="flex items-center space-x-2"
                >
                  {rotatingToken === 'both' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span>Rotate Both Tokens</span>
                </Button>
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> After token rotation, you must:
                  <ul className="list-disc ml-4 mt-2">
                    <li>Update <code>config.json</code> on all monitoring script machines</li>
                    <li>Restart the OverSight server (tokens won't update in UI until restart)</li>
                    <li>Restart all monitoring scripts</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>



        {/* Manual Commands Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Commands Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm font-mono bg-gray-50 p-4 rounded">
              <div><strong>Check certificate expiry:</strong> make check-expiry</div>
              <div><strong>Generate new tokens:</strong> make generate-all-tokens</div>
              <div><strong>Renew SSL certificates:</strong> make setup-ssl</div>
              <div><strong>Restart server:</strong> make start</div>
              <div><strong>Restart monitoring:</strong> make run-monitor</div>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
