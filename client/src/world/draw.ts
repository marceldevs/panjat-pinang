import Phaser from "phaser";
import { CONFIG, poleX, PLAYER_COLORS } from "@panjat/shared";
import { displayY } from "../ui/layout";

const POLE_TOP = CONFIG.prizeHeight * CONFIG.metersToPixels + 80;

export function drawKampungBackground(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  const g = scene.add.graphics().setScrollFactor(0).setDepth(-100);
  // sky → mid → ground bands across full viewport
  g.fillStyle(0x7ec8e3, 1);
  g.fillRect(0, 0, width, height * 0.4);
  g.fillStyle(0x9fd4a5, 1);
  g.fillRect(0, height * 0.4, width, height * 0.35);
  g.fillStyle(0xc4a574, 1);
  g.fillRect(0, height * 0.75, width, height * 0.25);

  // distant hills
  const hills = scene.add.graphics().setScrollFactor(0.05).setDepth(-90);
  hills.fillStyle(0x3d8b6e, 1);
  hills.fillEllipse(width * 0.2, height * 0.68, width * 0.45, height * 0.3);
  hills.fillEllipse(width * 0.65, height * 0.7, width * 0.52, height * 0.33);
  hills.fillEllipse(width * 0.95, height * 0.66, width * 0.32, height * 0.26);

  // umbul-umbul (red-white streamers)
  const flagCount = Math.max(8, Math.floor(width / 180));
  for (let i = 0; i < flagCount; i++) {
    const x = width * 0.06 + i * (width / flagCount);
    const flag = scene.add.graphics().setScrollFactor(0.15).setDepth(-80);
    const baseY = height * 0.52;
    flag.lineStyle(3, 0x6b4226, 1);
    flag.lineBetween(x, baseY, x, baseY + height * 0.15);
    for (let j = 0; j < 5; j++) {
      flag.fillStyle(j % 2 === 0 ? 0xe31c25 : 0xffffff, 1);
      flag.fillTriangle(
        x,
        baseY + 5 + j * 12,
        x + 28,
        baseY + 10 + j * 12,
        x,
        baseY + 17 + j * 12
      );
    }
  }

  // ground strip near sim y=0 (display y=0); scrolls with world
  const ground = scene.add.rectangle(
    CONFIG.worldWidth / 2,
    20,
    CONFIG.worldWidth + 400,
    80,
    0xb08968
  );
  ground.setDepth(-20);
}

export function drawPoles(scene: Phaser.Scene, oiled: Set<number>): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0).setDepth(-10);
  for (let i = 0; i < CONFIG.poleCount; i++) {
    const x = poleX(i);
    const color = oiled.has(i) ? 0xc9a227 : 0x8b5a2b;
    // Pole extends upward (negative display Y) from ground
    const pole = scene.add.rectangle(
      x,
      displayY(POLE_TOP / 2),
      CONFIG.poleRadius * 2,
      POLE_TOP,
      color
    );
    pole.setData("poleIndex", i);
    c.add(pole);
    // base near ground
    c.add(scene.add.rectangle(x, 10, 40, 18, 0x5c4033));
  }
  // prize bundle at top of climb
  for (let i = 0; i < CONFIG.poleCount; i++) {
    const x = poleX(i);
    const prize = scene.add.container(x, displayY(POLE_TOP));
    prize.add(scene.add.circle(0, 0, 16, 0xe31c25));
    prize.add(scene.add.circle(0, 0, 10, 0xffffff));
    prize.add(
      scene.add
        .text(0, -22, "🎁", { fontSize: "16px" })
        .setOrigin(0.5)
    );
    c.add(prize);
  }
  return c;
}

export function playerColor(index: number): number {
  return PLAYER_COLORS[index % PLAYER_COLORS.length]!;
}

export function makePlayerSprite(
  scene: Phaser.Scene,
  colorIndex: number,
  name: string
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const body = scene.add.circle(0, 0, CONFIG.playerRadius, playerColor(colorIndex));
  body.setStrokeStyle(3, 0xffffff, 0.85);
  const face = scene.add.circle(4, -4, 4, 0x111111);
  const label = scene.add
    .text(0, -CONFIG.playerRadius - 14, name, {
      fontFamily: "Nunito, sans-serif",
      fontSize: "12px",
      color: "#1a1a1a",
      backgroundColor: "#ffffffaa",
      padding: { x: 4, y: 2 },
    })
    .setOrigin(0.5);
  c.add([body, face, label]);
  c.setData("body", body);
  return c;
}

export function spawnConfetti(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * width;
    const y = -20 - Math.random() * 80;
    const color = Math.random() > 0.5 ? 0xe31c25 : 0xffffff;
    const bit = scene.add
      .rectangle(x, y, 6 + Math.random() * 8, 4 + Math.random() * 6, color)
      .setScrollFactor(0)
      .setDepth(2000)
      .setRotation(Math.random() * Math.PI);
    scene.tweens.add({
      targets: bit,
      y: height + 40,
      x: x + (Math.random() - 0.5) * 160,
      rotation: bit.rotation + Math.PI * 4,
      duration: 1800 + Math.random() * 1400,
      ease: "Sine.easeIn",
      onComplete: () => bit.destroy(),
    });
  }
}
