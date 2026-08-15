import Phaser from "phaser";
import { getPlayerName } from "../ui/landscape";
import { joinGameRoom, setActiveSession } from "../net/connection";
import { sfxClick } from "../audio/sfx";

export class JoinRoomScene extends Phaser.Scene {
  constructor() {
    super("JoinRoom");
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#7ec8e3");

    this.add
      .text(width / 2, 80, "Gabung Ruangan", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "36px",
        color: "#e31c25",
        stroke: "#fff",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 140, "Masukkan kode 4 huruf dari host", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "16px",
        color: "#1a1a1a",
      })
      .setOrigin(0.5);

    const status = this.add
      .text(width / 2, 320, "", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "14px",
        color: "#e31c25",
      })
      .setOrigin(0.5);

    const joinBtn = this.add
      .rectangle(width / 2, 240, 260, 52, 0x1b7a4e)
      .setStrokeStyle(4, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, 240, "Masukkan Kode", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "22px",
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
      .text(width / 2, height - 40, "← Kembali", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "18px",
        color: "#1a1a1a",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.scene.start("Home"));
  }
}
