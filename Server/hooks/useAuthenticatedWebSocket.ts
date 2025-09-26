import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

interface WebSocketConfig {
  path: string;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

interface WebSocketState {
  ws: WebSocket | null;
  isConnected: boolean;
  connectionError: string | null;
  send: (data: any) => void;
  close: () => void;
}

export function useAuthenticatedWebSocket(config: WebSocketConfig): WebSocketState {
  const { data: session, status } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [wsToken, setWsToken] = useState<string | null>(null);

  // Fetch WebSocket token when user is authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetch('/api/ws-token')
        .then(response => response.json())
        .then(data => {
          if (data.token) {
            setWsToken(data.token);
          } else {
            setConnectionError('Failed to get WebSocket token');
          }
        })
        .catch(error => {
          console.error('Error fetching WebSocket token:', error);
          setConnectionError('Failed to fetch WebSocket token');
        });
    }
  }, [session, status]);

  // Setup WebSocket connection
  useEffect(() => {
    if (status !== 'authenticated' || !wsToken) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${config.path}`;
    
    try {
      // For browsers that don't support headers in WebSocket constructor,
      // we'll use the query parameter fallback
      const wsUrlWithToken = `${wsUrl}?token=${encodeURIComponent(wsToken)}`;
      const finalWs = new WebSocket(wsUrlWithToken);
      
      wsRef.current = finalWs;

      finalWs.onopen = () => {
        console.log('Authenticated WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        config.onOpen?.();
      };

      finalWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          config.onMessage?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          config.onMessage?.(event.data);
        }
      };

      finalWs.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);
        
        if (event.code === 1008) {
          setConnectionError('Authentication failed: Invalid token');
        } else {
          setConnectionError('Connection closed');
        }
        
        config.onClose?.();
      };

      finalWs.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('WebSocket connection error');
        config.onError?.(error);
      };

      return () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  }, [config.path, wsToken, status]);

  const send = (data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  const close = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  return {
    ws: wsRef.current,
    isConnected,
    connectionError,
    send,
    close
  };
}
