import type {
  Conditions,
  OrderConditions,
  RangeNumber,
  GeoCountry,
  DateCriteria,
  EvaluationContext,
} from "./types.js";

/**
 * Evaluate if a number is within a range
 */
function isInRange(value: number, range?: RangeNumber): boolean {
  if (!range) return true;

  const { min, max } = range;

  if (min !== undefined && value < min) {
    return false;
  }

  if (max !== undefined && value > max) {
    return false;
  }

  return true;
}

/**
 * Evaluate order conditions
 */
function evaluateOrderConditions(
  conditions: OrderConditions | undefined,
  context: EvaluationContext
): boolean {
  if (!conditions) return true;

  // Check order value
  if (conditions.value && !isInRange(context.orderValue, conditions.value)) {
    return false;
  }

  // Check item count
  if (conditions.items && !isInRange(context.itemCount, conditions.items)) {
    return false;
  }

  // Check weight
  if (conditions.weight) {
    const weight = context.weight ?? 0;
    if (!isInRange(weight, conditions.weight)) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluate geo country conditions
 */
function evaluateGeoCountry(
  geoCountry: GeoCountry | undefined,
  country: string
): boolean {
  if (!geoCountry) return true;

  const { include, exclude } = geoCountry;

  // If include list exists, country must be in it
  if (include && include.length > 0) {
    if (!include.includes(country)) {
      return false;
    }
  }

  // If exclude list exists, country must not be in it
  if (exclude && exclude.length > 0) {
    if (exclude.includes(country)) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluate date criteria for seasonal/holiday pricing
 * Supports full ISO 8601 timestamps with timezone
 */
function evaluateDateCriteria(
  dateCriteria: DateCriteria | undefined,
  orderDate: Date | undefined
): boolean {
  if (!dateCriteria) return true;

  // If no orderDate provided in context, date criteria cannot be evaluated
  // Default to true (allow) to maintain backward compatibility
  if (!orderDate) return true;

  const { after, before } = dateCriteria;

  // Parse orderDate as full timestamp (preserves time and timezone)
  const orderTimestamp = new Date(orderDate).getTime();

  // Check if after date (inclusive - orderTimestamp >= after)
  if (after) {
    const afterTimestamp = new Date(after).getTime();
    if (orderTimestamp < afterTimestamp) {
      return false;
    }
  }

  // Check if before date (exclusive - orderTimestamp < before)
  if (before) {
    const beforeTimestamp = new Date(before).getTime();
    if (orderTimestamp >= beforeTimestamp) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluate all conditions for a shipping method
 */
export function evaluateConditions(
  conditions: Conditions | undefined,
  context: EvaluationContext
): boolean {
  if (!conditions) return true;

  // Evaluate geo conditions
  if (conditions.geo?.country) {
    if (!evaluateGeoCountry(conditions.geo.country, context.country)) {
      return false;
    }
  }

  // Evaluate order conditions
  if (conditions.order) {
    if (!evaluateOrderConditions(conditions.order, context)) {
      return false;
    }
  }

  // Evaluate date conditions (for seasonal/holiday pricing)
  if (conditions.date) {
    if (!evaluateDateCriteria(conditions.date, context.orderDate)) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate remaining value/items to meet minimum requirement
 */
export function calculateRemaining(
  condition: "order.value.min" | "order.items.min" | "order.weight.min",
  conditions: Conditions | undefined,
  context: EvaluationContext
): number {
  if (!conditions) return 0;

  switch (condition) {
    case "order.value.min": {
      const min = conditions.order?.value?.min;
      if (min === undefined) return 0;
      return Math.max(0, min - context.orderValue);
    }

    case "order.items.min": {
      const min = conditions.order?.items?.min;
      if (min === undefined) return 0;
      return Math.max(0, min - context.itemCount);
    }

    case "order.weight.min": {
      const min = conditions.order?.weight?.min;
      const weight = context.weight ?? 0;
      if (min === undefined) return 0;
      return Math.max(0, min - weight);
    }

    default:
      return 0;
  }
}

/**
 * Get the minimum value required for a condition
 */
export function getMinimumRequired(
  condition: "order.value.min" | "order.items.min" | "order.weight.min",
  conditions: Conditions | undefined
): number | undefined {
  if (!conditions) return undefined;

  switch (condition) {
    case "order.value.min":
      return conditions.order?.value?.min;

    case "order.items.min":
      return conditions.order?.items?.min;

    case "order.weight.min":
      return conditions.order?.weight?.min;

    default:
      return undefined;
  }
}
