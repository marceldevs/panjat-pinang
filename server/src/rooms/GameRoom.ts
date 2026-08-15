import { Room, Client } from "colyseus";
import {
  CONFIG,
  type AbilityType,
  type PlayerInput,
  type SimPlayer,
  type SimulationState,
  addPlayer,
  createSimulation,
  emptyInput,
  markDisconnected,
  markReconnected,
  removePlayer,
  returnToLobby,
  setReady,
  startCountdown,
  stepSimulation,
} from "@panjat/shared";
import { GameState, PlayerState, PickupState } from "./state.js";

export class GameRoom extends Room {
  maxClients = CONFIG.maxPlayers;
  state = new GameState();
  private sim!: SimulationState;
  private inputs = new Map<string, PlayerInput>();
  private pendingJump = new Set<string>();
  private pendingClimbStart = new Set<string>();
  private pendingAbility = new Set<string>();
  private pendingClimbTap = new Map<string, { climbId: string; elapsedMs: number }>();

  messages = {
    ready: (client: Client, payload: { ready?: boolean }) => {
      setReady(this.sim, client.sessionId, !!payload?.ready);
      this.syncFromSim();
    },
    start: (client: Client) => {
      if (client.sessionId !== this.sim.hostId) return;
      if (!startCountdown(this.sim)) {
        client.send("error", { message: "Butuh minimal 2 pemain dan semua ready." });
        return;
      }
      this.syncFromSim();
      this.broadcast("announce", { message: "Bersiap..." });
    },
    rematch: (client: Client) => {
      if (this.sim.phase !== "RESULTS") return;
      if (client.sessionId !== this.sim.hostId) return;
      returnToLobby(this.sim);
      this.syncFromSim();
      this.broadcast("announce", { message: "Kembali ke lobi" });
    },
    input: (
      client: Client,
      payload: {
        left?: boolean;
        right?: boolean;
        jump?: boolean;
        climbStart?: boolean;
        climbTap?: { climbId: string; elapsedMs: number } | null;
        abilityUse?: boolean;
      }
    ) => {
      if (this.sim.phase !== "PLAYING") return;
      const prev = this.inputs.get(client.sessionId) ?? emptyInput();
      if (payload.jump) this.pendingJump.add(client.sessionId);
      if (payload.climbStart) this.pendingClimbStart.add(client.sessionId);
      if (payload.abilityUse) this.pendingAbility.add(client.sessionId);
      if (payload.climbTap?.climbId) {
        this.pendingClimbTap.set(client.sessionId, {
          climbId: payload.climbTap.climbId,
          elapsedMs: Number(payload.climbTap.elapsedMs) || 0,
        });
      }
      this.inputs.set(client.sessionId, {
        ...prev,
        left: !!payload.left,
        right: !!payload.right,
      });
    },
  };

  onCreate(options: { roomCode?: string }) {
    const code = (options.roomCode || "XXXX").toUpperCase();
    this.sim = createSimulation(code);
    this.state.roomCode = code;
    void this.setMetadata({ roomCode: code });
    this.setSimulationInterval(() => this.tick(), 1000 / CONFIG.tickRate);
    console.log(`[GameRoom] created ${code}`);
  }

  onJoin(client: Client, options: { name?: string; roomCode?: string }) {
    if (this.sim.phase !== "LOBBY" && this.sim.phase !== "RESULTS") {
      if (!this.sim.players.has(client.sessionId)) {
        throw new Error("Pertandingan sedang berlangsung");
      }
    }

    if (this.sim.players.has(client.sessionId)) {
      markReconnected(this.sim, client.sessionId);
    } else {
      if (this.sim.players.size >= CONFIG.maxPlayers) {
        throw new Error("Ruangan penuh");
      }
      if (this.sim.phase !== "LOBBY") {
        throw new Error("Tidak bisa bergabung sekarang");
      }
      addPlayer(this.sim, client.sessionId, options?.name || "Pemain");
    }

    this.inputs.set(client.sessionId, emptyInput());
    this.syncFromSim();
    client.send("welcome", {
      sessionId: client.sessionId,
      roomCode: this.sim.roomCode,
    });
  }

  async onDrop(client: Client, _code?: number) {
    const id = client.sessionId;
    markDisconnected(this.sim, id);
    this.syncFromSim();

    if (this.sim.phase === "LOBBY" || this.sim.phase === "RESULTS") {
      removePlayer(this.sim, id);
      this.inputs.delete(id);
      this.syncFromSim();
      return;
    }

    try {
      await this.allowReconnection(client, CONFIG.disconnectGraceMs / 1000);
    } catch {
      removePlayer(this.sim, id);
      this.inputs.delete(id);
      this.syncFromSim();
      if (this.sim.players.size === 0) {
        this.disconnect();
      }
    }
  }

  onReconnect(client: Client) {
    markReconnected(this.sim, client.sessionId);
    this.inputs.set(client.sessionId, emptyInput());
    this.syncFromSim();
  }

