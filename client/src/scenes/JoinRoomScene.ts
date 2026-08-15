import Phaser from "phaser";
import { getPlayerName } from "../ui/landscape";
import { joinGameRoom, setActiveSession } from "../net/connection";
import { sfxClick } from "../audio/sfx";
import { cx } from "../ui/layout";

export class JoinRoomScene extends Phaser.Scene {
  constructor() {
    super("JoinRoom");
  }

  create() {
    this.cameras.main.setBackgroundColor("#7ec8e3");
    this.build();
    this.scale.on("resize", this.build, this);
  }

  private build = () => {
    this.children.removeAll(true);
    const { width, height } = this.scale;
    const mid = cx(this);

    this.add
      .text(mid, height * 0.12, "Gabung Ruangan", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: `${Math.max(32, Math.round(height * 0.055))}px`,
        color: "#e31c25",
        stroke: "#fff",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(mid, height * 0.22, "Masukkan kode 4 huruf dari host", {
        fontFamily: "Nunito, sans-serif",
        fontSize: `${Math.max(14, Math.round(height * 0.022))}px`,
        color: "#1a1a1a",
      })
      .setOrigin(0.5);

    const status = this.add
      .text(mid, height * 0.55, "", {
        fontFamily: "Nunito, sans-serif",
        fontSize: `${Math.max(14, Math.round(height * 0.018))}px`,
        color: "#e31c25",
      })
      .setOrigin(0.5);

    const btnW = Math.min(360, width * 0.35);
    const btnH = Math.max(52, height * 0.055);
    const joinBtn = this.add
      .rectangle(mid, height * 0.4, btnW, btnH, 0x1b7a4e)
      .setStrokeStyle(4, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(mid, height * 0.4, "Masukkan Kode", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: `${Math.max(20, Math.round(btnH * 0.4))}px`,
        color: "#fff",
      })
      .setOrigin(0.5);

    joinBtn.on("pointerdown", async () => {
      sfxClick();
      const code = window.prompt("Kode ruangan", "");
      if (!code || code.trim().length < 3) return;
      status.setText("Menghubungkan...");
      try {
        const room = await joinGameRoom(code.trim(), getPlayerName() || "Pemain");
        const roomCode =
          (room.state as { roomCode?: string }).roomCode || code.trim().toUpperCase();
        setActiveSession({ room, sessionId: room.sessionId, roomCode });
        this.scene.start("Lobby");
      } catch (e) {
        console.error(e);
        status.setText("Ruangan tidak ditemukan / penuh.");
      }
    });

    const back = this.add
      .text(mid, height - height * 0.06, "← Kembali", {
        fontFamily: "Nunito, sans-serif",
        fontSize: `${Math.max(16, Math.round(height * 0.024))}px`,
        color: "#1a1a1a",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.scene.start("Home"));
  };
}
