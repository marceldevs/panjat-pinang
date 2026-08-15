import Phaser from "phaser";
import { bottomControlY, safePad, touchTargetSize } from "./layout";

export interface TouchControlsState {
  left: boolean;
  right: boolean;
  jump: boolean;
  climb: boolean;
  ability: boolean;
}

export class TouchControls {
  state: TouchControlsState = {
    left: false,
    right: false,
    jump: false,
    climb: false,
    ability: false,
  };

  private jumpLatched = false;
  private climbLatched = false;
  private abilityLatched = false;
  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    jump: Phaser.Input.Keyboard.Key;
    climb: Phaser.Input.Keyboard.Key;
    ability: Phaser.Input.Keyboard.Key;
  };
  private buttons: Phaser.GameObjects.Container[] = [];

  constructor(private scene: Phaser.Scene) {
    this.buildButtons();
    scene.scale.on("resize", this.layout, this);
    if (scene.input.keyboard) {
      this.keys = {
        left: scene.input.keyboard.addKey("A"),
        right: scene.input.keyboard.addKey("D"),
        jump: scene.input.keyboard.addKey("W"),
        climb: scene.input.keyboard.addKey("SPACE"),
        ability: scene.input.keyboard.addKey("E"),
      };
      scene.input.keyboard.addKey("LEFT");
      scene.input.keyboard.addKey("RIGHT");
      scene.input.keyboard.addKey("UP");
    }
  }

  private buildButtons() {
    const mk = (
      label: string,
      w: number,
      h: number,
      onDown: () => void,
      onUp: () => void
    ) => {
      const g = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(1000);
      const bg = this.scene.add
        .rectangle(0, 0, w, h, 0x1a1a1a, 0.35)
        .setStrokeStyle(3, 0xffffff, 0.55)
        .setInteractive({ useHandCursor: true });
      const t = this.scene.add
        .text(0, 0, label, {
          fontFamily: "Fredoka, sans-serif",
          fontSize: `${Math.max(16, Math.round(h * 0.28))}px`,
          color: "#ffffff",
        })
        .setOrigin(0.5);
      g.add([bg, t]);
      g.setData("bg", bg);
      g.setData("w", w);
      g.setData("h", h);
      bg.on("pointerdown", (p: Phaser.Input.Pointer) => {
        p.event.stopPropagation();
        onDown();
        bg.setFillStyle(0xe31c25, 0.55);
      });
      const up = () => {
        onUp();
        bg.setFillStyle(0x1a1a1a, 0.35);
      };
      bg.on("pointerup", up);
      bg.on("pointerout", up);
      bg.on("pointerupoutside", up);
      this.buttons.push(g);
      return g;
    };

    const size = touchTargetSize(this.scene);
    const wide = Math.max(size + 20, this.scene.scale.width * 0.08);
    mk("◀", size, size, () => (this.state.left = true), () => (this.state.left = false));
    mk("▶", size, size, () => (this.state.right = true), () => (this.state.right = false));
    mk(
      "LONCAT",
      wide,
      size,
      () => {
        this.state.jump = true;
        this.jumpLatched = true;
      },
      () => (this.state.jump = false)
    );
    mk(
      "PANJAT",
      wide,
      size,
      () => {
        this.state.climb = true;
        this.climbLatched = true;
      },
      () => (this.state.climb = false)
    );
    mk(
      "ABILITY",
      wide,
      size,
      () => {
        this.state.ability = true;
        this.abilityLatched = true;
      },
      () => (this.state.ability = false)
    );
    this.layout();
  }

  private layout = () => {
    const pad = safePad(this.scene);
    const y = bottomControlY(this.scene);
    const size = touchTargetSize(this.scene);
    const wide = Math.max(size + 20, this.scene.scale.width * 0.08);
    const gap = size * 0.15;
    const { width } = this.scene.scale;

    const [left, right, jump, climb, ability] = this.buttons;
    if (!left || !right || !jump || !climb || !ability) return;

    const resizeBtn = (btn: Phaser.GameObjects.Container, w: number, h: number) => {
      const bg = btn.getData("bg") as Phaser.GameObjects.Rectangle;
      bg.setSize(w, h);
      bg.setDisplaySize(w, h);
      const text = btn.list[1] as Phaser.GameObjects.Text;
      text.setFontSize(Math.max(16, Math.round(h * 0.28)));
    };

    resizeBtn(left, size, size);
    resizeBtn(right, size, size);
    resizeBtn(jump, wide, size);
    resizeBtn(climb, wide, size);
    resizeBtn(ability, wide, size);

    left.setPosition(pad.left + size / 2, y);
    right.setPosition(pad.left + size * 1.5 + gap, y);
    jump.setPosition(width - pad.right - wide / 2, y);
    climb.setPosition(width - pad.right - wide * 1.5 - gap, y);
    ability.setPosition(width - pad.right - wide * 2.5 - gap * 2, y);
  };

  consumeJump(): boolean {
    const kb =
      this.keys &&
      (Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
        Phaser.Input.Keyboard.JustDown(this.scene.input.keyboard!.addKey("UP")));
    const v = this.jumpLatched || !!kb;
    this.jumpLatched = false;
    return v;
  }

  consumeClimb(): boolean {
    const kb = this.keys && Phaser.Input.Keyboard.JustDown(this.keys.climb);
    const v = this.climbLatched || !!kb;
    this.climbLatched = false;
    return v;
  }

  consumeAbility(): boolean {
    const kb = this.keys && Phaser.Input.Keyboard.JustDown(this.keys.ability);
    const v = this.abilityLatched || !!kb;
    this.abilityLatched = false;
    return v;
  }

  leftDown(): boolean {
    const kb =
      this.keys &&
      (this.keys.left.isDown ||
        this.scene.input.keyboard!.addKey("LEFT").isDown);
    return this.state.left || !!kb;
  }

  rightDown(): boolean {
    const kb =
      this.keys &&
      (this.keys.right.isDown ||
        this.scene.input.keyboard!.addKey("RIGHT").isDown);
    return this.state.right || !!kb;
  }
}
