import Phaser from "phaser";
import { getActiveSession } from "../net/connection";
import { sfxClick, sfxWin } from "../audio/sfx";
import { spawnConfetti } from "../world/draw";

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super("Results");
  }

  create() {
    const session = getActiveSession();
    if (!session) {
      this.scene.start("Home");
      return;
    }

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#1b7a4e");
    spawnConfetti(this);
    sfxWin();

    this.add
      .text(width / 2, 50, "HASIL", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "42px",
        color: "#ffffff",
        stroke: "#e31c25",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    const state = session.room.state as {
      winnerId?: string;
      rankings?: string[];
      players?: Map<
        string,
        { name: string; progress: number; id: string }
      >;
      hostId?: string;
    };

    const winner = state.winnerId
      ? state.players?.get(state.winnerId)
      : undefined;

    this.add
      .text(width / 2, 110, winner ? `${winner.name} juara!` : "Selesai", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "28px",
        color: "#ffd166",
      })
      .setOrigin(0.5);

    const lines: string[] = [];
    const rankingIds =
      state.rankings && state.rankings.length
        ? [...state.rankings]
        : state.players
          ? [...state.players.keys()]
          : [];

    rankingIds.forEach((id, i) => {
      const p = state.players?.get(id);
      if (!p) return;
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      lines.push(`${medal} ${p.name} — ${p.progress.toFixed(1)}m`);
    });

    this.add
      .text(width / 2, 180, lines.join("\n"), {
        fontFamily: "Nunito, sans-serif",
        fontSize: "18px",
        color: "#ffffff",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0);

    const isHost = session.sessionId === state.hostId;

    const rematch = this.add
      .rectangle(width / 2, height - 70, 240, 52, 0xe31c25)
      .setStrokeStyle(4, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, height - 70, isHost ? "Main Lagi" : "Menunggu host...", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "20px",
        color: "#fff",
      })
      .setOrigin(0.5);

    rematch.on("pointerdown", () => {
      if (!isHost) return;
      sfxClick();
      session.room.send("rematch", {});
    });

    session.room.onStateChange((s) => {
      const phase = (s as { phase?: string }).phase;
      if (phase === "LOBBY") {
        this.scene.start("Lobby");
      }
    });
  }
}
