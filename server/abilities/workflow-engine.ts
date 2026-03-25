import {
  evaluateCondition,
  resolveDeep,
  type ExpressionContext,
} from './expression.js';
import type { WorkflowStep } from './types.js';
import { executeAbility, type ExecutionContext, type ExecutionEvent } from './executor.js';

export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled';

interface GatePromise {
  resolve: (approved: boolean) => void;
  stepId: string;
}

/**
 * Executes a sequence of WorkflowSteps with expression resolution,
 * conditional evaluation, gate handling, and error recovery.
 */
export class WorkflowEngine {
  private steps: WorkflowStep[];
  private context: ExecutionContext;
  private status: WorkflowStatus = 'idle';
  private currentStepIndex = 0;
  private pendingGate: GatePromise | null = null;
  private cancelled = false;

  // Collected step results
  private stepResults: Record<string, unknown> = {};

  constructor(steps: WorkflowStep[], context: ExecutionContext) {
    this.steps = steps;
    this.context = context;
  }

  /** Run the workflow from start to finish */
  async run(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.status = 'running';
    this.stepResults = {};

    const exprContext: ExpressionContext = {
      input,
      steps: this.stepResults,
    };

    for (this.currentStepIndex = 0; this.currentStepIndex < this.steps.length; this.currentStepIndex++) {
      if (this.cancelled) {
        this.status = 'cancelled';
        break;
      }

      const step = this.steps[this.currentStepIndex];

      // Evaluate condition
      if (!evaluateCondition(step.condition, exprContext)) {
        this.emit({ type: 'log', stepId: step.id, data: 'Skipped (condition false)' });
        continue;
      }

      // Handle gate steps
      if (step.type === 'gate') {
        const approved = await this.handleGate(step, exprContext);
        if (!approved && step.on_reject?.goto) {
          // Jump to the specified step
          const targetIndex = this.steps.findIndex((s) => s.id === step.on_reject!.goto);
          if (targetIndex >= 0) {
            this.currentStepIndex = targetIndex - 1; // -1 because loop will increment
            continue;
          }
        }
        if (!approved) {
          this.emit({ type: 'log', stepId: step.id, data: 'Gate rejected' });
          continue;
        }
        continue;
      }

      // Execute the step
      try {
        this.emit({ type: 'step:start', stepId: step.id });

        const resolvedInput = step.input
          ? (resolveDeep(step.input, exprContext) as Record<string, unknown>)
          : {};

        let result: unknown;
        if (step.use) {
          // Execute a referenced ability
          result = await executeAbility(step.use, resolvedInput, this.context);
        } else {
          // No ability reference — treat as a pass-through
          result = resolvedInput;
        }

        // Store result
        if (step.output) {
          this.stepResults[step.id] = { [step.output]: result };
        } else {
          this.stepResults[step.id] = result;
        }

        this.emit({ type: 'step:complete', stepId: step.id, data: result });
      } catch (error) {
        this.emit({
          type: 'step:error',
          stepId: step.id,
          data: (error as Error).message,
        });

        const onError = step.on_error ?? this.context.input?.on_error ?? 'stop';
        if (onError === 'stop') {
          this.status = 'error';
          throw error;
        }
        // on_error: 'continue' — record error and move on
        this.stepResults[step.id] = { error: (error as Error).message };
      }
    }

    if (this.status === 'running') {
      this.status = 'completed';
    }

    return this.stepResults;
  }

  /** Pause the workflow */
  pause() {
    if (this.status === 'running') {
      this.status = 'paused';
    }
  }

  /** Resume the workflow */
  resume() {
    if (this.status === 'paused') {
      this.status = 'running';
    }
  }

  /** Cancel the workflow */
  cancel() {
    this.cancelled = true;
    this.status = 'cancelled';
    // Reject any pending gate
    if (this.pendingGate) {
      this.pendingGate.resolve(false);
      this.pendingGate = null;
    }
  }

  /** Approve a gate step */
  approveGate(stepId: string) {
    if (this.pendingGate?.stepId === stepId) {
      this.pendingGate.resolve(true);
      this.pendingGate = null;
    }
  }

  /** Reject a gate step */
  rejectGate(stepId: string) {
    if (this.pendingGate?.stepId === stepId) {
      this.pendingGate.resolve(false);
      this.pendingGate = null;
    }
  }

  getStatus(): WorkflowStatus {
    return this.status;
  }

  getStepResults(): Record<string, unknown> {
    return { ...this.stepResults };
  }

  /** Handle a gate step — broadcast event and wait for approval */
  private async handleGate(
    step: WorkflowStep,
    exprContext: ExpressionContext,
  ): Promise<boolean> {
    // If condition is false, skip the gate entirely
    if (!evaluateCondition(step.condition, exprContext)) {
      return true; // Condition not met, skip gate (proceed as if approved)
    }

    // Interpolate message
    const message = step.message
      ? String(resolveDeep(step.message, exprContext))
      : `Approval required for step: ${step.label ?? step.id}`;

    this.emit({ type: 'gate', stepId: step.id, data: { message } });

    // Wait for approval/rejection
    return new Promise<boolean>((resolve) => {
      this.pendingGate = { resolve, stepId: step.id };
    });
  }

  private emit(event: ExecutionEvent) {
    this.context.onEvent?.(event);
  }
}
