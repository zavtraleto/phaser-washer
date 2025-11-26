import type { Tool } from "../tools/Tool";

export class StrokeInput {
  private scene: Phaser.Scene;
  private currentTool: Tool;
  private isInputActive: boolean = false;
  private lastPoint: Phaser.Math.Vector2 | null = null;

  constructor(scene: Phaser.Scene, currentTool: Tool) {
    this.scene = scene;
    this.currentTool = currentTool;
    this.setupInputEvents();
  }

  private setupInputEvents() {
    this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.isInputActive = true;
      this.lastPoint = null;
      this.currentTool.onPointerDown?.();
      this.processStroke(pointer.x, pointer.y);
    });

    this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.isInputActive) {
        this.processStroke(pointer.x, pointer.y);
      }
    });

    this.scene.input.on("pointerup", () => {
      this.isInputActive = false;
      this.lastPoint = null;
      this.currentTool.onPointerUp?.();
    });
  }

  private processStroke(x: number, y: number) {
    if (!this.lastPoint) {
      this.lastPoint = new Phaser.Math.Vector2(x, y);
      this.currentTool.onPointer(x, y);
      return;
    }

    const dist = this.lastPoint.distance({ x, y } as Phaser.Math.Vector2);
    const step = 5; // pixels between stamps

    if (dist <= step) {
      this.currentTool.onPointer(x, y);
    } else {
      const stepsCount = Math.ceil(dist / step);
      const startX = this.lastPoint.x;
      const startY = this.lastPoint.y;

      for (let i = 1; i <= stepsCount; i++) {
        const t = i / stepsCount;
        const currentX = startX + (x - startX) * t;
        const currentY = startY + (y - startY) * t;

        this.currentTool.onPointer(currentX, currentY);
      }
    }

    this.lastPoint.set(x, y);
  }
}
