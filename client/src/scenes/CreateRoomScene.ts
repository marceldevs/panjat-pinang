import Phaser from "phaser";
import { getPlayerName } from "../ui/landscape";
import { createGameRoom, setActiveSession } from "../net/connection";
import { sfxClick } from "../audio/sfx";

export class CreateRoomScene extends Phaser.Scene {
  constructor() {
    super("CreateRoom");
  }

  async create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#7ec8e3");
    this.add
      .text(width / 2, height / 2 - 40, "Membuat ruangan...", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "28px",
        color: "#1a1a1a",
      })
      .setOrigin(0.5);

    try {
      const name = getPlayerName() || "Host";
      const { room, roomCode } = await createGameRoom(name);
      setActiveSession({ room, sessionId: room.sessionId, roomCode });
      sfxClick();
      this.scene.start("Lobby");
    } catch (e) {
      console.error(e);
      this.add
        .text(width / 2, height / 2 + 20, "Gagal membuat ruangan. Coba lagi.", {
          fontFamily: "Nunito, sans-serif",
          fontSize: "16px",
          color: "#e31c25",
        })
        .setOrigin(0.5);
      this.time.delayedCall(1800, () => this.scene.start("Home"));
    }
  }
}
