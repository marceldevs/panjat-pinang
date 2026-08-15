import Phaser from "phaser";
import { getActiveSession, setActiveSession } from "../net/connection";
import { sfxClick, sfxAnnounce } from "../audio/sfx";

export class LobbyScene extends Phaser.Scene {
  private listText!: Phaser.GameObjects.Text;
  private codeText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private ready = false;

  constructor() {
    super("Lobby");
  }

  create() {
    const session = getActiveSession();
    if (!session) {
      this.scene.start("Home");
      return;
    }

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#9fd4a5");

    this.add
      .text(width / 2, 40, "LOBI", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "36px",
        color: "#e31c25",
        stroke: "#fff",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.codeText = this.add
      .text(width / 2, 90, `Kode: ${session.roomCode || "..."}`, {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "42px",
        color: "#1a1a1a",
        backgroundColor: "#ffffff",
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5);

    this.listText = this.add
      .text(width / 2, 200, "", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "18px",
        color: "#1a1a1a",
        align: "center",
      })
      .setOrigin(0.5, 0);

    this.statusText = this.add
      .text(width / 2, height - 120, "Menunggu pemain...", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "14px",
        color: "#333",
      })
      .setOrigin(0.5);

    const readyBtn = this.add
      .rectangle(width / 2 - 100, height - 60, 160, 48, 0x457b9d)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const readyLabel = this.add
      .text(width / 2 - 100, height - 60, "Ready", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "20px",
        color: "#fff",
      })
      .setOrigin(0.5);

    readyBtn.on("pointerdown", () => {
      this.ready = !this.ready;
      sfxClick();
      session.room.send("ready", { ready: this.ready });
      readyLabel.setText(this.ready ? "Cancel" : "Ready");
      readyBtn.setFillStyle(this.ready ? 0xe9c46a : 0x457b9d);
    });

    const startBtn = this.add
      .rectangle(width / 2 + 100, height - 60, 160, 48, 0xe31c25)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2 + 100, height - 60, "Mulai", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "20px",
        color: "#fff",
      })
      .setOrigin(0.5);

    startBtn.on("pointerdown", () => {
      sfxClick();
      session.room.send("start", {});
    });

    const leave = this.add
      .text(40, 30, "← Keluar", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "16px",
        color: "#1a1a1a",
      })
      .setInteractive({ useHandCursor: true });
    leave.on("pointerdown", async () => {
      await session.room.leave();
      setActiveSession(null);
      this.scene.start("Home");
    });

    session.room.onMessage("announce", (msg: { message?: string }) => {
      if (msg.message) {
        sfxAnnounce();
        this.statusText.setText(msg.message);
      }
    });

    session.room.onMessage("error", (msg: { message?: string }) => {
      this.statusText.setText(msg.message || "Error");
    });

    session.room.onStateChange(() => this.refresh());
    this.refresh();

    // Transition when match starts
    this.events.on("update", () => {
      const phase = (session.room.state as { phase?: string }).phase;
      if (phase === "COUNTDOWN" || phase === "PLAYING") {
        this.scene.start("Game");
      }
    });
  }

  private refresh() {
    const session = getActiveSession();
    if (!session) return;
    const state = session.room.state as {
      roomCode?: string;
      hostId?: string;
      players?: Map<string, { name: string; ready: boolean; isHost: boolean }>;
    };
    if (state.roomCode) {
      session.roomCode = state.roomCode;
      this.codeText.setText(`Kode: ${state.roomCode}`);
    }

    const lines: string[] = [];
    const players = state.players;
    if (players) {
      players.forEach((p, id) => {
        const host = p.isHost || id === state.hostId ? " 👑" : "";
        const ready = p.ready ? "✅" : "⏳";
        lines.push(`${ready} ${p.name}${host}`);
      });
    }
    this.listText.setText(lines.join("\n") || "Belum ada pemain");
    this.statusText.setText(
      `${lines.length}/8 pemain · Host tekan Mulai (min 2, semua ready)`
    );
  }
}
