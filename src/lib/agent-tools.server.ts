import { tool } from "ai";
import { z } from "zod";

import household from "@/data/household.json";
import contract from "@/data/contract.json";
import tariffs from "@/data/tariffs.json";
import today from "@/data/today.json";
import last30 from "@/data/last30days.json";
import bills from "@/data/monthly_bills.json";
import insights from "@/data/insights.json";

// Each "tool" is modular and exposes a small slice of the household's data so the
// LLM is forced to ground its answers in real numbers, not generic knowledge.
export const agentTools = {
  get_household_profile: tool({
    description:
      "Get the customer's household profile: name, city, residents, PV size, battery, heat pump, EV charger, tariff.",
    inputSchema: z.object({}),
    execute: async () => household,
  }),

  get_contract: tool({
    description:
      "Get the customer's Enpal contract: start/end dates, minimum term, notice period, auto-renew, base fee, feed-in rate, and maintenance coverage.",
    inputSchema: z.object({}),
    execute: async () => contract,
  }),

  get_tariff: tool({
    description:
      "Get the customer's electricity tariff details (dynamic hourly or fixed flat rate), including base fee and feed-in rate.",
    inputSchema: z.object({}),
    execute: async () => {
      const t = (tariffs as Record<string, unknown>)[household.tariff_id];
      return t ?? { error: "Tariff not found" };
    },
  }),

  get_current_price: tool({
    description:
      "Get the current retail electricity price (EUR/kWh) right now, plus the next 12 hours of prices for today.",
    inputSchema: z.object({}),
    execute: async () => {
      const nowHour = new Date().getHours();
      const cur = today.hourly.find((h) => h.hour === nowHour) ?? today.hourly[0];
      return {
        current_hour: cur.hour,
        current_price_eur_per_kwh: cur.price_eur_per_kwh,
        next_12h: today.hourly.slice(nowHour, nowHour + 12).map((h) => ({
          hour: h.hour,
          price_eur_per_kwh: h.price_eur_per_kwh,
        })),
        cheapest_3h_window_today: today.cheapest_3h_window,
      };
    },
  }),

  estimate_appliance_cost: tool({
    description:
      "Estimate the cost in EUR to run an appliance of a given power (kW) for a given number of hours, starting now, using the current dynamic price.",
    inputSchema: z.object({
      power_kw: z.number().describe("Appliance power draw in kW (e.g. dishwasher ~1.5 kW)"),
      hours: z.number().describe("Run-time in hours"),
    }),
    execute: async ({ power_kw, hours }) => {
      const nowHour = new Date().getHours();
      const slice = today.hourly.slice(nowHour, nowHour + Math.ceil(hours));
      const avgPrice =
        slice.reduce((s, h) => s + h.price_eur_per_kwh, 0) / Math.max(slice.length, 1);
      const kwh = power_kw * hours;
      const cost = kwh * avgPrice;
      return {
        kwh_used: Number(kwh.toFixed(2)),
        avg_price_eur_per_kwh: Number(avgPrice.toFixed(4)),
        estimated_cost_eur: Number(cost.toFixed(2)),
        starting_hour: nowHour,
      };
    },
  }),

  find_best_charging_window: tool({
    description:
      "Find the cheapest contiguous time window today to charge an EV or run a flexible load.",
    inputSchema: z.object({
      duration_hours: z.number().min(1).max(12).default(3),
    }),
    execute: async ({ duration_hours }) => {
      const hours = today.hourly;
      let bestStart = 0;
      let bestAvg = Infinity;
      for (let i = 0; i <= hours.length - duration_hours; i++) {
        const slice = hours.slice(i, i + duration_hours);
        const avg = slice.reduce((s, h) => s + h.price_eur_per_kwh, 0) / duration_hours;
        if (avg < bestAvg) {
          bestAvg = avg;
          bestStart = i;
        }
      }
      return {
        start_hour: hours[bestStart].hour,
        end_hour: hours[bestStart + duration_hours - 1].hour + 1,
        avg_price_eur_per_kwh: Number(bestAvg.toFixed(4)),
        duration_hours,
      };
    },
  }),

  get_monthly_bills: tool({
    description:
      "Get the list of monthly bills for the household (consumption, PV, grid import/export, cost, feed-in credit, total bill, self-sufficiency).",
    inputSchema: z.object({}),
    execute: async () => bills,
  }),

  get_insights: tool({
    description:
      "Get pre-detected proactive insights: anomalies (e.g. heat pump faults), nudges (cheapest hours), and bill spikes.",
    inputSchema: z.object({}),
    execute: async () => insights,
  }),

  get_recent_consumption: tool({
    description:
      "Get a daily summary of the last 30 days of energy use (PV, consumption, grid import/export, cost, self-sufficiency).",
    inputSchema: z.object({
      last_n_days: z.number().min(1).max(30).default(7),
    }),
    execute: async ({ last_n_days }) => ({
      days: last30.days.slice(-last_n_days),
    }),
  }),
};

export const toolSourceLabels: Record<keyof typeof agentTools, string> = {
  get_household_profile: "household profile",
  get_contract: "contract",
  get_tariff: "tariff",
  get_current_price: "live prices",
  estimate_appliance_cost: "live prices",
  find_best_charging_window: "live prices",
  get_monthly_bills: "monthly bills",
  get_insights: "insights",
  get_recent_consumption: "consumption history",
};
