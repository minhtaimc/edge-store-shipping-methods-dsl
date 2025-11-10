/**
 * Frontend API - For checkout UI
 * Tree-shakeable module for client-side shipping method display
 */

import type {
  ShippingConfig,
  EvaluationContext,
  DisplayShippingMethod,
  ShippingMethod,
} from "./types.js";
import { evaluateConditions } from "./conditions.js";
import { calculatePrice } from "./pricing.js";
import { resolveLocalizedString, interpolateMessage } from "./utils.js";

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

function findNextTierWithAvailability(
  rules: any[],
  currentRule: any | undefined,
  context: EvaluationContext
): any | undefined {
  return rules.find((rule) => {
    const isBetter = currentRule ? rule.price < currentRule.price : true;
    const hasAvailability = rule.availability !== undefined;
    const notYetMet = !evaluateTieredRule(rule, context);
    return isBetter && hasAvailability && notYetMet;
  });
}

function findMatchingRule(rules: any[], context: EvaluationContext): any | undefined {
  return rules.find((rule) => evaluateTieredRule(rule, context));
}

function calculateShippingMethod(
  method: ShippingMethod,
  context: EvaluationContext
): DisplayShippingMethod {
  const locale = context.locale;

  // Check base conditions
  const conditionsMet = evaluateConditions(method.conditions, context);

  // Handle tiered pricing
  if (method.pricing.type === "tiered") {
    if (!conditionsMet) {
      return {
        id: method.id,
        methodId: method.id,
        name: resolveLocalizedString(method.name, locale) ?? "",
        description: resolveLocalizedString(method.description, locale),
        icon: method.icon,
        badge: method.display?.badge,
        price: 0,
        available: false,
        enabled: method.enabled,
        message: "Conditions not met",
        meta: method.meta,
      };
    }

    const matchingRule = findMatchingRule(method.pricing.rules, context);

    if (matchingRule) {
      const nextTier = findNextTierWithAvailability(method.pricing.rules, matchingRule, context);

      const result: DisplayShippingMethod = {
        id: `${method.id}:${matchingRule.id}`,
        methodId: method.id,
        tierId: matchingRule.id,
        name: resolveLocalizedString(method.name, locale) ?? "",
        description: resolveLocalizedString(method.description, locale),
        icon: method.icon,
        badge: method.display?.badge,
        price: matchingRule.price,
        available: true,
        enabled: method.enabled,
        estimatedDays: matchingRule.estimatedDays,
        promoText: resolveLocalizedString(matchingRule.promoText, locale),
        upgradeMessage: resolveLocalizedString(matchingRule.upgradeMessage, locale),
        meta: method.meta,
      };

      // Add upgrade hint if next better tier exists
      if (nextTier?.availability) {
        const { mode, when, message, showProgress } = nextTier.availability;
        const firstCondition = when?.[0];

        if (firstCondition) {
          let remaining = 0;
          let required = 0;

          if (firstCondition === "order.value.min") {
            required = nextTier.criteria.order?.value?.min ?? 0;
            remaining = required - context.orderValue;
          } else if (firstCondition === "order.items.min") {
            required = nextTier.criteria.order?.items?.min ?? 0;
            remaining = required - context.itemCount;
          } else if (firstCondition === "order.weight.min") {
            required = nextTier.criteria.order?.weight?.min ?? 0;
            remaining = required - (context.weight ?? 0);
          }

          if (remaining > 0) {
            result.availabilityMode = mode;
            result.upgradeMessage = interpolateMessage(
              resolveLocalizedString(message, locale),
              { remaining: remaining.toFixed(2) }
            );

            if (showProgress) {
              const current = required - remaining;
              result.progress = {
                current,
                required,
                remaining,
                percentage: required > 0 ? (current / required) * 100 : 0,
              };
            }

            result.nextTier = {
              id: nextTier.id,
              label: resolveLocalizedString(nextTier.label, locale),
              price: nextTier.price,
              estimatedDays: nextTier.estimatedDays,
            };
          }
        }
      }

      return result;
    }

    // No matching tier
    return {
      id: method.id,
      methodId: method.id,
      name: resolveLocalizedString(method.name, locale) ?? "",
      description: resolveLocalizedString(method.description, locale),
      icon: method.icon,
      badge: method.display?.badge,
      price: 0,
      available: false,
      enabled: method.enabled,
      message: "No matching tier",
      meta: method.meta,
    };
  }

  // Non-tiered pricing
  if (!conditionsMet) {
    if (method.availability) {
      const { mode, when, message, showProgress } = method.availability;
      const firstCondition = when?.[0];

      if (firstCondition && message) {
        let remaining = 0;
        let required = 0;

        if (firstCondition === "order.value.min") {
          required = method.conditions?.order?.value?.min ?? 0;
          remaining = required - context.orderValue;
        } else if (firstCondition === "order.items.min") {
          required = method.conditions?.order?.items?.min ?? 0;
          remaining = required - context.itemCount;
        } else if (firstCondition === "order.weight.min") {
          required = method.conditions?.order?.weight?.min ?? 0;
          remaining = required - (context.weight ?? 0);
        }

        if (remaining > 0) {
          return {
            id: method.id,
            methodId: method.id,
            name: resolveLocalizedString(method.name, locale) ?? "",
            description: resolveLocalizedString(method.description, locale),
            icon: method.icon,
            badge: method.display?.badge,
            price: 0,
            available: false,
            enabled: method.enabled,
            availabilityMode: mode,
            message: interpolateMessage(resolveLocalizedString(message, locale), {
              remaining: remaining.toFixed(2),
            }),
            progress: showProgress
              ? {
                  current: required - remaining,
                  required,
                  remaining,
                  percentage: required > 0 ? ((required - remaining) / required) * 100 : 0,
                }
              : undefined,
            meta: method.meta,
          };
        }
      }
    }

    // Default: hide when conditions not met
    return {
      id: method.id,
      methodId: method.id,
      name: resolveLocalizedString(method.name, locale) ?? "",
      description: resolveLocalizedString(method.description, locale),
      icon: method.icon,
      badge: method.display?.badge,
      price: 0,
      available: false,
      enabled: method.enabled,
      availabilityMode: "hide",
      message: "Conditions not met",
      meta: method.meta,
    };
  }

  // Available - calculate price
  const price = calculatePrice(method.pricing, context);
  return {
    id: method.id,
    methodId: method.id,
    name: resolveLocalizedString(method.name, locale) ?? "",
    description: resolveLocalizedString(method.description, locale),
    icon: method.icon,
    badge: method.display?.badge,
    price,
    available: true,
    enabled: method.enabled,
    estimatedDays: method.estimatedDays,
    meta: method.meta,
  };
}

