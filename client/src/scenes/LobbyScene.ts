import Phaser from "phaser";
import { getActiveSession, setActiveSession } from "../net/connection";
import { sfxClick, sfxAnnounce } from "../audio/sfx";
import { cx } from "../ui/layout";

export class LobbyScene extends Phaser.Scene {
  private listText!: Phaser.GameObjects.Text;
  private codeText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private ready = false;
  private readyBtn!: Phaser.GameObjects.Rectangle;
  private readyLabel!: Phaser.GameObjects.Text;
  private startBtn!: Phaser.GameObjects.Rectangle;
  private title!: Phaser.GameObjects.Text;
  private leave!: Phaser.GameObjects.Text;
  private startLabel!: Phaser.GameObjects.Text;

  constructor() {
    super("Lobby");
  }

  create() {
    const session = getActiveSession();
    if (!session) {
      this.scene.start("Home");
      return;
    }

    this.cameras.main.setBackgroundColor("#9fd4a5");
    this.buildUi();
    this.scale.on("resize", this.layout, this);

    this.readyBtn.on("pointerdown", () => {
      this.ready = !this.ready;
      sfxClick();
      session.room.send("ready", { ready: this.ready });
      this.readyLabel.setText(this.ready ? "Cancel" : "Ready");
      this.readyBtn.setFillStyle(this.ready ? 0xe9c46a : 0x457b9d);
    });

    this.startBtn.on("pointerdown", () => {
      sfxClick();
      session.room.send("start", {});
    });

    this.leave.on("pointerdown", async () => {
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

    this.events.on("update", () => {
      const phase = (session.room.state as { phase?: string }).phase;
      if (phase === "COUNTDOWN" || phase === "PLAYING") {
        this.scene.start("Game");
      }
    });
  }

  private buildUi() {
    const { width, height } = this.scale;
    const mid = cx(this);

    this.title = this.add
      .text(mid, height * 0.06, "LOBI", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: `${Math.max(32, Math.round(height * 0.055))}px`,
        color: "#e31c25",
        stroke: "#fff",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.codeText = this.add
      .text(mid, height * 0.16, `Kode: ...`, {
        fontFamily: "Fredoka, sans-serif",
        fontSize: `${Math.max(36, Math.round(height * 0.065))}px`,
        color: "#1a1a1a",
        backgroundColor: "#ffffff",
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5);

    this.listText = this.add
      .text(mid, height * 0.32, "", {
        fontFamily: "Nunito, sans-serif",
        fontSize: `${Math.max(16, Math.round(height * 0.026))}px`,
        color: "#1a1a1a",
        align: "center",
      })
      .setOrigin(0.5, 0);

    this.statusText = this.add
      .text(mid, height * 0.78, "Menunggu pemain...", {
        fontFamily: "Nunito, sans-serif",
        fontSize: `${Math.max(14, Math.round(height * 0.018))}px`,
        color: "#333",
      })
      .setOrigin(0.5);

    const btnW = Math.min(200, width * 0.18);
    const btnH = Math.max(48, height * 0.055);
    const by = height * 0.9;

    this.readyBtn = this.add
      .rectangle(mid - btnW * 0.65, by, btnW, btnH, 0x457b9d)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.readyLabel = this.add
      .text(mid - btnW * 0.65, by, "Ready", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: `${Math.max(18, Math.round(btnH * 0.4))}px`,
        color: "#fff",
      })
      .setOrigin(0.5);

    this.startBtn = this.add
      .rectangle(mid + btnW * 0.65, by, btnW, btnH, 0xe31c25)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.startLabel = this.add
      .text(mid + btnW * 0.65, by, "Mulai", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: `${Math.max(18, Math.round(btnH * 0.4))}px`,
        color: "#fff",
      })
      .setOrigin(0.5);

    this.leave = this.add
      .text(width * 0.04, height * 0.05, "← Keluar", {
        fontFamily: "Nunito, sans-serif",
        fontSize: `${Math.max(16, Math.round(height * 0.022))}px`,
        color: "#1a1a1a",
      })
      .setInteractive({ useHandCursor: true });
  }

  private layout = () => {
    const { width, height } = this.scale;
    const mid = cx(this);
    const btnW = Math.min(200, width * 0.18);
    const btnH = Math.max(48, height * 0.055);
    const by = height * 0.9;

    this.title.setPosition(mid, height * 0.06);
    this.codeText.setPosition(mid, height * 0.16);
    this.listText.setPosition(mid, height * 0.32);
    this.statusText.setPosition(mid, height * 0.78);
    this.readyBtn.setPosition(mid - btnW * 0.65, by).setSize(btnW, btnH);
    this.readyLabel.setPosition(mid - btnW * 0.65, by);
    this.startBtn.setPosition(mid + btnW * 0.65, by).setSize(btnW, btnH);
    this.startLabel.setPosition(mid + btnW * 0.65, by);
    this.leave.setPosition(width * 0.04, height * 0.05);
  };

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
