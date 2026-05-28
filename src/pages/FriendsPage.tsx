/**
 * FriendsPage — Connect & compete with friends
 */
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft, UserPlus, Search, Trophy, Flame, Footprints, Target } from "lucide-react";
import { hapticLight } from "@/lib/haptics";
import { toast } from "sonner";

type Tab = "Leaderboard" | "Friends" | "Requests";

// Mock leaderboard data — in production this would come from Convex
const LEADERBOARD = [
  { rank: 1, name: "Alex R.", streak: 42, steps: 11240, calories: 1820, avatar: "🏆", you: false },
  { rank: 2, name: "Jordan M.", streak: 28, steps: 9870, calories: 1950, avatar: "🦁", you: false },
  { rank: 3, name: "You", streak: 7, steps: 8200, calories: 1730, avatar: "💪🏽", you: true },
  { rank: 4, name: "Sam K.", streak: 5, steps: 7950, calories: 2100, avatar: "🔥", you: false },
  { rank: 5, name: "Riley T.", streak: 3, steps: 6400, calories: 1680, avatar: "🎯", you: false },
];

const RANK_COLORS = ["#E5B454", "rgba(192,192,192,0.9)", "#CD7F32", "rgba(255,255,255,0.3)", "rgba(255,255,255,0.2)"];

export function FriendsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Leaderboard");
  const [searchVal, setSearchVal] = useState("");

  const handleAddFriend = () => {
    hapticLight();
    toast.success("Friend request sent!");
  };

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => { hapticLight(); navigate(-1); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Friends</h1>
        <button
          onClick={handleAddFriend}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-1 mb-4">
        {(["Leaderboard", "Friends", "Requests"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { hapticLight(); setTab(t); }}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: tab === t ? "#52B788" : "rgba(255,255,255,0.06)",
              color: tab === t ? "#0d1f13" : "rgba(255,255,255,0.6)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Leaderboard" && (
        <div className="px-4">
          {/* Period toggle */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold">This Week</h2>
            <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              <span className="flex items-center gap-1"><Flame className="w-3 h-3" style={{ color: "#F9C74F" }} />Streak</span>
              <span className="flex items-center gap-1"><Footprints className="w-3 h-3" style={{ color: "#52B788" }} />Steps</span>
            </div>
          </div>

          {/* Leaderboard rows */}
          <div className="space-y-2">
            {LEADERBOARD.map((person) => (
              <div
                key={person.rank}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{
                  background: person.you
                    ? "rgba(82,183,136,0.1)"
                    : "rgba(255,255,255,0.04)",
                  border: person.you
                    ? "1px solid rgba(82,183,136,0.25)"
                    : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Rank */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ background: RANK_COLORS[person.rank - 1], color: person.rank <= 3 ? "#000" : "rgba(255,255,255,0.6)" }}
                >
                  {person.rank}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: "rgba(255,255,255,0.07)" }}>
                  {person.avatar}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    {person.name}
                    {person.you && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(82,183,136,0.2)", color: "#52B788" }}>You</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs flex items-center gap-0.5" style={{ color: "#F9C74F" }}>
                      <Flame className="w-3 h-3" /> {person.streak}d
                    </span>
                    <span className="text-xs flex items-center gap-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                      <Footprints className="w-3 h-3" /> {person.steps.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Calories */}
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold">{person.calories.toLocaleString()}</div>
                  <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>kcal</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-5 p-4 rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Trophy className="w-8 h-8 mx-auto mb-2" style={{ color: "#E5B454" }} />
            <p className="text-sm font-semibold mb-1">Invite friends to compete</p>
            <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.45)" }}>The leaderboard updates daily. Log calories, steps, and workouts to climb the ranks.</p>
            <button
              onClick={handleAddFriend}
              className="px-6 py-2.5 rounded-full text-sm font-bold"
              style={{ background: "#52B788", color: "#0d1f13" }}
            >
              Invite Friends
            </button>
          </div>
        </div>
      )}

      {tab === "Friends" && (
        <div className="px-4">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid var(--border)" }}>
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--muted-foreground)" }} />
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Find friends by name or email..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: "var(--muted-foreground)" }}>
            <UserPlus className="w-10 h-10 mb-3 opacity-25" />
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--foreground)" }}>No friends yet</p>
            <p className="text-xs max-w-[220px] leading-relaxed">Add friends to see their progress, compare streaks, and keep each other accountable.</p>
            <button
              onClick={handleAddFriend}
              className="mt-4 px-6 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: "#52B788", color: "#0d1f13" }}
            >
              Add Friends
            </button>
          </div>
        </div>
      )}

      {tab === "Requests" && (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center" style={{ color: "var(--muted-foreground)" }}>
          <Target className="w-10 h-10 mb-3 opacity-25" />
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--foreground)" }}>No pending requests</p>
          <p className="text-xs leading-relaxed">When someone sends you a friend request, it will appear here.</p>
        </div>
      )}
    </div>
  );
}
