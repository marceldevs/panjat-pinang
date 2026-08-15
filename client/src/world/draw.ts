import Phaser from "phaser";
import { CONFIG, poleX, PLAYER_COLORS } from "@panjat/shared";

const POLE_TOP = CONFIG.prizeHeight * CONFIG.metersToPixels + 80;

export function drawKampungBackground(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setScrollFactor(0).setDepth(-100);
  // sky gradient bands
  g.fillStyle(0x7ec8e3, 1);
  g.fillRect(0, 0, 960, 220);
  g.fillStyle(0x9fd4a5, 1);
  g.fillRect(0, 220, 960, 200);
  g.fillStyle(0xc4a574, 1);
  g.fillRect(0, 420, 960, 140);

  // distant hills
  const hills = scene.add.graphics().setScrollFactor(0.05).setDepth(-90);
  hills.fillStyle(0x3d8b6e, 1);
  hills.fillEllipse(200, 360, 420, 160);
  hills.fillEllipse(620, 370, 500, 180);
  hills.fillEllipse(900, 350, 300, 140);

  // umbul-umbul (red-white streamers)
  for (let i = 0; i < 8; i++) {
    const x = 60 + i * 120;
    const flag = scene.add.graphics().setScrollFactor(0.15).setDepth(-80);
    flag.lineStyle(3, 0x6b4226, 1);
    flag.lineBetween(x, 280, x, 360);
    for (let j = 0; j < 5; j++) {
      flag.fillStyle(j % 2 === 0 ? 0xe31c25 : 0xffffff, 1);
      flag.fillTriangle(x, 285 + j * 12, x + 28, 290 + j * 12, x, 297 + j * 12);
    }
  }

  // ground strip (scrolls with world y=0)
  const ground = scene.add.rectangle(
    CONFIG.worldWidth / 2,
    -20,
    CONFIG.worldWidth + 200,
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
    const pole = scene.add.rectangle(x, POLE_TOP / 2, CONFIG.poleRadius * 2, POLE_TOP, color);
    pole.setData("poleIndex", i);
    c.add(pole);
    // base
    c.add(scene.add.rectangle(x, -10, 40, 18, 0x5c4033));
  }
  // prize bundle at top
  for (let i = 0; i < CONFIG.poleCount; i++) {
    const x = poleX(i);
    const prize = scene.add.container(x, POLE_TOP);
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
