import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

const WS_URL = 'ws://localhost:4321/ws';

const MAX_RECONNECT_DELAY = 8000;
const INITIAL_RECONNECT_DELAY = 1000;

/**
 * Connects to the backend WebSocket and invalidates TanStack Query caches
 * when pipeline, stage, or decision events arrive.
 *
 * Reconnects automatically with exponential backoff on disconnect.
 */
export function useWebSocket(): void {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    function connect() {
      if (unmountedRef.current) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        // Reset backoff on successful connection
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data) as { event: string; data?: unknown };
          handleEvent(msg.event);
        } catch {
          // Ignore non-JSON messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose will fire after onerror — reconnect handled there
        ws.close();
      };
    }

    function handleEvent(event: string) {
      switch (event) {
        case 'pipeline:status':
          queryClient.invalidateQueries({ queryKey: ['pipelines'] });
          break;
        case 'stage:status':
          queryClient.invalidateQueries({ queryKey: ['pipelineStages'] });
          break;
        case 'decision:created':
        case 'decision:resolved':
          queryClient.invalidateQueries({ queryKey: ['decisions'] });
          break;
        case 'devserver:log':
        case 'devserver:status':
          queryClient.invalidateQueries({ queryKey: ['devServerStatus'] });
          break;
        case 'agent:status':
          queryClient.invalidateQueries({ queryKey: ['activeAgents'] });
          break;
      }
    }

    function scheduleReconnect() {
      if (unmountedRef.current) return;

      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
      reconnectTimerRef.current = setTimeout(connect, delay);
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [queryClient]);
}
