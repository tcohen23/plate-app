/**
 * AppsDevicesPage — MFP-style Apps & Devices (HealthKit, wearables)
 */
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { hapticLight } from "@/lib/haptics";

const APPS = [
  {
    name: "Apple Health",
    icon: "🍎",
    description: "Sync steps, calories, workouts, and sleep",
    connected: false,
    items: ["Steps", "Workouts", "Active Calories", "Sleep", "Weight"],
  },
  {
    name: "Google Fit",
    icon: "💙",
    description: "Sync activity and health data from Google Fit",
    connected: false,
    items: ["Steps", "Workouts", "Active Calories"],
  },
  {
    name: "Fitbit",
    icon: "⌚",
    description: "Connect your Fitbit device to sync health data",
    connected: false,
    items: ["Steps", "Sleep", "Heart Rate"],
  },
  {
    name: "Garmin",
    icon: "🏃",
    description: "Sync activities, steps, and health data from Garmin Connect",
    connected: false,
    items: ["Steps", "Workouts", "Heart Rate"],
  },
  {
    name: "Withings",
    icon: "⚖️",
    description: "Sync weight and body composition from Withings scale",
    connected: false,
    items: ["Weight", "Body Fat %", "BMI"],
  },
];

export function AppsDevicesPage() {
  const navigate = useNavigate();
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  const handleToggle = (name: string) => {
    hapticLight();
    setConnected(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => { hapticLight(); navigate(-1); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Apps & Devices</h1>
        <div className="w-9" />
      </div>

      {/* Description */}
      <div className="px-4 mb-4">
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Connect your favorite apps and devices to automatically sync your health and fitness data with Plate.
        </p>
      </div>

      {/* App list */}
      <div className="px-4 space-y-3">
        {APPS.map((app) => (
          <div
            key={app.name}
            className="rounded-2xl p-4"
            style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                  {app.icon}
                </div>
                <div>
                  <p className="text-sm font-bold">{app.name}</p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{app.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle(app.name)}
                className="w-12 h-7 rounded-full transition-all relative flex-shrink-0 ml-3"
                style={{ background: connected[app.name] ? "#52B788" : "rgba(255,255,255,0.1)" }}
              >
                <div
                  className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: connected[app.name] ? "calc(100% - 24px)" : "4px" }}
                />
              </button>
            </div>
            {/* Synced data types */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {app.items.map((item) => (
                <span key={item} className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: "var(--muted-foreground)" }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* HealthKit note */}
      <div className="px-4 mt-4">
        <p className="text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
          Device permissions can be managed in your phone's Settings app.
        </p>
      </div>
    </div>
  );
}
