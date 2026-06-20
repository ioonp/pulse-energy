import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Clock, Coins, Zap } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import weekly from "@/data/weekly.json";
import insights from "@/data/insights.json";
import bills from "@/data/monthly_bills.json";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — Enpal Pulse" },
      { name: "description", content: "Your weekly energy retrospective." },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const w = weekly;
  const isSaved = w.week_saved_eur > 0;

  // sparkline-ish: just show daily costs
  const maxCost = Math.max(...w.days.map((d) => d.energy_cost_eur), 1);

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <p className="text-stone font-semibold text-sm uppercase tracking-wider">This week</p>
          <h1 className="text-navy mt-2">Weekly retrospective</h1>
          <p className="text-stone mt-1">A simple look at how your home performed.</p>
        </div>

        {/* Headline savings card */}
        <section className="card-soft p-7 md:p-9">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="text-stone font-semibold text-sm uppercase tracking-wider">
                Total saved this week
              </div>
              <div className={`mt-3 font-display text-5xl md:text-6xl ${isSaved ? "text-grass" : "text-navy"}`}>
                {isSaved ? "€" : "−€"}
                {Math.abs(w.week_saved_eur).toFixed(2)}
              </div>
              <p className="mt-3 text-stone max-w-md">
                {isSaved
                  ? "vs. buying the same energy at average grid prices, your solar + battery + smart shifting cut your bill."
                  : "Your home spent slightly more than the baseline this week — likely due to elevated heat pump use."}
              </p>
            </div>
            <div className={`px-4 py-3 rounded-2xl ${isSaved ? "bg-grass/15 text-grass" : "bg-cta/30 text-navy"}`}>
              {isSaved ? <ArrowDownRight className="w-7 h-7" /> : <ArrowUpRight className="w-7 h-7" />}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-4">
            <Followup
              icon={<Coins className="w-4 h-4" />}
              label="Loads shifted to cheaper hours"
              value={`${w.loads_shifted_count}`}
              sub={`saved €${w.loads_shifted_savings_eur.toFixed(2)}`}
            />
            <Followup
              icon={<Zap className="w-4 h-4" />}
              label="Energy consumed"
              value={`${w.week_consumption_kwh.toFixed(0)} kWh`}
              sub={`across 7 days`}
            />
            <Followup
              icon={<Clock className="w-4 h-4" />}
              label="Avg daily cost"
              value={`€${(w.week_actual_cost_eur / 7).toFixed(2)}`}
              sub={`baseline €${(w.week_baseline_cost_eur / 7).toFixed(2)}`}
            />
          </div>
        </section>

        {/* Daily costs sparkline */}
        <section className="card-soft p-6 md:p-7">
          <h2 className="text-navy text-2xl mb-1">Daily energy cost</h2>
          <p className="text-stone text-sm">Last 7 days</p>
          <div className="mt-5 grid grid-cols-7 gap-2 items-end h-40">
            {w.days.map((d) => (
              <div key={d.date} className="flex flex-col items-center justify-end h-full">
                <div className="text-xs font-semibold text-navy mb-1">€{d.energy_cost_eur.toFixed(1)}</div>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-navy to-dodger"
                  style={{ height: `${(d.energy_cost_eur / maxCost) * 75}%` }}
                />
                <div className="text-[10px] text-stone mt-1.5">
                  {new Date(d.date).toLocaleDateString("en-GB", { weekday: "short" })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pre-detected insights list */}
        <section>
          <h2 className="text-navy text-2xl mb-3">Recent insights</h2>
          <div className="space-y-3">
            {insights.slice(0, 3).map((i, idx) => (
              <article key={idx} className="card-soft p-5">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-display ${
                      i.severity === "high" ? "bg-destructive/10 text-destructive" : "bg-cta/30 text-navy"
                    }`}
                  >
                    {i.type === "anomaly" ? "!" : i.type === "nudge" ? "★" : "i"}
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-stone">
                      {i.type} · {i.period}
                    </div>
                    <h3 className="text-navy text-lg mt-0.5">{i.title}</h3>
                    <p className="text-stone text-sm mt-1">{i.detail}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <p className="text-xs text-stone text-center">
          Based on {bills.length} months of bills and your live energy data.
        </p>
      </div>
    </AppShell>
  );
}

function Followup({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl bg-secondary/60 p-4">
      <div className="flex items-center gap-1.5 text-stone text-xs font-semibold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 font-display text-xl text-navy">{value}</div>
      <div className="text-xs text-stone mt-0.5">{sub}</div>
    </div>
  );
}
