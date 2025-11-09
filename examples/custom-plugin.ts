import {
  type ShippingConfig,
  type EvaluationContext,
  registerPricingPlugin,
  calculateAllShippingMethods,
  weightBasedPlugin,
} from "../src/index.js";

// Option 1: Use built-in weight-based plugin
registerPricingPlugin("weight_based", weightBasedPlugin);

// Option 2: Create custom weight-based pricing for Vietnam
registerPricingPlugin("vn_weight_based", (config, context) => {
  const ratePerKg = config.ratePerKg as number;
  const minCharge = (config.minCharge as number) || 0;
  const weight = context.weight || 0;

  const calculated = weight * ratePerKg;
  return Math.max(calculated, minCharge);
});

// Example config using custom plugin
const config: ShippingConfig = {
  version: "1.0",
  currency: "VND",
  methods: [
    {
      id: "shipping.vn.custom.weight",
      enabled: true,
      name: {
        vi: "Cân nặng nội địa",
        en: "Domestic Weight-based",
      },
      pricing: {
        type: "custom",
        plugin: "vn_weight_based",
        config: {
          ratePerKg: 12000,
          minCharge: 15000,
        },
      },
      conditions: {
        geo: {
          country: {
            include: ["VN"],
          },
        },
      },
    },
  ],
};

// Example usage
const context: EvaluationContext = {
  orderValue: 500000,
  itemCount: 3,
  weight: 2.5, // kg
  country: "VN",
  locale: "vi",
};

const results = calculateAllShippingMethods(config, context);
console.log(results);
// Output: [{ methodId: 'shipping.vn.custom.weight', price: 30000, available: true, ... }]
