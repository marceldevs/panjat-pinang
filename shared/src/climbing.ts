import { CONFIG, type AbilityType } from "./config.js";
import type { ClimbGrade, ClimbJudgeResult, ClimbSession, SimPlayer } from "./types.js";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function zoneSizeForHeight(progress: number, leaderProgress: number): number {
  const t = clamp(progress / CONFIG.prizeHeight, 0, 1);
  let size =
    CONFIG.climb.zoneSizeEarly +
    (CONFIG.climb.zoneSizeLate - CONFIG.climb.zoneSizeEarly) * t;

  const behind = leaderProgress - progress;
  if (behind > CONFIG.comebackBehindMeters * 0.35) {
    const assist = clamp(
      behind / CONFIG.comebackBehindMeters,
      0,
      1
    ) * CONFIG.climb.comebackAssistMax;
    size += assist;
  }
  return clamp(size, 0.12, 0.5);
}

export function createClimbSession(
  progress: number,
  leaderProgress: number,
  now: number,
  rng: () => number = Math.random
): ClimbSession {
  const zoneSize = zoneSizeForHeight(progress, leaderProgress);
  const half = zoneSize / 2;
  const zoneCenter = half + rng() * (1 - zoneSize);
  return {
    climbId: `c_${Math.floor(rng() * 1e9).toString(36)}_${now}`,
    duration: CONFIG.climb.durationMs,
    zoneCenter,
    zoneSize,
    startedAt: now,
  };
}

export function judgeClimbTap(
  session: ClimbSession,
  elapsedMs: number,
  hasSpeedClimb: boolean,
  poleOiled: boolean,
  rng: () => number = Math.random
): ClimbJudgeResult {
  const t = clamp(elapsedMs / session.duration, 0, 1);
  const dist = Math.abs(t - session.zoneCenter);
  const half = session.zoneSize / 2;

  let grade: ClimbGrade;
  if (dist <= half * CONFIG.climb.perfectFrac) grade = "perfect";
  else if (dist <= half * CONFIG.climb.greatFrac) grade = "great";
  else if (dist <= half) grade = "good";
  else grade = "miss";

  if (poleOiled && grade !== "miss" && rng() < CONFIG.climb.oilMissChance) {
    grade = "miss";
  }

  let distance = CONFIG.climb.distances[grade];
  if (hasSpeedClimb && grade !== "miss") {
    distance *= CONFIG.climb.speedClimbMultiplier;
  }

  return { grade, distance };
}

export function hasEffect(player: SimPlayer, type: AbilityType): boolean {
  return player.effects.some((e) => e.type === type && e.remaining > 0);
}

export function applyClimbProgress(player: SimPlayer, distance: number): void {
  player.progress = Math.min(CONFIG.prizeHeight, player.progress + distance);
  player.y = player.progress * CONFIG.metersToPixels;
}
