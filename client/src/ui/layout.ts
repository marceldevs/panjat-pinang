import Phaser from "phaser";

/** Horizontal center of the current scale size. */
export function cx(scene: Phaser.Scene): number {
  return scene.scale.width / 2;
}

/** Safe-area style padding for HUD / controls. */
export function safePad(scene: Phaser.Scene): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const h = scene.scale.height;
  const w = scene.scale.width;
  return {
    left: Math.max(24, w * 0.02),
    right: Math.max(24, w * 0.02),
    top: Math.max(16, h * 0.02),
    bottom: Math.max(20, h * 0.03),
  };
}

/** Y positions for a vertical stack of menu buttons. */
export function stackedButtonY(
  scene: Phaser.Scene,
  index: number,
  startFrac = 0.48,
  gapFrac = 0.065
): number {
  const { height } = scene.scale;
  return height * startFrac + index * height * gapFrac;
}

/** Bottom control band Y (touch buttons / climb bar). */
export function bottomControlY(scene: Phaser.Scene): number {
  const { height } = scene.scale;
  const pad = safePad(scene);
  return height - pad.bottom - Math.max(40, height * 0.055);
}

/** Touch target size scaled to viewport height. */
export function touchTargetSize(scene: Phaser.Scene, min = 72, frac = 0.09): number {
  return Math.max(min, scene.scale.height * frac);
}

/** Map sim Y-up coordinate to Phaser display Y (climb goes bottom → top). */
export function displayY(simY: number): number {
  return -simY;
}
