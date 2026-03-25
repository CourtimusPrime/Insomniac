import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, wsUrl } from './client';

interface ExecutionResult {
  executionId: string;
  status: 'running' | 'completed' | 'error' | 'cancelled';
  result?: unknown;
  error?: string;
}

interface WorkflowEvent {
  type: 'step:start' | 'step:complete' | 'step:error' | 'gate' | 'log';
  stepId?: string;
  data?: unknown;
}

export function useRunWorkflow() {
  return useMutation({
    mutationFn: ({
      abilityId,
      input,
    }: {
      abilityId: string;
      input?: Record<string, unknown>;
    }) =>
      apiFetch<ExecutionResult>(`/api/abilities/${abilityId}/execute`, {
        method: 'POST',
        body: JSON.stringify({ input }),
      }),
  });
}

export function usePauseWorkflow() {
  return useMutation({
    mutationFn: ({
      abilityId,
      execId,
    }: {
      abilityId: string;
      execId: string;
    }) =>
      apiFetch<{ status: string }>(
        `/api/abilities/${abilityId}/executions/${execId}/pause`,
        { method: 'POST' },
      ),
  });
}

export function useResumeWorkflow() {
  return useMutation({
    mutationFn: ({
      abilityId,
      execId,
    }: {
      abilityId: string;
      execId: string;
    }) =>
      apiFetch<{ status: string }>(
        `/api/abilities/${abilityId}/executions/${execId}/resume`,
        { method: 'POST' },
      ),
  });
}

export function useStopWorkflow() {
  return useMutation({
    mutationFn: ({
      abilityId,
      execId,
    }: {
      abilityId: string;
      execId: string;
    }) =>
      apiFetch<{ status: string }>(
        `/api/abilities/${abilityId}/executions/${execId}/cancel`,
        { method: 'POST' },
      ),
  });
}

export function useApproveGate() {
  return useMutation({
    mutationFn: ({
      abilityId,
      stepId,
      execId,
    }: {
      abilityId: string;
      stepId: string;
      execId: string;
    }) =>
      apiFetch<{ status: string }>(
        `/api/abilities/${abilityId}/gates/${stepId}/approve?execId=${execId}`,
        { method: 'POST' },
      ),
  });
}

export function useRejectGate() {
  return useMutation({
    mutationFn: ({
      abilityId,
      stepId,
      execId,
    }: {
      abilityId: string;
      stepId: string;
      execId: string;
    }) =>
      apiFetch<{ status: string }>(
        `/api/abilities/${abilityId}/gates/${stepId}/reject?execId=${execId}`,
        { method: 'POST' },
      ),
  });
}

/**
 * Subscribe to real-time workflow execution events via WebSocket.
 */
export function useWorkflowExecution(executionId: string | null) {
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [status, setStatus] = useState<string>('idle');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!executionId) return;

    const ws = new WebSocket(wsUrl('/ws'));
    wsRef.current = ws;

    ws.onopen = () => {
      // Subscribe to this execution's events
      ws.send(
        JSON.stringify({
          type: 'subscribe',
          channel: `workflow:${executionId}`,
        }),
      );
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WorkflowEvent;
        setEvents((prev) => [...prev, data]);

        if (data.type === 'step:complete' || data.type === 'step:error') {
          // Could update node status here
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [executionId]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { events, status, clearEvents };
}
