import Phaser from "phaser";
import { getPlayerName, setPlayerName } from "../ui/landscape";
import { sfxClick, unlockAudio } from "../audio/sfx";
import { drawKampungBackground } from "../world/draw";

export class HomeScene extends Phaser.Scene {
  private nameValue = "";

  constructor() {
    super("Home");
  }

  create() {
    unlockAudio();
    drawKampungBackground(this);
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 70, "PANJAT PINANG", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "52px",
        color: "#e31c25",
        stroke: "#fff",
        strokeThickness: 10,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 120, "MAYHEM", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "28px",
        color: "#1b7a4e",
        stroke: "#fff",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 170, "Balapan panjat tiang yang kacau — 8 pemain, 1 hadiah!", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "16px",
        color: "#1a1a1a",
      })
      .setOrigin(0.5);

    this.nameValue = getPlayerName() || "Pemain";
    const nameLabel = this.add
      .text(width / 2, 220, `Nama: ${this.nameValue}`, {
        fontFamily: "Nunito, sans-serif",
        fontSize: "20px",
        color: "#1a1a1a",
        backgroundColor: "#ffffffcc",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    nameLabel.on("pointerdown", () => {
      const next = window.prompt("Nama pemain", this.nameValue);
      if (next && next.trim()) {
        this.nameValue = next.trim().slice(0, 16);
        setPlayerName(this.nameValue);
        nameLabel.setText(`Nama: ${this.nameValue}`);
      }
    });

    const btn = (y: number, label: string, color: number, cb: () => void) => {
      const r = this.add
        .rectangle(width / 2, y, 280, 52, color)
        .setStrokeStyle(4, 0xffffff)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(width / 2, y, label, {
          fontFamily: "Fredoka, sans-serif",
          fontSize: "22px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      r.on("pointerdown", () => {
        sfxClick();
        setPlayerName(this.nameValue);
        cb();
      });
      r.on("pointerover", () => r.setScale(1.04));
      r.on("pointerout", () => r.setScale(1));
    };

    btn(300, "Buat Ruangan", 0xe31c25, () => this.scene.start("CreateRoom"));
    btn(365, "Gabung Ruangan", 0x1b7a4e, () => this.scene.start("JoinRoom"));
    btn(430, "Latihan Offline", 0x457b9d, () => this.scene.start("OfflineGame"));

    this.add
      .text(width / 2, height - 24, "Landscape · Sentuh / WASD + Spasi + E", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "12px",
        color: "#333",
      })
      .setOrigin(0.5);
  }
}