/**
 * Get all shipping methods for frontend display
 * Returns complete information for rendering checkout UI
 *
 * @param config - Validated shipping configuration
 * @param context - Current order context (cart value, country, etc.)
 * @returns Array of shipping methods with display information
 *
 * @example
 * ```typescript
 * const methods = getShippingMethodsForDisplay(config, {
 *   orderValue: 75,
 *   itemCount: 2,
 *   country: "US",
 *   locale: "en"
 * });
 *
 * // Filter available methods
 * const available = methods.filter(m => m.available);
 *
 * // Get cheapest
 * const cheapest = available.sort((a, b) => a.price - b.price)[0];
 * ```
 */
export function getShippingMethodsForDisplay(
  config: ShippingConfig,
  context: EvaluationContext
): DisplayShippingMethod[] {
  return config.methods
    .map((method) => calculateShippingMethod(method, context))
    .sort((a, b) => {
      // Sort by priority first (if available)
      const methodA = config.methods.find((m) => m.id === a.methodId);
      const methodB = config.methods.find((m) => m.id === b.methodId);
      const priorityA = methodA?.display?.priority ?? 999;
      const priorityB = methodB?.display?.priority ?? 999;

      if (priorityA !== priorityB) return priorityA - priorityB;

      // Then by price
      return a.price - b.price;
    });
}
