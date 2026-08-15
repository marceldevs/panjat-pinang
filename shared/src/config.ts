export const CONFIG = {
  tickRate: 20,
  tickDt: 1 / 20,

  // World (meters for progress; pixels for ground plane on client)
  worldWidth: 960,
  groundY: 0,
  prizeHeight: 80,
  metersToPixels: 28,

  // Poles
  maxPlayers: 8,
  poleCount: 8,
  poleSpacing: 110,
  poleRadius: 14,
  firstPoleX: 120,

  // Player physics
  playerRadius: 18,
  moveSpeed: 240,
  airMoveSpeed: 160,
  jumpVelocity: 560,
  gravity: 1600,
  maxFallSpeed: 900,
  gripSnapDistance: 42,

  // Climbing timing bar
  climb: {
    durationMs: 900,
    zoneSizeEarly: 0.4,
    zoneSizeLate: 0.15,
    comebackAssistMax: 0.08,
    /** Fraction of zone size for each grade window (from zone center). */
    perfectFrac: 0.28,
    greatFrac: 0.55,
    distances: {
      perfect: 5,
      great: 3.2,
      good: 1.6,
      miss: 0,
    } as const,
    speedClimbMultiplier: 1.55,
    oilMissChance: 0.35,
  },

  // Head bump / knockback
  bump: {
    headHitHeight: 28,
    approachSpeedMin: 40,
    knockbackMin: 2,
    knockbackMax: 5,
    ragdollMin: 0.5,
    ragdollMax: 1.5,
    bumpBoostMultiplier: 1.75,
    fallSpeed: 55,
  },

  // Abilities
  abilitySpawnInterval: 7,
  abilityPickupRadius: 36,
  abilityHoldLimit: 1,
  abilities: {
    superGrip: { duration: 8 },
    superJump: { duration: 6, jumpMultiplier: 1.55 },
    speedClimb: { duration: 7 },
    oilBomb: { duration: 6, radiusPoles: 2 },
    bumpBoost: { duration: 8 },
    magnetGrab: { pullStrength: 3.5, range: 2.2 },
    secondChance: { progressRestore: 4 },
    windBlast: { knockProgress: 4, radius: 2.5 },
  },

  // Match flow
  countdownSeconds: 3,
  victoryFreezeSeconds: 2.5,
  disconnectGraceMs: 15000,
  resultsHoldSeconds: 0,

  // Comeback assist threshold (meters behind leader)
  comebackBehindMeters: 18,
} as const;

export type AbilityType =
  | "superGrip"
  | "superJump"
  | "speedClimb"
  | "oilBomb"
  | "bumpBoost"
  | "magnetGrab"
  | "secondChance"
  | "windBlast";

export const ABILITY_TYPES: AbilityType[] = [
  "superGrip",
  "superJump",
  "speedClimb",
  "oilBomb",
  "bumpBoost",
  "magnetGrab",
  "secondChance",
  "windBlast",
];

export const ABILITY_LABELS: Record<AbilityType, string> = {
  superGrip: "Super Grip",
  superJump: "Super Jump",
  speedClimb: "Speed Climb",
  oilBomb: "Oil Bomb",
  bumpBoost: "Bump Boost",
  magnetGrab: "Magnet Grab",
  secondChance: "Second Chance",
  windBlast: "Wind Blast",
};

export const PLAYER_COLORS = [
  0xe63946,
  0x457b9d,
  0x2a9d8f,
  0xe9c46a,
  0xf4a261,
  0x9b5de5,
  0x00bbf9,
  0xf15bb5,
];

export function poleX(index: number): number {
  return CONFIG.firstPoleX + index * CONFIG.poleSpacing;
}
