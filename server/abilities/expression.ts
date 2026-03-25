/**
 * Expression evaluator for workflow step inputs and conditions.
 * Resolves `$input.X`, `$steps.Y.Z` via property-path traversal (no eval).
 * Handles `{{ }}` template interpolation in strings.
 */

export interface ExpressionContext {
  input: Record<string, unknown>;
  steps: Record<string, unknown>;
}

/**
 * Resolve a single expression like `$input.repo` or `$steps.review.verdict`.
 * Returns the resolved value, or the original string if not an expression.
 */
export function resolveExpression(
  expr: unknown,
  context: ExpressionContext,
): unknown {
  if (typeof expr !== 'string') return expr;

  const trimmed = expr.trim();

  // $input.field
  if (trimmed.startsWith('$input.')) {
    const path = trimmed.slice(7); // remove "$input."
    return getByPath(context.input, path);
  }

  // $steps.stepId.field
  if (trimmed.startsWith('$steps.')) {
    const path = trimmed.slice(7); // remove "$steps."
    return getByPath(context.steps, path);
  }

  // Not an expression reference — return as-is
  return expr;
}

/**
 * Resolve all expressions in a value recursively.
 * - Strings starting with $ are resolved as expressions
 * - Objects have their values resolved
 * - Arrays have their elements resolved
 */
export function resolveDeep(
  value: unknown,
  context: ExpressionContext,
): unknown {
  if (typeof value === 'string') {
    // Check for template interpolation: {{ $steps.X.Y }}
    if (value.includes('{{')) {
      return interpolateTemplate(value, context);
    }
    return resolveExpression(value, context);
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveDeep(item, context));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolveDeep(val, context);
    }
    return result;
  }

  return value;
}

/**
 * Evaluate a condition string. Supports:
 * - `$steps.X.Y == "value"` / `!= "value"`
 * - `$steps.X.Y == true/false`
 * - `$input.X == value`
 * Returns true if condition is met, false otherwise.
 * Empty/missing condition returns true (unconditional).
 */
export function evaluateCondition(
  condition: string | undefined,
  context: ExpressionContext,
): boolean {
  if (!condition || !condition.trim()) return true;

  const trimmed = condition.trim();

  // Parse comparison: left operator right
  const eqMatch = trimmed.match(/^(.+?)\s*(==|!=)\s*(.+)$/);
  if (eqMatch) {
    const left = resolveExpression(eqMatch[1].trim(), context);
    const operator = eqMatch[2];
    const rawRight = eqMatch[3].trim();

    // Parse right-hand side
    let right: unknown;
    if (rawRight === 'true') right = true;
    else if (rawRight === 'false') right = false;
    else if (rawRight.startsWith('"') && rawRight.endsWith('"'))
      right = rawRight.slice(1, -1);
    else if (rawRight.startsWith('$'))
      right = resolveExpression(rawRight, context);
    else right = rawRight;

    // Loose equality for comparison
    if (operator === '==') return String(left) === String(right);
    if (operator === '!=') return String(left) !== String(right);
  }

  // Bare expression — truthy check
  const val = resolveExpression(trimmed, context);
  return !!val;
}

/**
 * Interpolate `{{ expression }}` templates in a string.
 */
function interpolateTemplate(
  template: string,
  context: ExpressionContext,
): string {
  return template.replace(
    /\{\{\s*(.+?)\s*\}\}/g,
    (_, expr) => {
      const resolved = resolveExpression(expr.trim(), context);
      return String(resolved ?? '');
    },
  );
}

/**
 * Get a nested value by dot-path, e.g. "review.verdict" from { review: { verdict: "approve" } }
 */
function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}
