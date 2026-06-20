// View-model layer: turns the dataset + engine into ready-to-render numbers for
// the screens. Everything here is computed from the meter — nothing hardcoded.

import type { Dataset } from "./data";
import {
  addDays,
  bestAndWorstWindow,
  classifyDay,
  evPattern,
  evWaste,
  recordsBetween,
  recordsForDate,
  round,
  surplusSummary,
  type HourBand,
} from "./engine";
import { DEMO_TODAY } from "./demo";
import { eur, signedEur } from "./format";
import {
  getDashboardInsightCards,
  getTimeseriesSummary,
} from "./dashboardMetrics";

const STEP_H = 0.25;

export type WeekStats = {
  savedEur: number; // value of solar + battery + smart timing vs all-grid baseline
  givenKwh: number; // solar exported to the grid
  givenValueLost: number; // € lost by exporting instead of self-using
  selfSuffPct: number;
  consumptionKwh: number;
};

function weekStats(ds: Dataset, endDate: string): WeekStats {
  const start = addDays(endDate, -6);
  const window = recordsBetween(ds.records, start, endDate);
  let cons = 0;
  let imp = 0;
  let actualCost = 0;
  let priceW = 0;
  for (const r of window) {
    cons += r.total_consumption_kw * STEP_H;
    const gi = r.grid_import_kw * STEP_H;
    imp += gi;
    actualCost += gi * r.price_eur_per_kwh;
    priceW += r.price_eur_per_kwh;
  }
  const avgPrice = window.length > 0 ? priceW / window.length : 0;
  const baseline = cons * avgPrice; // if every kWh were bought from the grid
  const surplus = surplusSummary(window);
  return {
    savedEur: round(baseline - actualCost, 2),
    givenKwh: surplus.exportedKwh,
    givenValueLost: surplus.valueIfSelfUsed,
    selfSuffPct: cons > 0 ? Math.round(((cons - imp) / cons) * 100) : 0,
    consumptionKwh: round(cons, 1),
  };
}

export type Metric = {
  id: "report-savings" | "report-export" | "report-selfsuf";
  label: string;
  value: string;
  // The arrow shows the DIRECTION the metric moved; the color (changeGood)
  // encodes whether that move is good or bad — direction and meaning are separate.
  changeText: string;
  changeUp: boolean;
  changeGood: boolean;
};

export type HomeView = {
  thisWeek: WeekStats;
  lastWeek: WeekStats;
  metrics: Metric[];
};

export function buildHome(ds: Dataset): HomeView {
  const thisWeek = weekStats(ds, DEMO_TODAY);
  const lastWeek = weekStats(ds, addDays(DEMO_TODAY, -7));

  const savedDelta = thisWeek.savedEur - lastWeek.savedEur;
  const givenDelta = thisWeek.givenKwh - lastWeek.givenKwh;
  const selfDelta = thisWeek.selfSuffPct - lastWeek.selfSuffPct;

  const metrics: Metric[] = [
    {
      id: "report-savings",
      label: "Money saved",
      value: eur(thisWeek.savedEur), // €X.XX
      changeText: `${signedEur(savedDelta)} vs last week`,
      changeUp: savedDelta >= 0,
      changeGood: savedDelta >= 0, // saving more is good
    },
    {
      id: "report-export",
      label: "Energy sent to grid",
      value: `${thisWeek.givenKwh.toFixed(1)} kWh`, // kWh 1 decimal
      changeText: `${Math.abs(givenDelta).toFixed(1)} kWh ${
        givenDelta >= 0 ? "more" : "less"
      }`,
      changeUp: givenDelta >= 0,
      changeGood: givenDelta <= 0, // giving away MORE free solar is bad
    },
    {
      id: "report-selfsuf",
      label: "Self-sufficiency",
      value: `${thisWeek.selfSuffPct}%`, // % integer
      changeText: `${selfDelta >= 0 ? "up" : "down"} ${Math.abs(
        selfDelta,
      )} pts vs last week`,
      changeUp: selfDelta >= 0,
      changeGood: selfDelta >= 0, // more self-sufficient is good
    },
  ];

  return { thisWeek, lastWeek, metrics };
}

// ---- Insights ----

export type ReportView = {
  id: Metric["id"];
  title: string;
  big: string;
  changeText: string;
  changeGood: boolean;
  chartKind: "bill" | "export" | "selfsuf";
  note: string;
};

export type InsightsView = {
  band: HourBand[];
  best: { start: number; end: number } | null;
  worst: { start: number; end: number } | null;
  reports: ReportView[];
  trend: { month: string; bill: number; export: number; selfsuf: number }[];
  ev: ReturnType<typeof evPattern>;
  evShift: ReturnType<typeof evWaste>;
  surplusYear: ReturnType<typeof surplusSummary>;
};

export function buildInsights(ds: Dataset, bandDate = DEMO_TODAY): InsightsView {
  const band = classifyDay(recordsForDate(ds.records, bandDate));
  const { best, worst } = bestAndWorstWindow(band);

  const ev = evPattern(ds.records);
  const evShift = evWaste(ds.records);
  const surplusYear = surplusSummary(ds.records);
  const dashboardCards = getDashboardInsightCards({
    monthlyBills: ds.bills,
    contract: ds.tariff,
    timeseriesSummary: getTimeseriesSummary(ds.records),
  });

  const trend = ds.bills.map((b) => ({
    month: b.month.slice(5), // "MM"
    bill: round(b.total_bill_eur, 0),
    export: round(b.grid_export_kwh, 0),
    selfsuf: round(b.self_sufficiency_pct, 0),
  }));

  const reports: ReportView[] = [
    {
      id: "report-savings",
      title: dashboardCards.billOpportunity.title,
      big: dashboardCards.billOpportunity.big,
      changeText: dashboardCards.billOpportunity.changeText,
      changeGood: true,
      chartKind: "bill",
      note: dashboardCards.billOpportunity.note,
    },
    {
      id: "report-export",
      title: dashboardCards.export.title,
      big: dashboardCards.export.big,
      changeText: dashboardCards.export.changeText,
      changeGood: false,
      chartKind: "export",
      note: dashboardCards.export.note,
    },
    {
      id: "report-selfsuf",
      title: dashboardCards.selfSufficiency.title,
      big: dashboardCards.selfSufficiency.big,
      changeText: dashboardCards.selfSufficiency.changeText,
      changeGood:
        (dashboardCards.selfSufficiency.latestPct ?? 0) >=
        (dashboardCards.selfSufficiency.previousPct ?? 0),
      chartKind: "selfsuf",
      note: dashboardCards.selfSufficiency.note,
    },
  ];

  return { band, best, worst, reports, trend, ev, evShift, surplusYear };
}

// ---- Routines payoff numbers ----

export type RoutinesView = {
  monthBill: number;
  prevMonthBill: number;
  simulatedBill: number; // bill if all 3 routines followed
  stackSaveEur: number;
};

export function buildRoutines(ds: Dataset, totalRoutineSave: number): RoutinesView {
  const lastBill = ds.bills[ds.bills.length - 1];
  const prevBill = ds.bills[ds.bills.length - 2];
  return {
    monthBill: round(lastBill.total_bill_eur, 2),
    prevMonthBill: round(prevBill.total_bill_eur, 2),
    simulatedBill: round(Math.max(0, lastBill.total_bill_eur - totalRoutineSave), 2),
    stackSaveEur: totalRoutineSave,
  };
}
