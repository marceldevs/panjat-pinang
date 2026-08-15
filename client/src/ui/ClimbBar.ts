import Phaser from "phaser";

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

  constructor(private scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    this.container = scene.add.container(width / 2, height - 150).setScrollFactor(0).setDepth(900).setVisible(false);
    this.track = scene.add.rectangle(0, 0, 280, 28, 0x222222, 0.85).setStrokeStyle(2, 0xffffff, 0.7);
    this.zone = scene.add.rectangle(0, 0, 80, 22, 0x2a9d8f, 0.9);
    this.needle = scene.add.rectangle(-140, 0, 6, 34, 0xe31c25);
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

    const trackW = 280;
    const zoneW = trackW * zoneSize;
    this.zone.width = zoneW;
    this.zone.x = -trackW / 2 + zoneCenter * trackW;
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
    const elapsedMs = performance.now() - this.startedAt;
    const result = { climbId: this.climbId, elapsedMs };
    this.pendingResult = result;
    this.stop();
    return result;
  }

  /** Poll tap result (also auto-misses after duration). */
  poll(): { climbId: string; elapsedMs: number } | null {
    if (this.pendingResult) {
      const r = this.pendingResult;
      this.pendingResult = null;
      return r;
    }
    if (!this.active) return null;
    const elapsed = performance.now() - this.startedAt;
    if (elapsed >= this.duration) {
      this.tapped = true;
      const result = { climbId: this.climbId, elapsedMs: this.duration };
      this.stop();
      return result;
    }
    const t = Math.min(1, elapsed / this.duration);
    this.needle.x = -140 + t * 280;
    return null;
  }

  /** Called from climb button / space when we want to force tap */
  forceTap(): { climbId: string; elapsedMs: number } | null {
    return this.tryTap();
  }
}
