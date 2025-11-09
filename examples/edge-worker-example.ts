import {
  type ShippingConfig,
  type EvaluationContext,
  validateShippingConfig,
  getAvailableShippingMethods,
  getCheapestShippingMethod,
} from "../src/index.js";

/**
 * Example: Cloudflare Edge Worker for shipping calculation API
 */

interface Env {
  SHIPPING_CONFIG: KVNamespace;
}

interface RequestBody {
  orderValue: number;
  itemCount: number;
  weight?: number;
  country: string;
  locale?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      // Load shipping config from KV
      const configJson = await env.SHIPPING_CONFIG.get("shipping-config", "json");

      if (!configJson) {
        return new Response(JSON.stringify({ error: "Config not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Validate config
      const config = validateShippingConfig(configJson) as ShippingConfig;

      // Parse request
      const body: RequestBody = await request.json();

      // Create evaluation context
      const context: EvaluationContext = {
        orderValue: body.orderValue,
        itemCount: body.itemCount,
        weight: body.weight,
        country: body.country,
        locale: body.locale || "en",
      };

      // Calculate shipping methods
      const availableMethods = getAvailableShippingMethods(config, context);
      const cheapest = getCheapestShippingMethod(config, context);

      return new Response(
        JSON.stringify({
          available: availableMethods,
          cheapest,
          context,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
