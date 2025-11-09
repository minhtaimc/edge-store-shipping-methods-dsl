/**
 * Minimal Cloudflare Worker Example
 *
 * This is a production-ready example showing how to use the shipping DSL
 * in a Cloudflare Worker with minimal setup.
 */

import type { ShippingConfig } from "../src/types.js";
import { getAvailableShippingMethods } from "../src/engine.js";

// Simple in-memory config (in production, load from KV or D1)
const SHIPPING_CONFIG: ShippingConfig = {
  version: "1.0",
  currency: "USD",
  methods: [
    {
      id: "us.standard",
      enabled: true,
      name: "Standard Shipping",
      description: "5-7 business days",
      pricing: { type: "flat", amount: 5.99 },
      conditions: {
        geo: { country: { include: ["US"] } },
      },
    },
    {
      id: "us.free",
      enabled: true,
      name: "Free Shipping",
      description: "7-10 business days",
      pricing: { type: "flat", amount: 0 },
      conditions: {
        geo: { country: { include: ["US"] } },
        order: { value: { min: 50 } },
      },
      availability: {
        mode: "show_disabled",
        when: ["order.value.min"],
        message: "Add ${remaining} more for free shipping",
        showProgress: true,
      },
    },
    {
      id: "intl.standard",
      enabled: true,
      name: "International Shipping",
      description: "10-15 business days",
      pricing: {
        type: "value_based",
        percentage: 15,
        minAmount: 15,
        maxAmount: 50,
      },
      conditions: {
        geo: { country: { exclude: ["US"] } },
      },
    },
  ],
};

export default {
  async fetch(request: Request): Promise<Response> {
    // Handle CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      // Parse request
      const body = await request.json<{
        orderValue: number;
        itemCount: number;
        country: string;
        locale?: string;
      }>();

      // Validate input
      if (
        typeof body.orderValue !== "number" ||
        typeof body.itemCount !== "number" ||
        typeof body.country !== "string"
      ) {
        return new Response("Invalid input", { status: 400 });
      }

      // Calculate shipping
      const methods = getAvailableShippingMethods(SHIPPING_CONFIG, {
        orderValue: body.orderValue,
        itemCount: body.itemCount,
        country: body.country,
        locale: body.locale || "en",
      });

      // Return response
      return Response.json(
        {
          success: true,
          data: methods,
        },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=60",
          },
        }
      );
    } catch (error) {
      console.error("Error calculating shipping:", error);
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};

/**
 * Example request:
 *
 * POST https://your-worker.workers.dev
 * Content-Type: application/json
 *
 * {
 *   "orderValue": 75.00,
 *   "itemCount": 3,
 *   "country": "US",
 *   "locale": "en"
 * }
 *
 * Example response:
 *
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "methodId": "us.free",
 *       "price": 0,
 *       "available": true
 *     },
 *     {
 *       "methodId": "us.standard",
 *       "price": 5.99,
 *       "available": true
 *     }
 *   ]
 * }
 */
