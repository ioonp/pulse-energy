import { useState } from "react";
import { Check } from "lucide-react";
import { seedRoutine, useRoutines } from "../../store/routines";

type Props = { data: any };

export function RoutineConfirmationButton({ data }: Props) {
  const d = data ?? {};
  const { addRoutine, hasRoutine } = useRoutines();
  const routineId: string = d.routine_id ?? "";
  const alreadySet = hasRoutine(routineId);
  const [confirmed, setConfirmed] = useState(false);

  function handleConfirm() {
    const seed = seedRoutine(routineId);
    if (seed) {
      addRoutine(seed);
    } else {
      // Build a custom routine from the tool result
      addRoutine({
        id: routineId || `custom-${Date.now()}`,
        title: d.action_name ?? "Custom routine",
        body: d.description ?? d.action_name ?? "",
        icon: "appliances" as const,
        load: "house_load_kw" as const,
        window: [11, 15],
        streak: ["missed", "missed", "missed", "missed", "missed", "missed", "missed"],
        saveEur: d.estimated_savings_eur ?? 0,
      });
    }
    setConfirmed(true);
  }

  const isSet = alreadySet || confirmed;

  return (
    <div className="card tool-result routine-confirm">
      <div className="action-name">{d.action_name ?? "Routine"}</div>
      {d.trigger_time && (
        <div className="trigger-time">⏰ {d.trigger_time}</div>
      )}

      <div style={{ marginTop: 12 }}>
        {isSet ? (
          <button className="btn btn-set is-set" disabled>
            <Check size={15} /> Routine set
          </button>
        ) : (
          <button className="btn btn-accent" onClick={handleConfirm}>
            Confirm & Set
          </button>
        )}
      </div>
    </div>
  );
}
