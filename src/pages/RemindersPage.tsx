/**
 * RemindersPage — MFP-style notification/reminder settings
 */
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft, Bell, BellOff } from "lucide-react";
import { hapticLight } from "@/lib/haptics";

const REMINDER_GROUPS = [
  {
    title: "Logging Reminders",
    items: [
      { label: "Breakfast reminder", defaultTime: "8:00 AM" },
      { label: "Lunch reminder", defaultTime: "12:00 PM" },
      { label: "Dinner reminder", defaultTime: "6:00 PM" },
    ],
  },
  {
    title: "Activity Reminders",
    items: [
      { label: "Exercise reminder", defaultTime: "7:00 AM" },
      { label: "Daily step goal", defaultTime: null },
    ],
  },
  {
    title: "Other",
    items: [
      { label: "Weight check-in", defaultTime: "9:00 AM" },
      { label: "Hydration reminders", defaultTime: null },
      { label: "Weekly digest", defaultTime: null },
    ],
  },
];

export function RemindersPage() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [notifEnabled, setNotifEnabled] = useState(true);

  const toggle = (label: string) => {
    hapticLight();
    setEnabled(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => { hapticLight(); navigate(-1); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Reminders</h1>
        <div className="w-9" />
      </div>

      {/* Global toggle */}
      <div className="mx-4 mb-4 rounded-xl px-4 py-4 flex items-center justify-between" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          {notifEnabled ? <Bell className="w-5 h-5" style={{ color: "#52B788" }} /> : <BellOff className="w-5 h-5" style={{ color: "rgba(255,255,255,0.4)" }} />}
          <div>
            <p className="text-sm font-semibold">Push Notifications</p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {notifEnabled ? "Enabled" : "Disabled — tap to enable"}
            </p>
          </div>
        </div>
        <button
          onClick={() => { hapticLight(); setNotifEnabled(v => !v); }}
          className="w-12 h-7 rounded-full transition-all relative"
          style={{ background: notifEnabled ? "#52B788" : "rgba(255,255,255,0.1)" }}
        >
          <div
            className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
            style={{ left: notifEnabled ? "calc(100% - 24px)" : "4px" }}
          />
        </button>
      </div>

      {/* Reminder groups */}
      {REMINDER_GROUPS.map((group) => (
        <div key={group.title} className="mb-4">
          <div className="px-4 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              {group.title}
            </h3>
          </div>
          <div className="mx-4 rounded-xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            {group.items.map((item, i) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-4 py-4"
                style={{ borderBottom: i < group.items.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.defaultTime && enabled[item.label] && (
                    <p className="text-xs mt-0.5" style={{ color: "#52B788" }}>{item.defaultTime}</p>
                  )}
                </div>
                <button
                  onClick={() => toggle(item.label)}
                  disabled={!notifEnabled}
                  className="w-12 h-7 rounded-full transition-all relative disabled:opacity-40"
                  style={{ background: enabled[item.label] && notifEnabled ? "#52B788" : "rgba(255,255,255,0.1)" }}
                >
                  <div
                    className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                    style={{ left: enabled[item.label] ? "calc(100% - 24px)" : "4px" }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
