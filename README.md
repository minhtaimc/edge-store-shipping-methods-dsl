# @edge-store/shipping-methods-dsl

[![npm version](https://img.shields.io/npm/v/@edge-store/shipping-methods-dsl.svg)](https://www.npmjs.com/package/@edge-store/shipping-methods-dsl)
![npm bundle size](https://img.shields.io/bundlephobia/min/@edge-store/shipping-methods-dsl)
[![npm downloads](https://img.shields.io/npm/dm/@edge-store/shipping-methods-dsl.svg)](https://www.npmjs.com/package/@edge-store/shipping-methods-dsl)
[![license](https://img.shields.io/npm/l/@edge-store/shipping-methods-dsl.svg)](https://github.com/minhtaimc/edge-store-shipping-methods-dsl/blob/main/LICENSE)

A powerful, type-safe DSL (Domain Specific Language) for defining and evaluating shipping methods across edge workers, frontend, and admin panels.

## Features

- **Type-safe**: Full TypeScript support with comprehensive type definitions
- **Validated**: Runtime validation using ArkType 2.1
- **Flexible pricing**: Support for flat, item-based, value-based, tiered, and custom pricing
- **Conditional logic**: Geo-based and order-based conditions
- **Localization**: Built-in i18n support for all user-facing strings
- **Edge-ready**: Works seamlessly in Cloudflare Workers and other edge environments
- **Framework agnostic**: Use in React, Vue, Svelte, or vanilla JS
- **Progressive unlock**: Show disabled methods with unlock hints and progress bars
- **Zero dependencies**: Only requires ArkType for runtime validation

## Installation

```bash
npm install @edge-store/shipping-methods-dsl
```

## Quick Start

### 1. Define your shipping configuration

```json
{
  "$schema": "https://cdn.jsdelivr.net/npm/@edge-store/shipping-methods-dsl@1/schema/shipping-methods.v1.schema.json",
  "version": "1.0",
  "currency": "USD",
  "methods": [
    {
      "id": "shipping.us.standard",
      "enabled": true,
      "name": "Standard Shipping",
      "pricing": { "type": "flat", "amount": 5.99 },
      "conditions": {
        "geo": { "country": { "include": ["US"] } }
      }
    }
  ]
}
```

### 2. Validate and use in your application

```typescript
import {
  validateShippingConfig,
  getAvailableShippingMethods,
  type EvaluationContext,
} from "@edge-store/shipping-methods-dsl";

// Load and validate config
const config = validateShippingConfig(configJson);

// Create evaluation context from cart/order data
const context: EvaluationContext = {
  orderValue: 100.0,
  itemCount: 3,
  country: "US",
  locale: "en",
};

// Get available shipping methods
const methods = getAvailableShippingMethods(config, context);
console.log(methods);
```

## Pricing Types

### Flat Rate

Fixed price regardless of order details.

```json
{
  "pricing": {
    "type": "flat",
    "amount": 5.99
  }
}
```

### Item-Based

Price based on number of items: `firstItemPrice + additionalItemPrice × (count - 1)`

```json
{
  "pricing": {
    "type": "item_based",
    "firstItemPrice": 12.99,
    "additionalItemPrice": 2.5
  }
}
```

### Value-Based

Percentage of order value with optional min/max clamps.

```json
{
  "pricing": {
    "type": "value_based",
    "percentage": 15,
    "minAmount": 15,
    "maxAmount": 50
  }
}
```

### Tiered

Different pricing based on matching criteria (first match wins).

```json
{
  "pricing": {
    "type": "tiered",
    "rules": [
      {
        "id": "standard",
        "criteria": { "order": { "value": { "min": 50, "max": 99.99 } } },
        "price": 0,
        "estimatedDays": { "min": 7, "max": 10 }
      },
      {
        "id": "express",
        "criteria": { "order": { "value": { "min": 100 } } },
        "price": 0,
        "estimatedDays": { "min": 2, "max": 3 }
      }
    ]
  }
}
```

### Custom

Extensible plugin system for custom logic (e.g., weight-based).

```json
{
  "pricing": {
    "type": "custom",
    "plugin": "weight_based",
    "config": {
      "ratePerKg": 12000,
      "minCharge": 15000
    }
  }
}
```

## Conditions

### Geographic Conditions

```json
{
  "conditions": {
    "geo": {
      "country": {
        "include": ["US", "CA"],
        "exclude": ["AK", "HI"]
      }
    }
  }
}
```

### Order Conditions

```json
{
  "conditions": {
    "order": {
      "value": { "min": 50, "max": 500 },
      "items": { "min": 1, "max": 10 },
      "weight": { "min": 0, "max": 50 }
    }
  }
}
```

## Availability & Upselling

Control how methods appear when conditions aren't met:

```json
{
  "availability": {
    "mode": "show_disabled",
    "when": ["order.value.min"],
    "message": "Add ${remaining} more to unlock free shipping",
    "showProgress": true
  }
}
```

**Modes:**
- `hide` - Don't show the method
- `show_disabled` - Show as disabled with message
- `show_hint` - Show hint about how to unlock

## Localization

All user-facing strings support localization:

```json
{
  "name": {
    "en": "Free Shipping",
    "vi": "Miễn phí vận chuyển",
    "es": "Envío gratis"
  }
}
```

## API Reference

### Main Functions

#### `validateShippingConfig(data: unknown): ShippingConfig`
Validates and returns a shipping configuration. Throws if invalid.

#### `calculateAllShippingMethods(config, context): ShippingCalculationResult[]`
Calculates all shipping methods (available and unavailable).

#### `getAvailableShippingMethods(config, context): ShippingCalculationResult[]`
Returns only available shipping methods.

#### `getCheapestShippingMethod(config, context): ShippingCalculationResult | undefined`
Returns the cheapest available method.

#### `getShippingMethodsForDisplay(config, context)`
Returns methods suitable for UI display, including disabled methods with unlock hints.

### Custom Plugins

Register custom pricing logic:

```typescript
import { registerPricingPlugin } from "@edge-store/shipping-methods-dsl";

registerPricingPlugin("my_plugin", (config, context) => {
  // Your custom pricing logic
  return calculatedPrice;
});
```

## Usage Examples

### Cloudflare Edge Worker

```typescript
import {
  type ShippingConfig,
  getAvailableShippingMethods,
} from "@edge-store/shipping-methods-dsl";

export default {
  async fetch(request: Request): Promise<Response> {
    const body = await request.json();
    const methods = getAvailableShippingMethods(config, {
      orderValue: body.orderValue,
      itemCount: body.itemCount,
      country: body.country,
      locale: body.locale || "en",
    });
    return Response.json(methods);
  }
};
```

See [examples/](./examples/) for more detailed examples including:
- Full Cloudflare Worker implementation
- Minimal Worker example
- React frontend component
- Custom plugin usage

## Cloudflare Worker Compatibility

This package is **100% compatible** with Cloudflare Workers and other edge runtimes:

- ✅ Zero Node.js dependencies
- ✅ Pure JavaScript/TypeScript
- ✅ ES Modules only
- ✅ Bundle size: ~115KB
- ✅ Works on: Workers, Node.js 18+, Deno, Browsers, Bun

See [CLOUDFLARE_WORKER_COMPATIBILITY.md](./CLOUDFLARE_WORKER_COMPATIBILITY.md) for details.

## JSON Schema

Use the JSON Schema for IDE autocomplete and validation:

```json
{
  "$schema": "https://cdn.jsdelivr.net/npm/@edge-store/shipping-methods-dsl@1/schema/shipping-methods.v1.schema.json"
}
```

## Type Definitions

Full TypeScript type definitions are included:

```typescript
import type {
  ShippingConfig,
  ShippingMethod,
  Pricing,
  EvaluationContext,
  ShippingCalculationResult,
} from "@edge-store/shipping-methods-dsl";
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npm run type-check

# Watch mode
npm run dev
```

## Contributing

Contributions are welcome! Please ensure:
- All code passes type checking
- Follow existing patterns and conventions
- Add tests for new features

## License

MIT - See [LICENSE](./LICENSE)

## Version

Current version: **1.0.0**

## Links

- [npm](https://www.npmjs.com/package/@edge-store/shipping-methods-dsl)
- [GitHub](https://github.com/minhtaimc/edge-store-shipping-methods-dsl)
- [Examples](./examples/)
- [Cloudflare Worker Compatibility](./CLOUDFLARE_WORKER_COMPATIBILITY.md)

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/minhtaimc/edge-store-shipping-methods-dsl/issues).
