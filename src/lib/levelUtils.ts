/**
 * XP / level utilities — frontend mirror of convex/levelUtils.ts
 * Keep in sync if the formula ever changes.
 */

export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(50 * Math.pow(level - 1, 1.5));
}

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

export function xpNeededForNextLevel(currentLevel: number): number {
  return xpToReachLevel(currentLevel + 1) - xpToReachLevel(currentLevel);
}
