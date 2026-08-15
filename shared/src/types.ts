import type { AbilityType } from "./config.js";

export type MatchPhase =
  | "LOBBY"
  | "COUNTDOWN"
  | "PLAYING"
  | "PLAYER_WON"
  | "RESULTS";

export type PlayerMode =
  | "ground"
  | "air"
  | "gripping"
  | "climbing"
  | "ragdoll"
  | "falling"
  | "inactive"
  | "won";

export type ClimbGrade = "perfect" | "great" | "good" | "miss";

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  climbStart: boolean;
  climbTap: { climbId: string; elapsedMs: number } | null;
  abilityUse: boolean;
}

export function emptyInput(): PlayerInput {
  return {
    left: false,
    right: false,
    jumpPressed: false,
    climbStart: false,
    climbTap: null,
    abilityUse: false,
  };
}

export interface ClimbSession {
  climbId: string;
  duration: number;
  zoneCenter: number;
  zoneSize: number;
  startedAt: number;
}

export interface ActiveEffect {
  type: AbilityType;
  remaining: number;
}

export interface SimPlayer {
  id: string;
  name: string;
  colorIndex: number;
  ready: boolean;
  isHost: boolean;
  connected: boolean;
  inactive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  progress: number;
  poleIndex: number;
  mode: PlayerMode;
  facing: number;
  ragdollTimer: number;
  climbSession: ClimbSession | null;
  heldAbility: AbilityType | null;
  effects: ActiveEffect[];
  hasSecondChance: boolean;
  lastClimbGrade: ClimbGrade | null;
  lastClimbFlash: number;
}

export interface AbilityPickup {
  id: string;
  type: AbilityType;
  poleIndex: number;
  height: number;
  x: number;
  y: number;
}

export interface OiledPole {
  poleIndex: number;
  remaining: number;
}

export interface SimEvent {
  type:
    | "climbResult"
    | "bump"
    | "pickup"
    | "abilityUsed"
    | "playerWon"
    | "announce";
  playerId?: string;
  targetId?: string;
  grade?: ClimbGrade;
  ability?: AbilityType;
  message?: string;
}

export interface SimulationState {
  phase: MatchPhase;
  roomCode: string;
  hostId: string;
  tick: number;
  time: number;
  countdownRemaining: number;
  victoryFreezeRemaining: number;
  winnerId: string;
  players: Map<string, SimPlayer>;
  pickups: AbilityPickup[];
  oiledPoles: OiledPole[];
  abilitySpawnTimer: number;
  events: SimEvent[];
  rankings: string[];
}

export interface ClimbJudgeResult {
  grade: ClimbGrade;
  distance: number;
}
