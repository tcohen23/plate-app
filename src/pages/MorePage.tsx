/**
 * MorePage — MFP-style full menu (photo_40 & photo_41)
 *
 * Full list:
 *   Try Premium for Free (👑)
 *   My Profile
 *   GLP-1 Support (Beta)
 *   Intermittent Fasting
 *   Sleep
 *   Recipe Discovery
 *   Workout Routines
 *   Goals
 *   Weight & Measurements
 *   My Weekly Report
 *   Nutrition
 *   My Meals, Recipes & Foods
 *   Reminders
 *   Apps & Devices
 *   Steps
 *   Learn
 *   Friends
 *   Messages
 *   Settings
 *   Privacy
 *   Help
 *   Sync
 */
import { useNavigate } from "react-router-dom";

import { useAccessLevel } from "@/components/RequireSubscription";
import { hapticLight } from "@/lib/haptics";
import {
  Crown, User, Pill, Clock, Moon, ChefHat, Dumbbell, Target,
  BarChart2, FileText, Utensils, Bell, Smartphone, Footprints,
  GraduationCap, UserPlus, MessageSquare, Settings, Shield,
  HelpCircle, RefreshCw, ChevronRight,
} from "lucide-react";

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  isPremiumGate?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { label: "Try Premium for Free", icon: <Crown className="w-5 h-5" style={{ color: "#E5B454" }} />, path: "/onboarding/upgrade", isPremiumGate: true },
  { label: "My Profile", icon: <User className="w-5 h-5" />, path: "/more/profile" },
  { label: "GLP-1 Support", icon: <Pill className="w-5 h-5" />, path: "/more/glp1" },
  { label: "Intermittent Fasting", icon: <Clock className="w-5 h-5" />, path: "/more/fasting" },
  { label: "Sleep", icon: <Moon className="w-5 h-5" />, path: "/more/sleep" },
  { label: "Recipe Discovery", icon: <ChefHat className="w-5 h-5" />, path: "/plan" },
  { label: "Workout Routines", icon: <Dumbbell className="w-5 h-5" />, path: "/workout" },
  { label: "Goals", icon: <Target className="w-5 h-5" />, path: "/more/goals" },
  { label: "Weight & Measurements", icon: <BarChart2 className="w-5 h-5" />, path: "/more/measurements" },
  { label: "My Weekly Report", icon: <FileText className="w-5 h-5" />, path: "/more/weekly-digest" },
  { label: "Nutrition", icon: <Utensils className="w-5 h-5" />, path: "/more/nutrition" },
  { label: "My Meals, Recipes & Foods", icon: <ChefHat className="w-5 h-5" />, path: "/track" },
  { label: "Reminders", icon: <Bell className="w-5 h-5" />, path: "/more/reminders" },
  { label: "Apps & Devices", icon: <Smartphone className="w-5 h-5" />, path: "/more/apps-devices" },
  { label: "Steps", icon: <Footprints className="w-5 h-5" />, path: "/more/measurements?tab=steps" },
  { label: "Learn", icon: <GraduationCap className="w-5 h-5" />, path: "/more/learn" },
  { label: "Friends", icon: <UserPlus className="w-5 h-5" />, path: "/more/friends" },
  { label: "Messages", icon: <MessageSquare className="w-5 h-5" />, path: "/more/messages" },
  { label: "Settings", icon: <Settings className="w-5 h-5" />, path: "/settings" },
  { label: "Privacy", icon: <Shield className="w-5 h-5" />, path: "/privacy" },
  { label: "Help", icon: <HelpCircle className="w-5 h-5" />, path: "/more/help" },
];

export function MorePage() {
  const navigate = useNavigate();
  const { isPremium } = useAccessLevel();
  // const profile = (api.profiles.getProfile);

  const handleNav = (path: string) => {
    hapticLight();
    navigate(path);
  };

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold">More</h1>
      </div>

      {/* Menu list */}
      <div className="px-4">
        {MENU_ITEMS.map((item, i) => {
          // Hide "Try Premium" if already premium
          if (item.isPremiumGate && isPremium) return null;
          return (
            <button
              key={i}
              onClick={() => handleNav(item.path)}
              className="w-full flex items-center py-4 border-b text-left transition-opacity active:opacity-60"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="w-7 flex items-center flex-shrink-0" style={{ color: "rgba(255,255,255,0.6)" }}>
                {item.icon}
              </div>
              <span className="flex-1 ml-3 text-sm font-medium">{item.label}</span>
              {item.badge && (
                <span className="text-xs px-2 py-0.5 rounded font-semibold mr-2" style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}>
                  {item.badge}
                </span>
              )}
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
            </button>
          );
        })}
      </div>

      {/* Sync row */}
      <div className="px-4 mt-1">
        <button className="w-full flex items-center py-4 text-left" onClick={() => { hapticLight(); window.location.reload(); }}>
          <div className="w-7 flex items-center flex-shrink-0" style={{ color: "rgba(255,255,255,0.6)" }}>
            <RefreshCw className="w-5 h-5" />
          </div>
          <span className="flex-1 ml-3 text-sm font-medium">Sync</span>
          <span className="text-xs text-muted-foreground">Completed successfully</span>
        </button>
      </div>
    </div>
  );
}
