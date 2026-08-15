import Phaser from "phaser";
import { CONFIG, ABILITY_LABELS, type AbilityType } from "@panjat/shared";
import { getActiveSession } from "../net/connection";
import { TouchControls } from "../ui/TouchControls";
import { ClimbBar } from "../ui/ClimbBar";
import {
  drawKampungBackground,
  drawPoles,
  makePlayerSprite,
  spawnConfetti,
} from "../world/draw";
import {
  sfxClimb,
  sfxBump,
  sfxPickup,
  sfxAbility,
  sfxWin,
  sfxAnnounce,
} from "../audio/sfx";

interface RemotePlayer {
  id: string;
  name: string;
  colorIndex: number;
  x: number;
  y: number;
  progress: number;
  poleIndex: number;
  mode: string;
  inactive: boolean;
  heldAbility: string;
  hasSecondChance: boolean;
  climbId: string;
  climbDuration: number;
  climbZoneCenter: number;
  climbZoneSize: number;
  lastClimbGrade: string;
}

interface Interp {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
}

export class GameScene extends Phaser.Scene {
  private controls!: TouchControls;
  private climbBar!: ClimbBar;
  private sprites = new Map<string, Phaser.GameObjects.Container>();
  private pickups = new Map<string, Phaser.GameObjects.Arc>();
  private interp = new Map<string, Interp>();
  private poles!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Text;
  private announce!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private lastClimbId = "";
  private wonCelebrated = false;
  private sendAccum = 0;

  constructor() {
    super("Game");
  }

