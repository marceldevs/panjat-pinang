import Phaser from "phaser";
import { getPlayerName } from "../ui/landscape";
import { createGameRoom, setActiveSession } from "../net/connection";
import { sfxClick } from "../audio/sfx";
import { cx } from "../ui/layout";

export class CreateRoomScene extends Phaser.Scene {
  constructor() {
    super("CreateRoom");
  }

  async create() {
    const { height } = this.scale;
    const mid = cx(this);
    this.cameras.main.setBackgroundColor("#7ec8e3");
    this.add
      .text(mid, height / 2 - height * 0.04, "Membuat ruangan...", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: `${Math.max(24, Math.round(height * 0.04))}px`,
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
        .text(mid, height / 2 + height * 0.04, "Gagal membuat ruangan. Coba lagi.", {
          fontFamily: "Nunito, sans-serif",
          fontSize: `${Math.max(14, Math.round(height * 0.022))}px`,
          color: "#e31c25",
        })
        .setOrigin(0.5);
      this.time.delayedCall(1800, () => this.scene.start("Home"));
    }
  }
}
