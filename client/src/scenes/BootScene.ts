import Phaser from "phaser";
import { unlockAudio, startMusic } from "../audio/sfx";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#7ec8e3");
    this.add
      .text(width / 2, height / 2 - 20, "PANJAT PINANG", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "48px",
        color: "#e31c25",
        stroke: "#ffffff",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 36, "MAYHEM", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "36px",
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
