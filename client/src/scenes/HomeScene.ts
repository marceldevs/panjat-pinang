import Phaser from "phaser";
import { getPlayerName, setPlayerName } from "../ui/landscape";
import { sfxClick, unlockAudio } from "../audio/sfx";
import { drawKampungBackground } from "../world/draw";
import { cx, stackedButtonY } from "../ui/layout";

export class HomeScene extends Phaser.Scene {
  private nameValue = "";
  private nodes: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("Home");
  }

  create() {
    unlockAudio();
    this.build();
    this.scale.on("resize", this.build, this);
  }

  private build = () => {
    for (const n of this.nodes) n.destroy();
    this.nodes = [];
    this.children.removeAll(true);

    drawKampungBackground(this);
    const { width, height } = this.scale;
    const mid = cx(this);

    const title = this.add
      .text(mid, height * 0.1, "PANJAT PINANG", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: `${Math.max(40, Math.round(height * 0.08))}px`,
        color: "#e31c25",
        stroke: "#fff",
        strokeThickness: 10,
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(mid, height * 0.18, "MAYHEM", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: `${Math.max(24, Math.round(height * 0.045))}px`,
        color: "#1b7a4e",
        stroke: "#fff",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    const tag = this.add
      .text(mid, height * 0.26, "Balapan panjat tiang yang kacau — 8 pemain, 1 hadiah!", {
        fontFamily: "Nunito, sans-serif",
        fontSize: `${Math.max(14, Math.round(height * 0.022))}px`,
        color: "#1a1a1a",
      })
      .setOrigin(0.5);

    this.nameValue = getPlayerName() || "Pemain";
    const nameLabel = this.add
      .text(mid, height * 0.36, `Nama: ${this.nameValue}`, {
        fontFamily: "Nunito, sans-serif",
        fontSize: `${Math.max(18, Math.round(height * 0.028))}px`,
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

    const btnW = Math.min(360, width * 0.35);
    const btnH = Math.max(48, height * 0.055);
    const btn = (index: number, label: string, color: number, cb: () => void) => {
      const y = stackedButtonY(this, index, 0.48, 0.07);
      const r = this.add
        .rectangle(mid, y, btnW, btnH, color)
        .setStrokeStyle(4, 0xffffff)
        .setInteractive({ useHandCursor: true });
      const t = this.add
        .text(mid, y, label, {
          fontFamily: "Fredoka, sans-serif",
          fontSize: `${Math.max(18, Math.round(btnH * 0.42))}px`,
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
      this.nodes.push(r, t);
    };

    btn(0, "Buat Ruangan", 0xe31c25, () => this.scene.start("CreateRoom"));
    btn(1, "Gabung Ruangan", 0x1b7a4e, () => this.scene.start("JoinRoom"));
    btn(2, "Latihan Offline", 0x457b9d, () => this.scene.start("OfflineGame"));

    const foot = this.add
      .text(mid, height - Math.max(24, height * 0.03), "Landscape · Sentuh / WASD + Spasi + E", {
        fontFamily: "Nunito, sans-serif",
        fontSize: `${Math.max(12, Math.round(height * 0.016))}px`,
        color: "#333",
      })
      .setOrigin(0.5);

    this.nodes.push(title, sub, tag, nameLabel, foot);
  };
}
