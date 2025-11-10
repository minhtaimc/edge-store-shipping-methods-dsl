/**
 * Backend API - For order validation
 * Tree-shakeable module for server-side shipping method validation
 */

import type {
  ShippingConfig,
  EvaluationContext,
  ValidatedShippingMethod,
} from "./types.js";
import { evaluateConditions } from "./conditions.js";
import { calculatePrice } from "./pricing.js";
import { resolveLocalizedString } from "./utils.js";

// Internal helpers
function evaluateTieredRule(rule: any, context: EvaluationContext): boolean {
  if (rule.criteria.order) {
    const { value, items, weight } = rule.criteria.order;
    if (value?.min !== undefined && context.orderValue < value.min) return false;
    if (value?.max !== undefined && context.orderValue > value.max) return false;
    if (items?.min !== undefined && context.itemCount < items.min) return false;
    if (items?.max !== undefined && context.itemCount > items.max) return false;
    if (weight?.min !== undefined && (context.weight ?? 0) < weight.min) return false;
    if (weight?.max !== undefined && (context.weight ?? 0) > weight.max) return false;
  }
  return true;
}

/**
 * Validate a shipping method selection from frontend
 * Returns pricing and availability information for backend checkout
 *
 * @param config - Validated shipping configuration
 * @param id - Shipping method ID from frontend (e.g., "shipping.us.standard:tier_free")
 * @param context - Current order context
 * @returns Validated shipping method or undefined if not found/invalid
 *
 * @example
 * ```typescript
 * // Frontend sends: { shippingMethodId: "shipping.us.standard:tier_free" }
 *
 * const method = getShippingMethodById(config, shippingMethodId, {
 *   orderValue: cart.total,
 *   itemCount: cart.items.length,
 *   country: user.country,
 * });
 *
 * if (!method || !method.available) {
 *   throw new Error("Invalid shipping method");
 * }
 *
 * // Use validated price for checkout
 * const total = cart.total + method.price;
 * ```
 */
export function getShippingMethodById(
  config: ShippingConfig,
  id: string,
  context: EvaluationContext
): ValidatedShippingMethod | undefined {
  const locale = context.locale;

  // Parse ID - check if it's a tiered ID
  const parts = id.split(":");
  const methodId = parts[0];
  const tierId = parts.length > 1 ? parts[1] : undefined;

  // Find the method
  const method = config.methods.find((m) => m.id === methodId);
  if (!method) {
    return undefined;
  }

  // For tiered pricing with tier ID
  if (tierId && method.pricing.type === "tiered") {
    const tier = method.pricing.rules.find((r) => r.id === tierId);
    if (!tier) {
      return undefined;
    }

    // Check base conditions first
    const baseConditionsMet = evaluateConditions(method.conditions, context);

    // Check if this tier is valid for the current context
    const tierValid = evaluateTieredRule(tier, context);

    const available = method.enabled && baseConditionsMet && tierValid;

    return {
      id,
      methodId: method.id,
      tierId: tier.id,
      name: resolveLocalizedString(method.name, locale) ?? "",
      description: resolveLocalizedString(method.description, locale),
      price: tier.price,
      available,
      enabled: method.enabled,
      estimatedDays: tier.estimatedDays,
      meta: method.meta,
    };
  }

  // For non-tiered pricing
  const conditionsMet = evaluateConditions(method.conditions, context);
  const available = method.enabled && conditionsMet;

  if (!available) {
    return {
      id: method.id,
      methodId: method.id,
      name: resolveLocalizedString(method.name, locale) ?? "",
      description: resolveLocalizedString(method.description, locale),
      price: 0,
      available: false,
      enabled: method.enabled,
      meta: method.meta,
    };
  }

  const price = calculatePrice(method.pricing, context);

  return {
    id: method.id,
    methodId: method.id,
    name: resolveLocalizedString(method.name, locale) ?? "",
    description: resolveLocalizedString(method.description, locale),
    price,
    available: true,
    enabled: method.enabled,
    estimatedDays: method.estimatedDays,
    meta: method.meta,
  };
}
