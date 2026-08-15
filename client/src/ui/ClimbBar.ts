import Phaser from "phaser";
import { bottomControlY, cx } from "./layout";

export class ClimbBar {
  private container: Phaser.GameObjects.Container;
  private track: Phaser.GameObjects.Rectangle;
  private zone: Phaser.GameObjects.Rectangle;
  private needle: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private active = false;
  private startedAt = 0;
  private duration = 900;
  private zoneCenter = 0.5;
  private zoneSize = 0.3;
  climbId = "";
  private tapped = false;
  private pendingResult: { climbId: string; elapsedMs: number } | null = null;
  private trackW = 280;

  constructor(private scene: Phaser.Scene) {
    this.container = scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(900)
      .setVisible(false);
    this.track = scene.add
      .rectangle(0, 0, this.trackW, 28, 0x222222, 0.85)
      .setStrokeStyle(2, 0xffffff, 0.7);
    this.zone = scene.add.rectangle(0, 0, 80, 22, 0x2a9d8f, 0.9);
    this.needle = scene.add.rectangle(-this.trackW / 2, 0, 6, 34, 0xe31c25);
    this.label = scene.add
      .text(0, -28, "TAP!", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "16px",
        color: "#fff",
      })
      .setOrigin(0.5);
    this.container.add([this.track, this.zone, this.needle, this.label]);

    this.track.setInteractive({ useHandCursor: true });
    this.track.on("pointerdown", () => this.tryTap());
    scene.input.keyboard?.on("keydown-SPACE", () => {
      if (this.active && !this.tapped) this.tryTap();
    });
    scene.scale.on("resize", this.layout, this);
    this.layout();
  }

  private layout = () => {
    const { width, height } = this.scene.scale;
    this.trackW = Math.min(420, Math.max(280, width * 0.28));
    const trackH = Math.max(28, height * 0.032);
    this.track.setSize(this.trackW, trackH);
    this.track.setDisplaySize(this.trackW, trackH);
    this.zone.height = trackH - 6;
    this.needle.height = trackH + 8;
    this.label.setFontSize(Math.max(16, Math.round(height * 0.018)));
    this.label.y = -trackH - 10;
    // Sit above the control band
    this.container.setPosition(cx(this.scene), bottomControlY(this.scene) - height * 0.12);
    this.refreshZone();
    this.updateNeedle(this.currentT());
  };

  private refreshZone() {
    const zoneW = this.trackW * this.zoneSize;
    this.zone.width = zoneW;
    this.zone.x = -this.trackW / 2 + this.zoneCenter * this.trackW;
  }

  /** Ping-pong phase 0→1→0→… */
  private currentT(): number {
    if (!this.active) return 0;
    const elapsed = performance.now() - this.startedAt;
    const cycle = (elapsed / this.duration) % 2;
    return cycle < 1 ? cycle : 2 - cycle;
  }

  private updateNeedle(t: number) {
    this.needle.x = -this.trackW / 2 + t * this.trackW;
  }

  start(climbId: string, duration: number, zoneCenter: number, zoneSize: number): void {
    this.climbId = climbId;
    this.duration = duration;
    this.zoneCenter = zoneCenter;
    this.zoneSize = zoneSize;
    this.startedAt = performance.now();
    this.tapped = false;
    this.pendingResult = null;
    this.active = true;
    this.container.setVisible(true);
    this.layout();
  }

  stop(): void {
    this.active = false;
    this.container.setVisible(false);
    this.climbId = "";
  }

  isActive(): boolean {
    return this.active && !this.tapped;
  }

  private tryTap(): { climbId: string; elapsedMs: number } | null {
    if (!this.active || this.tapped) return null;
    this.tapped = true;
    const t = this.currentT();
    // Judge expects elapsedMs / duration clamped 0–1
    const elapsedMs = t * this.duration;
    const result = { climbId: this.climbId, elapsedMs };
    this.pendingResult = result;
    this.stop();
    return result;
  }

  /** Poll tap result. Needle ping-pongs until player taps (no auto-miss). */
  poll(): { climbId: string; elapsedMs: number } | null {
    if (this.pendingResult) {
      const r = this.pendingResult;
      this.pendingResult = null;
      return r;
    }
    if (!this.active) return null;
    this.updateNeedle(this.currentT());
    return null;
  }

  /** Called from climb button / space when we want to force tap */
  forceTap(): { climbId: string; elapsedMs: number } | null {
    return this.tryTap();
  }
}
