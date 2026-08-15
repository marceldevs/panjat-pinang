import {
  ABILITY_TYPES,
  CONFIG,
  poleX,
  type AbilityType,
} from "./config.js";
import { hasEffect } from "./climbing.js";
import type {
  AbilityPickup,
  PlayerInput,
  SimEvent,
  SimPlayer,
  SimulationState,
} from "./types.js";

function rand(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function pickAbility(rng: () => number): AbilityType {
  return ABILITY_TYPES[Math.floor(rng() * ABILITY_TYPES.length)]!;
}

export function tickEffects(player: SimPlayer, dt: number): void {
  player.effects = player.effects
    .map((e) => ({ ...e, remaining: e.remaining - dt }))
    .filter((e) => e.remaining > 0);
}

export function tryPickup(
  state: SimulationState,
  player: SimPlayer,
  events: SimEvent[]
): void {
  if (player.heldAbility || player.hasSecondChance) return;
  if (player.mode === "ragdoll" || player.mode === "falling" || player.mode === "inactive") {
    return;
  }

  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const p = state.pickups[i]!;
    const dx = player.x - p.x;
    const dy = player.y - p.y;
    if (Math.hypot(dx, dy) <= CONFIG.abilityPickupRadius) {
      if (p.type === "secondChance") {
        player.hasSecondChance = true;
      } else {
        player.heldAbility = p.type;
      }
      state.pickups.splice(i, 1);
      events.push({ type: "pickup", playerId: player.id, ability: p.type });
      break;
    }
  }
}

export function spawnAbilityPickups(
  state: SimulationState,
  rng: () => number
): void {
  if (state.phase !== "PLAYING") return;
  state.abilitySpawnTimer -= CONFIG.tickDt;
  if (state.abilitySpawnTimer > 0) return;
  state.abilitySpawnTimer = CONFIG.abilitySpawnInterval;

  const poleIndex = Math.floor(rng() * CONFIG.poleCount);
  const height = rand(rng, 8, CONFIG.prizeHeight * 0.85);
  const pickup: AbilityPickup = {
    id: `a_${state.tick}_${Math.floor(rng() * 1e6)}`,
    type: pickAbility(rng),
    poleIndex,
    height,
    x: poleX(poleIndex),
    y: height * CONFIG.metersToPixels,
  };
  state.pickups.push(pickup);
}

export function useAbility(
  state: SimulationState,
  player: SimPlayer,
  events: SimEvent[],
  rng: () => number
): void {
  const type = player.heldAbility;
  if (!type) return;
  player.heldAbility = null;

  const cfg = CONFIG.abilities;
  events.push({ type: "abilityUsed", playerId: player.id, ability: type });

  switch (type) {
    case "superGrip":
      player.effects.push({ type, remaining: cfg.superGrip.duration });
      break;
    case "superJump":
      player.effects.push({ type, remaining: cfg.superJump.duration });
      break;
    case "speedClimb":
      player.effects.push({ type, remaining: cfg.speedClimb.duration });
      break;
    case "bumpBoost":
      player.effects.push({ type, remaining: cfg.bumpBoost.duration });
      break;
    case "oilBomb": {
      const radius = cfg.oilBomb.radiusPoles;
      for (let i = 0; i < CONFIG.poleCount; i++) {
        if (Math.abs(i - player.poleIndex) <= radius) {
          const existing = state.oiledPoles.find((o) => o.poleIndex === i);
          if (existing) existing.remaining = cfg.oilBomb.duration;
          else state.oiledPoles.push({ poleIndex: i, remaining: cfg.oilBomb.duration });
        }
      }
      events.push({
        type: "announce",
        playerId: player.id,
        message: "Oli diguyur!",
        ability: type,
      });
      break;
    }
    case "magnetGrab": {
      let best: SimPlayer | null = null;
      let bestDist = Number(cfg.magnetGrab.range);
      for (const other of state.players.values()) {
        if (other.id === player.id || other.inactive || other.mode === "won") continue;
        const d = Math.abs(other.progress - player.progress);
        if (d > 0.2 && d < bestDist && other.poleIndex === player.poleIndex) {
          bestDist = d;
          best = other;
        }
      }
      if (best) {
        const pull = Math.min(cfg.magnetGrab.pullStrength, best.progress);
        best.progress = Math.max(0, best.progress - pull);
        best.y = best.progress * CONFIG.metersToPixels;
        player.progress = Math.min(CONFIG.prizeHeight, player.progress + pull * 0.35);
        player.y = player.progress * CONFIG.metersToPixels;
        events.push({
          type: "bump",
          playerId: player.id,
          targetId: best.id,
          ability: type,
        });
      }
      break;
    }
    case "windBlast": {
      for (const other of state.players.values()) {
        if (other.id === player.id || other.inactive || other.mode === "won") continue;
        if (Math.abs(other.progress - player.progress) > cfg.windBlast.radius) continue;
        if (Math.abs(other.poleIndex - player.poleIndex) > 2) continue;
        if (hasEffect(other, "superGrip")) continue;
        applyKnockback(other, cfg.windBlast.knockProgress, rng);
        events.push({
          type: "bump",
          playerId: player.id,
          targetId: other.id,
          ability: type,
        });
      }
      events.push({
        type: "announce",
        playerId: player.id,
        message: "Angin kencang!",
        ability: type,
      });
      break;
    }
    case "secondChance":
      player.hasSecondChance = true;
      break;
  }
}

export function applyKnockback(
  victim: SimPlayer,
  amount: number,
  rng: () => number
): void {
  if (hasEffect(victim, "superGrip")) return;

  if (victim.hasSecondChance) {
    victim.hasSecondChance = false;
    victim.progress = Math.min(
      CONFIG.prizeHeight,
      victim.progress + CONFIG.abilities.secondChance.progressRestore * 0.25
    );
    victim.y = victim.progress * CONFIG.metersToPixels;
    victim.mode = victim.progress > 0.5 ? "gripping" : "ground";
    victim.ragdollTimer = 0;
    return;
  }

  victim.progress = Math.max(0, victim.progress - amount);
  victim.y = victim.progress * CONFIG.metersToPixels;
  victim.vx = rand(rng, -80, 80);
  victim.vy = -40;
  victim.climbSession = null;
  victim.mode = "ragdoll";
  victim.ragdollTimer = rand(
    rng,
    CONFIG.bump.ragdollMin,
    CONFIG.bump.ragdollMax
  );
}

export function processAbilityInput(
  state: SimulationState,
  player: SimPlayer,
  input: PlayerInput,
  events: SimEvent[],
  rng: () => number
): void {
  if (input.abilityUse) {
    useAbility(state, player, events, rng);
  }
}

export function tickOiledPoles(state: SimulationState, dt: number): void {
  state.oiledPoles = state.oiledPoles
    .map((o) => ({ ...o, remaining: o.remaining - dt }))
    .filter((o) => o.remaining > 0);
}

export function isPoleOiled(state: SimulationState, poleIndex: number): boolean {
  return state.oiledPoles.some((o) => o.poleIndex === poleIndex);
}
