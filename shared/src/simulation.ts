import {
  CONFIG,
  PLAYER_COLORS,
  poleX,
} from "./config.js";
import {
  applyClimbProgress,
  createClimbSession,
  hasEffect,
  judgeClimbTap,
} from "./climbing.js";
import {
  applyKnockback,
  isPoleOiled,
  processAbilityInput,
  spawnAbilityPickups,
  tickEffects,
  tickOiledPoles,
  tryPickup,
} from "./abilities.js";
import type {
  MatchPhase,
  PlayerInput,
  PlayerMode,
  SimEvent,
  SimPlayer,
  SimulationState,
} from "./types.js";
import { emptyInput } from "./types.js";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function rand(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function createSimulation(roomCode = "LOCAL"): SimulationState {
  return {
    phase: "LOBBY",
    roomCode,
    hostId: "",
    tick: 0,
    time: 0,
    countdownRemaining: 0,
    victoryFreezeRemaining: 0,
    winnerId: "",
    players: new Map(),
    pickups: [],
    oiledPoles: [],
    abilitySpawnTimer: 3,
    events: [],
    rankings: [],
  };
}

export function addPlayer(
  state: SimulationState,
  id: string,
  name: string,
  preferredPole?: number
): SimPlayer {
  const used = new Set(
    [...state.players.values()].map((p) => p.poleIndex)
  );
  let poleIndex =
    preferredPole !== undefined && !used.has(preferredPole)
      ? preferredPole
      : 0;
  if (preferredPole === undefined || used.has(preferredPole)) {
    for (let i = 0; i < CONFIG.poleCount; i++) {
      if (!used.has(i)) {
        poleIndex = i;
        break;
      }
    }
  }

  const colorIndex = state.players.size % PLAYER_COLORS.length;
  const player: SimPlayer = {
    id,
    name: name.slice(0, 16) || `Pemain${state.players.size + 1}`,
    colorIndex,
    ready: false,
    isHost: state.players.size === 0,
    connected: true,
    inactive: false,
    x: poleX(poleIndex),
    y: 0,
    vx: 0,
    vy: 0,
    progress: 0,
    poleIndex,
    mode: "ground",
    facing: 1,
    ragdollTimer: 0,
    climbSession: null,
    heldAbility: null,
    effects: [],
    hasSecondChance: false,
    lastClimbGrade: null,
    lastClimbFlash: 0,
  };

  if (player.isHost) state.hostId = id;
  state.players.set(id, player);
  return player;
}

export function removePlayer(state: SimulationState, id: string): void {
  state.players.delete(id);
  if (state.hostId === id) {
    const next = state.players.values().next().value as SimPlayer | undefined;
    state.hostId = next?.id ?? "";
    if (next) next.isHost = true;
  }
}

export function markDisconnected(state: SimulationState, id: string): void {
  const p = state.players.get(id);
  if (!p) return;
  p.connected = false;
  if (state.phase === "PLAYING" || state.phase === "COUNTDOWN") {
    p.inactive = true;
    p.mode = "inactive";
    p.climbSession = null;
  }
}

export function markReconnected(state: SimulationState, id: string): void {
  const p = state.players.get(id);
  if (!p) return;
  p.connected = true;
  if (p.inactive && state.phase === "PLAYING") {
    p.inactive = false;
    p.mode = p.progress > 0.2 ? "gripping" : "ground";
  }
}

export function setReady(state: SimulationState, id: string, ready: boolean): void {
  const p = state.players.get(id);
  if (!p || state.phase !== "LOBBY") return;
  p.ready = ready;
}

export function canStart(state: SimulationState): boolean {
  if (state.phase !== "LOBBY") return false;
  if (state.players.size < 2) return false;
  return [...state.players.values()].every((p) => p.ready);
}

export function startCountdown(state: SimulationState): boolean {
  if (!canStart(state)) return false;
  state.phase = "COUNTDOWN";
  state.countdownRemaining = CONFIG.countdownSeconds;
  for (const p of state.players.values()) {
    resetPlayerForMatch(p);
  }
  state.pickups = [];
  state.oiledPoles = [];
  state.abilitySpawnTimer = 4;
  state.winnerId = "";
  state.rankings = [];
  return true;
}

function resetPlayerForMatch(p: SimPlayer): void {
  p.x = poleX(p.poleIndex);
  p.y = 0;
  p.vx = 0;
  p.vy = 0;
  p.progress = 0;
  p.mode = "ground";
  p.ragdollTimer = 0;
  p.climbSession = null;
  p.heldAbility = null;
  p.effects = [];
  p.hasSecondChance = false;
  p.lastClimbGrade = null;
  p.inactive = !p.connected;
  if (p.inactive) p.mode = "inactive";
}

export function returnToLobby(state: SimulationState): void {
  state.phase = "LOBBY";
  state.countdownRemaining = 0;
  state.victoryFreezeRemaining = 0;
  state.winnerId = "";
  state.rankings = [];
  state.pickups = [];
  state.oiledPoles = [];
  for (const p of state.players.values()) {
    p.ready = false;
    resetPlayerForMatch(p);
  }
}

function leaderProgress(state: SimulationState): number {
  let max = 0;
  for (const p of state.players.values()) {
    if (!p.inactive && p.progress > max) max = p.progress;
  }
  return max;
}

function nearestPole(x: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < CONFIG.poleCount; i++) {
    const d = Math.abs(x - poleX(i));
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function tryGripPole(player: SimPlayer): void {
  const idx = nearestPole(player.x);
  const px = poleX(idx);
  if (Math.abs(player.x - px) <= CONFIG.gripSnapDistance && player.y >= -4) {
    player.poleIndex = idx;
    player.x = px;
    player.vx = 0;
    player.vy = 0;
    player.mode = player.progress > 0.05 ? "gripping" : "gripping";
    if (player.y < 0) player.y = 0;
    player.progress = Math.max(0, player.y / CONFIG.metersToPixels);
  }
}

function startClimb(
  state: SimulationState,
  player: SimPlayer,
  now: number,
  rng: () => number
): void {
  if (player.mode !== "gripping" && player.mode !== "climbing") return;
  if (player.climbSession) return;
  player.mode = "climbing";
  player.climbSession = createClimbSession(
    player.progress,
    leaderProgress(state),
    now,
    rng
  );
}

function resolveClimbTap(
  state: SimulationState,
  player: SimPlayer,
  climbId: string,
  elapsedMs: number,
  events: SimEvent[],
  rng: () => number
): void {
  const session = player.climbSession;
  if (!session || session.climbId !== climbId) return;

  const result = judgeClimbTap(
    session,
    elapsedMs,
    hasEffect(player, "speedClimb"),
    isPoleOiled(state, player.poleIndex),
    rng
  );

  player.climbSession = null;
  player.lastClimbGrade = result.grade;
  player.lastClimbFlash = 0.45;
  applyClimbProgress(player, result.distance);
  player.mode = "gripping";

  events.push({
    type: "climbResult",
    playerId: player.id,
    grade: result.grade,
  });

  if (player.progress >= CONFIG.prizeHeight) {
    declareWinner(state, player, events);
  }
}

function declareWinner(
  state: SimulationState,
  winner: SimPlayer,
  events: SimEvent[]
): void {
  if (state.phase !== "PLAYING") return;
  winner.mode = "won";
  winner.progress = CONFIG.prizeHeight;
  winner.y = CONFIG.prizeHeight * CONFIG.metersToPixels;
  winner.climbSession = null;
  state.phase = "PLAYER_WON";
  state.winnerId = winner.id;
  state.victoryFreezeRemaining = CONFIG.victoryFreezeSeconds;
  state.rankings = [...state.players.values()]
    .sort((a, b) => b.progress - a.progress)
    .map((p) => p.id);
  events.push({
    type: "playerWon",
    playerId: winner.id,
    message: `${winner.name} menang!`,
  });
  events.push({
    type: "announce",
    playerId: winner.id,
    message: "Panjat Pinang!",
  });
}

function processBump(
  state: SimulationState,
  attacker: SimPlayer,
  victim: SimPlayer,
  events: SimEvent[],
  rng: () => number
): void {
  if (attacker.id === victim.id) return;
  if (attacker.poleIndex !== victim.poleIndex) return;
  if (victim.mode === "ragdoll" || victim.mode === "falling" || victim.mode === "inactive") {
    return;
  }
  if (attacker.mode === "ragdoll" || attacker.mode === "falling" || attacker.inactive) {
    return;
  }

  const dy = attacker.y - victim.y;
  if (dy < CONFIG.playerRadius * 0.4 || dy > CONFIG.bump.headHitHeight * 1.6) {
    return;
  }

  const rising =
    attacker.vy > CONFIG.bump.approachSpeedMin * 0.02 ||
    attacker.mode === "climbing" ||
    (attacker.mode === "gripping" && attacker.lastClimbFlash > 0.2);

  if (!rising && attacker.progress <= victim.progress + 0.3) return;

  let amount = rand(rng, CONFIG.bump.knockbackMin, CONFIG.bump.knockbackMax);
  if (hasEffect(attacker, "bumpBoost")) {
    amount *= CONFIG.bump.bumpBoostMultiplier;
  }

  applyKnockback(victim, amount, rng);
  events.push({
    type: "bump",
    playerId: attacker.id,
    targetId: victim.id,
  });
}

function updateGroundAir(
  player: SimPlayer,
  input: PlayerInput,
  dt: number
): void {
  const speed = player.mode === "air" ? CONFIG.airMoveSpeed : CONFIG.moveSpeed;
  let ax = 0;
  if (input.left) ax -= 1;
  if (input.right) ax += 1;
  if (ax !== 0) player.facing = ax;

  if (player.mode === "ground" || player.mode === "air") {
    player.vx = ax * speed;
    player.x += player.vx * dt;
    player.x = clamp(player.x, 40, CONFIG.worldWidth - 40);

    if (player.mode === "air") {
      player.vy -= CONFIG.gravity * dt;
      player.vy = Math.max(player.vy, -CONFIG.maxFallSpeed);
      player.y += player.vy * dt;
      if (player.y <= 0) {
        player.y = 0;
        player.vy = 0;
        player.mode = "ground";
        player.progress = 0;
      }
    } else if (input.jumpPressed) {
      let jump = CONFIG.jumpVelocity;
      if (hasEffect(player, "superJump")) {
        jump *= CONFIG.abilities.superJump.jumpMultiplier;
      }
      player.vy = jump;
      player.mode = "air";
    }
  }
}

function updateGripping(
  state: SimulationState,
  player: SimPlayer,
  input: PlayerInput,
  now: number,
  events: SimEvent[],
  rng: () => number
): void {
  player.x = poleX(player.poleIndex);
  player.vx = 0;
  player.vy = 0;
  player.y = player.progress * CONFIG.metersToPixels;

  // Horizontal nudge to switch poles while gripping near ground-ish or mid climb via jump
  if (input.jumpPressed) {
    let jump = CONFIG.jumpVelocity * 0.85;
    if (hasEffect(player, "superJump")) {
      jump *= CONFIG.abilities.superJump.jumpMultiplier;
    }
    // Directional pole switch
    let targetPole = player.poleIndex;
    if (input.left) targetPole = Math.max(0, player.poleIndex - 1);
    else if (input.right) targetPole = Math.min(CONFIG.poleCount - 1, player.poleIndex + 1);

    player.mode = "air";
    player.vy = jump;
    player.vx = (targetPole - player.poleIndex) * CONFIG.poleSpacing * 2.2;
    player.poleIndex = targetPole;
    player.climbSession = null;
    return;
  }

  if (input.left || input.right) {
    const dir = input.left ? -1 : 1;
    const target = clamp(player.poleIndex + dir, 0, CONFIG.poleCount - 1);
    if (target !== player.poleIndex && player.progress < 3) {
      player.poleIndex = target;
      player.x = poleX(target);
    }
  }

  if (input.climbStart || (!player.climbSession && !input.left && !input.right)) {
    // Auto-prompt climb when gripping — start on climbStart or hold still
    if (input.climbStart) {
      startClimb(state, player, now, rng);
    }
  }

  if (input.climbTap && player.climbSession) {
    resolveClimbTap(
      state,
      player,
      input.climbTap.climbId,
      input.climbTap.elapsedMs,
      events,
      rng
    );
  }
}

function updateClimbing(
  state: SimulationState,
  player: SimPlayer,
  input: PlayerInput,
  _now: number,
  events: SimEvent[],
  rng: () => number
): void {
  player.x = poleX(player.poleIndex);
  const session = player.climbSession;
  if (!session) {
    player.mode = "gripping";
    return;
  }

  // No duration force-miss — client ping-pongs until the player taps.
  if (input.climbTap) {
    resolveClimbTap(
      state,
      player,
      input.climbTap.climbId,
      input.climbTap.elapsedMs,
      events,
      rng
    );
  }
}

function updateRagdoll(player: SimPlayer, dt: number): void {
  player.ragdollTimer -= dt;
  player.vy -= CONFIG.gravity * 0.55 * dt;
  player.y += player.vy * dt;
  player.x += player.vx * dt;
  player.progress = Math.max(0, player.y / CONFIG.metersToPixels);

  if (player.y <= 0) {
    player.y = 0;
    player.progress = 0;
    player.vx = 0;
    player.vy = 0;
    player.ragdollTimer = 0;
    player.mode = "ground";
    return;
  }

  if (player.ragdollTimer <= 0) {
    player.mode = "falling";
  }
}

function updateFalling(player: SimPlayer, dt: number): void {
  player.progress = Math.max(0, player.progress - CONFIG.bump.fallSpeed * dt * 0.15);
  player.y = player.progress * CONFIG.metersToPixels;
  player.x += (poleX(player.poleIndex) - player.x) * Math.min(1, dt * 6);

  if (player.progress <= 0.05) {
    player.progress = 0;
    player.y = 0;
    player.mode = "ground";
    player.x = poleX(player.poleIndex);
  } else if (Math.abs(player.x - poleX(player.poleIndex)) < 8) {
    player.x = poleX(player.poleIndex);
    player.mode = "gripping";
    player.vx = 0;
    player.vy = 0;
  }
}

function updatePlayer(
  state: SimulationState,
  player: SimPlayer,
  input: PlayerInput,
  dt: number,
  now: number,
  events: SimEvent[],
  rng: () => number
): void {
  if (player.inactive || player.mode === "inactive" || player.mode === "won") {
    return;
  }

  tickEffects(player, dt);
  if (player.lastClimbFlash > 0) player.lastClimbFlash -= dt;

  processAbilityInput(state, player, input, events, rng);

  switch (player.mode) {
    case "ground":
    case "air":
      updateGroundAir(player, input, dt);
      if (player.mode === "air" || player.mode === "ground") {
        tryGripPole(player);
      }
      break;
    case "gripping":
      updateGripping(state, player, input, now, events, rng);
      break;
    case "climbing":
      updateClimbing(state, player, input, now, events, rng);
      break;
    case "ragdoll":
      updateRagdoll(player, dt);
      break;
    case "falling":
      updateFalling(player, dt);
      break;
  }

  tryPickup(state, player, events);
}

export function stepSimulation(
  state: SimulationState,
  inputs: Map<string, PlayerInput>,
  rng: () => number = Math.random
): SimEvent[] {
  const dt = CONFIG.tickDt;
  const events: SimEvent[] = [];
  state.events = events;
  state.tick += 1;
  state.time += dt;
  const now = state.time * 1000;

  if (state.phase === "COUNTDOWN") {
    state.countdownRemaining -= dt;
    if (state.countdownRemaining <= 0) {
      state.phase = "PLAYING";
      state.countdownRemaining = 0;
      events.push({ type: "announce", message: "Mulai!" });
    }
    return events;
  }

  if (state.phase === "PLAYER_WON") {
    state.victoryFreezeRemaining -= dt;
    if (state.victoryFreezeRemaining <= 0) {
      state.phase = "RESULTS";
    }
    return events;
  }

  if (state.phase !== "PLAYING") {
    return events;
  }

  tickOiledPoles(state, dt);
  spawnAbilityPickups(state, rng);

  for (const player of state.players.values()) {
    const input = inputs.get(player.id) ?? emptyInput();
    updatePlayer(state, player, input, dt, now, events, rng);
  }

  // Head bumps after movement
  const list = [...state.players.values()].filter(
    (p) => !p.inactive && p.mode !== "won"
  );
  for (let i = 0; i < list.length; i++) {
    for (let j = 0; j < list.length; j++) {
      if (i === j) continue;
      processBump(state, list[i]!, list[j]!, events, rng);
    }
  }

  return events;
}

/** Offline helper: create a ready-to-play local match with one player. */
export function createOfflineMatch(playerName = "Kamu"): {
  state: SimulationState;
  playerId: string;
} {
  const state = createSimulation("OFFLINE");
  const player = addPlayer(state, "local", playerName, 3);
  player.ready = true;
  state.phase = "PLAYING";
  return { state, playerId: player.id };
}

export type { MatchPhase, PlayerMode, SimulationState, SimPlayer, PlayerInput, SimEvent };
