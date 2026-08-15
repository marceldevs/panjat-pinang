import Phaser from "phaser";
import { getActiveSession } from "../net/connection";
import { sfxClick, sfxWin } from "../audio/sfx";
import { spawnConfetti } from "../world/draw";
import { cx } from "../ui/layout";

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

    this.cameras.main.setBackgroundColor("#1b7a4e");
    spawnConfetti(this);
    sfxWin();

    const { width, height } = this.scale;
    const mid = cx(this);

    this.add
      .text(mid, height * 0.08, "HASIL", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: `${Math.max(36, Math.round(height * 0.06))}px`,
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
      .text(mid, height * 0.18, winner ? `${winner.name} juara!` : "Selesai", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: `${Math.max(24, Math.round(height * 0.04))}px`,
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
      .text(mid, height * 0.28, lines.join("\n"), {
        fontFamily: "Nunito, sans-serif",
        fontSize: `${Math.max(16, Math.round(height * 0.026))}px`,
        color: "#ffffff",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0);

    const isHost = session.sessionId === state.hostId;
    const btnW = Math.min(320, width * 0.3);
    const btnH = Math.max(52, height * 0.055);
    const by = height * 0.88;

    const rematch = this.add
      .rectangle(mid, by, btnW, btnH, 0xe31c25)
      .setStrokeStyle(4, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(mid, by, isHost ? "Main Lagi" : "Menunggu host...", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: `${Math.max(18, Math.round(btnH * 0.38))}px`,
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
