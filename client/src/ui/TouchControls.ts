import Phaser from "phaser";

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

  constructor(private scene: Phaser.Scene) {
    this.buildButtons();
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
    const { width, height } = this.scene.scale;
    const mk = (
      x: number,
      y: number,
      label: string,
      w: number,
      h: number,
      onDown: () => void,
      onUp: () => void
    ) => {
      const g = this.scene.add.container(x, y).setScrollFactor(0).setDepth(1000);
      const bg = this.scene.add
        .rectangle(0, 0, w, h, 0x1a1a1a, 0.35)
        .setStrokeStyle(3, 0xffffff, 0.55)
        .setInteractive({ useHandCursor: true });
      const t = this.scene.add
        .text(0, 0, label, {
          fontFamily: "Fredoka, sans-serif",
          fontSize: "18px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      g.add([bg, t]);
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
      return g;
    };

    mk(70, height - 70, "◀", 70, 70, () => (this.state.left = true), () => (this.state.left = false));
    mk(150, height - 70, "▶", 70, 70, () => (this.state.right = true), () => (this.state.right = false));
    mk(width - 70, height - 70, "LONCAT", 90, 70, () => {
      this.state.jump = true;
      this.jumpLatched = true;
    }, () => (this.state.jump = false));
    mk(width - 170, height - 70, "PANJAT", 90, 70, () => {
      this.state.climb = true;
      this.climbLatched = true;
    }, () => (this.state.climb = false));
    mk(width - 270, height - 70, "ABILITY", 90, 70, () => {
      this.state.ability = true;
      this.abilityLatched = true;
    }, () => (this.state.ability = false));
  }

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
