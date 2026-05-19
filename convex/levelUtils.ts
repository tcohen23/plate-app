/**
 * Shared XP / level utilities — used by both convex mutations and frontend.
 *
 * Progression curve: xpForLevel(n) = Math.round(50 * (n - 1)^1.5)
 *
 * Milestones (total XP needed to reach level):
 *   Level 5  →  400 XP
 *   Level 10 →  1,350 XP
 *   Level 20 →  4,131 XP
 *   Level 30 →  7,149 XP
 *   Level 50 →  17,150 XP
 *   Level 75 →  31,869 XP
 *   Level 100 → 49,254 XP
 *
 * A user logging 3 meals + 1 workout daily (~55 XP/day) + achievements
 * reaches level 100 in roughly 2.5 years of consistent use.
 */

/** Total XP required to reach the start of `level`. Level 1 = 0 XP. */
export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(50 * Math.pow(level - 1, 1.5));
}

/** Derive current level (1–100) from total XP earned. */
export function getLevelFromXp(xp: number): number {
  let level = 1;
  for (let l = 2; l <= 100; l++) {
    if (xp >= xpToReachLevel(l)) {
      level = l;
    } else {
      break;
    }
  }
  return level;
}

/** XP needed to advance from current level to the next. */
export function xpNeededForNextLevel(currentLevel: number): number {
  return xpToReachLevel(currentLevel + 1) - xpToReachLevel(currentLevel);
}
