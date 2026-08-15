import Phaser from "phaser";
import {
  CONFIG,
  ABILITY_LABELS,
  type AbilityType,
  type PlayerInput,
  createOfflineMatch,
  emptyInput,
  stepSimulation,
} from "@panjat/shared";
import { TouchControls } from "../ui/TouchControls";
import { ClimbBar } from "../ui/ClimbBar";
import {
  drawKampungBackground,
  drawPoles,
  makePlayerSprite,
  spawnConfetti,
} from "../world/draw";
import { sfxClimb, sfxBump, sfxPickup, sfxAbility, sfxWin } from "../audio/sfx";

export class OfflineGameScene extends Phaser.Scene {
  private sim = createOfflineMatch().state;
  private playerId = "local";
  private controls!: TouchControls;
  private climbBar!: ClimbBar;
  private sprites = new Map<string, Phaser.GameObjects.Container>();
  private pickupSprites = new Map<string, Phaser.GameObjects.Arc>();
  private hud!: Phaser.GameObjects.Text;
  private announce!: Phaser.GameObjects.Text;
  private accum = 0;
  private lastClimbId = "";
  private poles!: Phaser.GameObjects.Container;

  constructor() {
    super("OfflineGame");
  }

  create() {
    const match = createOfflineMatch(localStorage.getItem("pp_name") || "Kamu");
    this.sim = match.state;
    this.playerId = match.playerId;

    drawKampungBackground(this);
    this.poles = drawPoles(this, new Set());
    this.controls = new TouchControls(this);
    this.climbBar = new ClimbBar(this);

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
      .text(this.scale.width / 2, 80, "Latihan · Loncat ke tiang, lalu PANJAT", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "18px",
        color: "#e31c25",
        stroke: "#fff",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);

    const back = this.add
      .text(this.scale.width - 12, 12, "Keluar", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "14px",
        color: "#fff",
        backgroundColor: "#e31c25",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(500)
      .setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.scene.start("Home"));

    this.cameras.main.setBounds(
      0,
      -40,
      CONFIG.worldWidth,
      CONFIG.prizeHeight * CONFIG.metersToPixels + 200
    );
  }

  update(_t: number, dtMs: number) {
    this.accum += dtMs / 1000;
    while (this.accum >= CONFIG.tickDt) {
      this.accum -= CONFIG.tickDt;
      this.fixedUpdate();
    }
    this.renderWorld();
  }

  private fixedUpdate() {
    const me = this.sim.players.get(this.playerId);
    if (!me) return;

    if (me.climbSession && me.climbSession.climbId !== this.lastClimbId) {
      this.lastClimbId = me.climbSession.climbId;
      this.climbBar.start(
        me.climbSession.climbId,
        me.climbSession.duration,
        me.climbSession.zoneCenter,
        me.climbSession.zoneSize
      );
    }
    if (!me.climbSession) {
      if (this.lastClimbId) {
        this.climbBar.stop();
        this.lastClimbId = "";
      }
    }

    let climbTap = this.climbBar.poll();
    const climbPressed = this.controls.consumeClimb();
    if (climbPressed && this.climbBar.isActive()) {
      climbTap = this.climbBar.forceTap() ?? climbTap;
    }

    const input: PlayerInput = {
      ...emptyInput(),
      left: this.controls.leftDown(),
      right: this.controls.rightDown(),
      jumpPressed: this.controls.consumeJump(),
      climbStart: climbPressed && !climbTap && me.mode === "gripping" && !me.climbSession,
      climbTap,
      abilityUse: this.controls.consumeAbility(),
    };

    const events = stepSimulation(this.sim, new Map([[this.playerId, input]]));
    for (const ev of events) {
      if (ev.type === "climbResult" && ev.grade) sfxClimb(ev.grade);
      if (ev.type === "bump") sfxBump();
      if (ev.type === "pickup") sfxPickup();
      if (ev.type === "abilityUsed") sfxAbility();
      if (ev.type === "playerWon") {
        sfxWin();
        spawnConfetti(this);
        this.announce.setText("Hadiah didapat!");
      }
      if (ev.type === "announce" && ev.message) this.announce.setText(ev.message);
    }
  }

  private renderWorld() {
    const oiled = new Set(this.sim.oiledPoles.map((o) => o.poleIndex));
    this.poles.each((child: Phaser.GameObjects.GameObject) => {
      const idx = child.getData("poleIndex") as number | undefined;
      if (idx !== undefined && "setFillStyle" in child) {
        (child as Phaser.GameObjects.Rectangle).setFillStyle(
          oiled.has(idx) ? 0xc9a227 : 0x8b5a2b
        );
      }
    });

    for (const [id, p] of this.sim.players) {
      let spr = this.sprites.get(id);
      if (!spr) {
        spr = makePlayerSprite(this, p.colorIndex, p.name);
        this.sprites.set(id, spr);
      }
      spr.setPosition(p.x, p.y);
      spr.setAlpha(p.mode === "ragdoll" ? 0.7 : p.inactive ? 0.35 : 1);
    }

    const seenPickups = new Set<string>();
    for (const pk of this.sim.pickups) {
      seenPickups.add(pk.id);
      let s = this.pickupSprites.get(pk.id);
      if (!s) {
        s = this.add.circle(pk.x, pk.y, 12, 0xffd166).setStrokeStyle(2, 0xffffff);
        this.pickupSprites.set(pk.id, s);
      }
      s.setPosition(pk.x, pk.y);
    }
    for (const [id, s] of this.pickupSprites) {
      if (!seenPickups.has(id)) {
        s.destroy();
        this.pickupSprites.delete(id);
      }
    }

    const me = this.sim.players.get(this.playerId);
    if (me) {
      const ability = me.heldAbility
        ? ABILITY_LABELS[me.heldAbility as AbilityType]
        : me.hasSecondChance
          ? "Second Chance"
          : "-";
      this.hud.setText(
        `Tinggi: ${me.progress.toFixed(1)} / ${CONFIG.prizeHeight}m\n` +
          `Mode: ${me.mode} · Tiang #${me.poleIndex + 1}\n` +
          `Ability: ${ability}`
      );
      const targetY = me.y - 180;
      this.cameras.main.scrollY = Phaser.Math.Linear(
        this.cameras.main.scrollY,
        Math.max(-40, targetY),
        0.12
      );
      this.cameras.main.scrollX = Phaser.Math.Linear(
        this.cameras.main.scrollX,
        me.x - this.scale.width / 2,
        0.08
      );
    }
  }
}
