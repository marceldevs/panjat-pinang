import Phaser from "phaser";
import { unlockAudio, startMusic } from "../audio/sfx";
import { cx } from "../ui/layout";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    const { height } = this.scale;
    const mid = cx(this);
    this.cameras.main.setBackgroundColor("#7ec8e3");
    this.add
      .text(mid, height / 2 - height * 0.04, "PANJAT PINANG", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: `${Math.max(40, Math.round(height * 0.07))}px`,
        color: "#e31c25",
        stroke: "#ffffff",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(mid, height / 2 + height * 0.05, "MAYHEM", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: `${Math.max(28, Math.round(height * 0.05))}px`,
        color: "#ffffff",
        stroke: "#e31c25",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.time.delayedCall(600, () => {
      unlockAudio();
      startMusic();
      this.scene.start("Home");
    });
  }
}