  create() {
    const session = getActiveSession();
    if (!session) {
      this.scene.start("Home");
      return;
    }

    drawKampungBackground(this);
    this.poles = drawPoles(this, new Set());
    this.controls = new TouchControls(this);
    this.climbBar = new ClimbBar(this);
    this.wonCelebrated = false;

    this.hud = this.add
      .text(12, 12, "", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "14px",
        color: "#1a1a1a",
        backgroundColor: "#ffffffaa",
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(500);

    this.announce = this.add
      .text(this.scale.width / 2, 70, "", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "22px",
        color: "#e31c25",
        stroke: "#fff",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);

    this.countdownText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "96px",
        color: "#ffffff",
        stroke: "#e31c25",
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(800);

    this.cameras.main.setBounds(
      0,
      -40,
      CONFIG.worldWidth,
      CONFIG.prizeHeight * CONFIG.metersToPixels + 200
    );

    session.room.onMessage("announce", (msg: { message?: string }) => {
      if (msg.message) {
        this.announce.setText(msg.message);
        sfxAnnounce();
      }
    });

    session.room.onMessage("fx", (msg: {
      kind?: string;
      grade?: string;
      ability?: string;
    }) => {
      if (msg.kind === "climb" && msg.grade) sfxClimb(msg.grade);
      if (msg.kind === "bump") sfxBump();
      if (msg.kind === "pickup") sfxPickup();
      if (msg.kind === "abilityUsed") sfxAbility();
    });

    session.room.onStateChange((state) => this.onState(state));
  }

  private onState(state: Record<string, unknown>) {
    const players = state.players as Map<string, RemotePlayer> | undefined;
    if (!players) return;

    players.forEach((p, id) => {
      const prev = this.interp.get(id);
      const spr = this.sprites.get(id);
      const fromX = spr?.x ?? p.x;
      const fromY = spr?.y ?? p.y;
      this.interp.set(id, {
        fromX: prev && spr ? spr.x : fromX,
        fromY: prev && spr ? spr.y : fromY,
        toX: p.x,
        toY: p.y,
        t: 0,
      });

      if (!this.sprites.has(id)) {
        this.sprites.set(id, makePlayerSprite(this, p.colorIndex, p.name));
      }
    });

    // Remove gone players
    for (const id of [...this.sprites.keys()]) {
      if (!players.has(id)) {
        this.sprites.get(id)?.destroy();
        this.sprites.delete(id);
        this.interp.delete(id);
      }
    }

    // Pickups
    const pickups = state.pickups as Array<{
      id: string;
      x: number;
      y: number;
    }> | undefined;
    const seen = new Set<string>();
    if (pickups) {
      for (const pk of pickups) {
        seen.add(pk.id);
        let s = this.pickups.get(pk.id);
        if (!s) {
          s = this.add.circle(pk.x, pk.y, 12, 0xffd166).setStrokeStyle(2, 0xffffff);
          this.pickups.set(pk.id, s);
        }
        s.setPosition(pk.x, pk.y);
      }
    }
    for (const [id, s] of this.pickups) {
      if (!seen.has(id)) {
        s.destroy();
        this.pickups.delete(id);
      }
    }

    // Oiled poles
    const oiledRaw = String(state.oiledPoles || "");
    const oiled = new Set(
      oiledRaw
        .split(",")
        .filter(Boolean)
        .map((s) => Number(s.split(":")[0]))
    );
    this.poles.each((child: Phaser.GameObjects.GameObject) => {
      const idx = child.getData("poleIndex") as number | undefined;
      if (idx !== undefined && "setFillStyle" in child) {
        (child as Phaser.GameObjects.Rectangle).setFillStyle(
          oiled.has(idx) ? 0xc9a227 : 0x8b5a2b
        );
      }
    });

    const phase = String(state.phase || "");
    if (phase === "RESULTS") {
      this.scene.start("Results");
    }

    if (phase === "PLAYER_WON" && !this.wonCelebrated) {
      this.wonCelebrated = true;
      sfxWin();
      spawnConfetti(this);
    }
  }

  update(_t: number, dtMs: number) {
    const session = getActiveSession();
    if (!session) return;

    const state = session.room.state as {
      phase?: string;
      countdownRemaining?: number;
      players?: Map<string, RemotePlayer>;
      winnerId?: string;
    };

    // Countdown overlay
    if (state.phase === "COUNTDOWN") {
      const n = Math.ceil(state.countdownRemaining || 0);
      this.countdownText.setText(n > 0 ? String(n) : "GO!");
      this.countdownText.setVisible(true);
    } else {
      this.countdownText.setVisible(false);
    }

    // Interpolation
    const dt = dtMs / 1000;
    for (const [id, ip] of this.interp) {
      ip.t = Math.min(1, ip.t + dt * CONFIG.tickRate);
      const spr = this.sprites.get(id);
      if (!spr) continue;
      spr.x = Phaser.Math.Linear(ip.fromX, ip.toX, ip.t);
      spr.y = Phaser.Math.Linear(ip.fromY, ip.toY, ip.t);
      const p = state.players?.get(id);
      if (p) spr.setAlpha(p.inactive ? 0.35 : p.mode === "ragdoll" ? 0.7 : 1);
    }

    const me = state.players?.get(session.sessionId);
    if (me) {
      // Climb UI
      if (me.climbId && me.climbId !== this.lastClimbId) {
        this.lastClimbId = me.climbId;
        this.climbBar.start(
          me.climbId,
          me.climbDuration,
          me.climbZoneCenter,
          me.climbZoneSize
        );
      }
      if (!me.climbId && this.lastClimbId) {
        this.climbBar.stop();
        this.lastClimbId = "";
      }

      const ability = me.heldAbility
        ? ABILITY_LABELS[me.heldAbility as AbilityType] || me.heldAbility
        : me.hasSecondChance
          ? "Second Chance"
          : "-";
      this.hud.setText(
        `Tinggi: ${me.progress.toFixed(1)}/${CONFIG.prizeHeight}m\n` +
          `Tiang #${me.poleIndex + 1} · ${me.mode}\n` +
          `Ability: ${ability}`
      );

      // Camera: follow highest active cluster, bias to self
      let focusY = me.y;
      let focusX = me.x;
      if (state.players) {
        const actives = [...state.players.values()].filter((p) => !p.inactive);
        actives.sort((a, b) => b.progress - a.progress);
        const top = actives.slice(0, Math.min(3, actives.length));
        if (top.length) {
          focusY = top.reduce((s, p) => s + p.y, 0) / top.length;
          focusX = top.reduce((s, p) => s + p.x, 0) / top.length;
          // blend toward self
          focusY = focusY * 0.55 + me.y * 0.45;
          focusX = focusX * 0.4 + me.x * 0.6;
        }
      }
      this.cameras.main.scrollY = Phaser.Math.Linear(
        this.cameras.main.scrollY,
        Math.max(-40, focusY - 180),
        0.1
      );
      this.cameras.main.scrollX = Phaser.Math.Linear(
        this.cameras.main.scrollX,
        focusX - this.scale.width / 2,
        0.08
      );
    }

    // Send inputs ~30Hz
    this.sendAccum += dtMs;
    if (this.sendAccum >= 33 && state.phase === "PLAYING") {
      this.sendAccum = 0;
      this.sendInput(session.room);
    }
  }

  private sendInput(room: { send: (type: string, payload: unknown) => void }) {
    let climbTap = this.climbBar.poll();
    const climbPressed = this.controls.consumeClimb();
    if (climbPressed && this.climbBar.isActive()) {
      climbTap = this.climbBar.forceTap() ?? climbTap;
    }

    room.send("input", {
      left: this.controls.leftDown(),
      right: this.controls.rightDown(),
      jump: this.controls.consumeJump(),
      climbStart: climbPressed && !climbTap,
      climbTap,
      abilityUse: this.controls.consumeAbility(),
    });
  }
}