  onLeave(client: Client, _code?: number) {
    const id = client.sessionId;
    if (this.sim.players.has(id)) {
      removePlayer(this.sim, id);
      this.inputs.delete(id);
      this.syncFromSim();
    }
  }

  onDispose() {
    console.log(`[GameRoom] disposed ${this.sim?.roomCode}`);
  }

  private tick() {
    if (
      this.sim.phase !== "COUNTDOWN" &&
      this.sim.phase !== "PLAYING" &&
      this.sim.phase !== "PLAYER_WON"
    ) {
      this.syncFromSim();
      return;
    }

    const tickInputs = new Map<string, PlayerInput>();
    for (const id of this.sim.players.keys()) {
      const base = this.inputs.get(id) ?? emptyInput();
      tickInputs.set(id, {
        left: base.left,
        right: base.right,
        jumpPressed: this.pendingJump.has(id),
        climbStart: this.pendingClimbStart.has(id),
        climbTap: this.pendingClimbTap.get(id) ?? null,
        abilityUse: this.pendingAbility.has(id),
      });
    }
    this.pendingJump.clear();
    this.pendingClimbStart.clear();
    this.pendingAbility.clear();
    this.pendingClimbTap.clear();

    const events = stepSimulation(this.sim, tickInputs);
    this.syncFromSim();

    for (const ev of events) {
      if (ev.type === "announce" || ev.type === "playerWon") {
        this.broadcast("announce", { message: ev.message, playerId: ev.playerId });
      } else if (ev.type === "climbResult") {
        this.broadcast("fx", {
          kind: "climb",
          playerId: ev.playerId,
          grade: ev.grade,
        });
      } else if (ev.type === "bump") {
        this.broadcast("fx", {
          kind: "bump",
          playerId: ev.playerId,
          targetId: ev.targetId,
        });
      } else if (ev.type === "pickup" || ev.type === "abilityUsed") {
        this.broadcast("fx", {
          kind: ev.type,
          playerId: ev.playerId,
          ability: ev.ability as AbilityType,
        });
      }
    }
  }

  private syncFromSim() {
    const s = this.sim;
    this.state.phase = s.phase;
    this.state.roomCode = s.roomCode;
    this.state.hostId = s.hostId;
    this.state.tick = s.tick;
    this.state.time = s.time;
    this.state.countdownRemaining = s.countdownRemaining;
    this.state.victoryFreezeRemaining = s.victoryFreezeRemaining;
    this.state.winnerId = s.winnerId;
    this.state.oiledPoles = s.oiledPoles
      .map((o) => `${o.poleIndex}:${o.remaining.toFixed(1)}`)
      .join(",");

    const seen = new Set<string>();
    for (const [id, simP] of s.players) {
      seen.add(id);
      let schema = this.state.players.get(id);
      if (!schema) {
        schema = new PlayerState();
        this.state.players.set(id, schema);
      }
      syncPlayer(schema, simP);
    }
    for (const id of [...this.state.players.keys()]) {
      if (!seen.has(id)) this.state.players.delete(id);
    }

    this.state.pickups.clear();
    for (const p of s.pickups) {
      const ps = new PickupState();
      ps.id = p.id;
      ps.type = p.type;
      ps.poleIndex = p.poleIndex;
      ps.height = p.height;
      ps.x = p.x;
      ps.y = p.y;
      this.state.pickups.push(ps);
    }

    this.state.rankings.clear();
    for (const id of s.rankings) this.state.rankings.push(id);
  }
}

function syncPlayer(schema: PlayerState, sim: SimPlayer): void {
  schema.id = sim.id;
  schema.name = sim.name;
  schema.colorIndex = sim.colorIndex;
  schema.ready = sim.ready;
  schema.isHost = sim.isHost;
  schema.connected = sim.connected;
  schema.inactive = sim.inactive;
  schema.x = sim.x;
  schema.y = sim.y;
  schema.vx = sim.vx;
  schema.vy = sim.vy;
  schema.progress = sim.progress;
  schema.poleIndex = sim.poleIndex;
  schema.mode = sim.mode;
  schema.facing = sim.facing;
  schema.ragdollTimer = sim.ragdollTimer;
  schema.heldAbility = sim.heldAbility ?? "";
  schema.hasSecondChance = sim.hasSecondChance;
  schema.lastClimbGrade = sim.lastClimbGrade ?? "";
  schema.lastClimbFlash = sim.lastClimbFlash;
  schema.effects = sim.effects.map((e) => `${e.type}:${e.remaining.toFixed(1)}`).join(",");
  if (sim.climbSession) {
    schema.climbId = sim.climbSession.climbId;
    schema.climbDuration = sim.climbSession.duration;
    schema.climbZoneCenter = sim.climbSession.zoneCenter;
    schema.climbZoneSize = sim.climbSession.zoneSize;
    schema.climbStartedAt = sim.climbSession.startedAt;
  } else {
    schema.climbId = "";
    schema.climbDuration = 0;
    schema.climbZoneCenter = 0;
    schema.climbZoneSize = 0;
    schema.climbStartedAt = 0;
  }
}
