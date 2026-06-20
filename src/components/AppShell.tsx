import { Link } from "@tanstack/react-router";
import { Home, MessageCircle, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/insights", label: "Insights", icon: Sparkles },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-navy text-white">
        <div className="mx-auto max-w-5xl px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cta flex items-center justify-center">
              <span className="text-navy font-display text-lg">E</span>
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg text-white">Enpal Pulse</div>
              <div className="text-xs text-white/60 -mt-0.5">Smart energy companion</div>
            </div>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5 transition"
                activeProps={{ className: "px-3 py-2 rounded-xl text-sm font-semibold text-navy bg-cta" }}
                activeOptions={{ exact: true }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-5 py-8 pb-28 sm:pb-12">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-border z-50">
        <div className="mx-auto max-w-5xl grid grid-cols-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-1 py-3 text-stone"
                activeProps={{ className: "flex flex-col items-center gap-1 py-3 text-navy" }}
                activeOptions={{ exact: true }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
