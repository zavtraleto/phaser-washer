import { DirtGrid } from "../logic/DirtGrid";
import { DirtVisual } from "../visuals/DirtVisual";

export class GameScene extends Phaser.Scene {
  private box!: Phaser.GameObjects.Rectangle;
  private overlay!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private dirtGrid!: DirtGrid;
  private dirtVisual!: DirtVisual;

  private isInputActive: boolean = false;
  private lastPoint: Phaser.Math.Vector2 | null = null;

  // flag to indicate dirt visual needs redraw
  private dirtNeedsRedraw: boolean = true;

  // Time when spray overlay should be cleared (in ms)
  private sprayClearTime: number = 0;

  private readonly toolRadius: number = 10;
  private readonly cleanRadius: number = 20;

  constructor() {
    super("GameScene");
  }

  preload() {
    // Load assets here
  }

  create() {
    const { width, height } = this.scale;

    this.box = this.add.rectangle(width / 2, height / 2, 300, 150, 0x00ff00);

    // create a logical dirt grid
    this.dirtGrid = new DirtGrid(256, 256);

    // vreate a visual dirt grid
    this.dirtVisual = new DirtVisual(this, this.box, this.dirtGrid);

    // Overlay graphics for spray effect
    this.overlay = this.add.graphics();
    this.overlay.setDepth(5);

    this.hudText = this.add.text(16, 16, "Clean: 0%", {
      fontSize: "20px",
      color: "#ffffff",
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.isInputActive = true;
      this.lastPoint = null;
      this.processStroke(pointer.x, pointer.y);
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.isInputActive) {
        this.processStroke(pointer.x, pointer.y);
      }
    });

    this.input.on("pointerup", () => {
      this.isInputActive = false;
      this.lastPoint = null;
    });
  }

  //this method used for visual feedback only, deprecated for now
  private spray(x: number, y: number) {
    this.overlay.fillStyle(0x0000ff, 0.02);
    this.overlay.fillCircle(x, y, this.toolRadius);
  }

  private processStroke(x: number, y: number) {
    if (!this.lastPoint) {
      this.lastPoint = new Phaser.Math.Vector2(x, y);
      this.handlePointer(x, y);
      return;
    }

    const dist = this.lastPoint.distance({ x, y } as Phaser.Math.Vector2);
    const step = 5; // pixels between stamps

    if (dist <= step) {
      this.handlePointer(x, y);
    } else {
      const stepsCount = Math.ceil(dist / step);
      const startX = this.lastPoint.x;
      const startY = this.lastPoint.y;

      for (let i = 1; i <= stepsCount; i++) {
        const t = i / stepsCount;
        const currentX = startX + (x - startX) * t;
        const currentY = startY + (y - startY) * t;

        this.handlePointer(currentX, currentY);
      }
    }

    this.lastPoint.set(x, y);
  }

  // Convert pointer position to local box coordinates (u, v) ranging from 0 to 1
  // toolRadius expands the hitzone so players can clean edges even when pointer is outside the box
  private pointerToLocalOnBox(
    pointerX: number,
    pointerY: number,
    toolRadius: number
  ): { u: number; v: number } | null {
    const left = this.box.x - this.box.width / 2;
    const right = this.box.x + this.box.width / 2;
    const top = this.box.y - this.box.height / 2;
    const bottom = this.box.y + this.box.height / 2;

    // Expand hitzone by tool radius - allows cleaning edges when tool overlaps them
    const expandedLeft = left - toolRadius;
    const expandedRight = right + toolRadius;
    const expandedTop = top - toolRadius;
    const expandedBottom = bottom + toolRadius;

    // Reject pointer if it's outside the expanded hitzone
    if (pointerX < expandedLeft || pointerX > expandedRight) return null;
    if (pointerY < expandedTop || pointerY > expandedBottom) return null;

    // Clamp u,v to 0-1 so pointer outside box still maps to valid edge coordinates
    const u = Math.max(0, Math.min(1, (pointerX - left) / this.box.width));
    const v = Math.max(0, Math.min(1, (pointerY - top) / this.box.height));
    return { u, v };
  }

  private handlePointer(x: number, y: number) {
    const localCoordinates = this.pointerToLocalOnBox(x, y, this.toolRadius);
    if (!localCoordinates) return; // Pointer is outside the expanded hitzone

    const { u, v } = localCoordinates;

    const gridX = Math.floor(u * this.dirtGrid.width);
    const gridY = Math.floor(v * this.dirtGrid.height);
    this.dirtGrid.cleanArea(gridX, gridY, this.cleanRadius);
    this.dirtNeedsRedraw = true;
  }

  update(time: number, delta: number) {
    // Game loop logic here
    const cleanPercentage = this.dirtGrid.getCleanPercent();
    const cleanPercentageForUI = Math.round(cleanPercentage * 10) / 10;

    // redraw dirt visual if needed
    if (this.dirtNeedsRedraw) {
      this.dirtVisual.redrawFromDirtGrid();
      this.dirtNeedsRedraw = false;
    }

    // counting cleanannes percentage
    if (this.dirtGrid.getCleanPercent() >= 100) {
      this.hudText.setText("Clean: 100% - Done!");
    } else {
      this.hudText.setText(`Clean: ${cleanPercentageForUI}%`);
    }
  }
}
