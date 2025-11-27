import { DirtGrid } from "../logic/DirtGrid";
import type { Tool } from "./Tool";

export class BrushTool implements Tool {
  public readonly name: string = "Brush";

  private box: Phaser.GameObjects.Rectangle;
  private dirtGrid: DirtGrid;
  private onDirtChanged: () => void;

  public readonly toolRadius: number = 10;
  public readonly cleanRadius: number = 20;

  constructor(
    box: Phaser.GameObjects.Rectangle,
    dirtGrid: DirtGrid,
    onDirtChanged: () => void
  ) {
    this.box = box;
    this.dirtGrid = dirtGrid;
    this.onDirtChanged = onDirtChanged;
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

  public onPointer(x: number, y: number): void {
    const localCoordinates = this.pointerToLocalOnBox(x, y, this.toolRadius);
    if (!localCoordinates) return; // Pointer is outside the expanded hitzone

    const { u, v } = localCoordinates;

    const gridX = Math.floor(u * this.dirtGrid.width);
    const gridY = Math.floor(v * this.dirtGrid.height);
    this.dirtGrid.cleanArea(gridX, gridY, this.cleanRadius);
    this.onDirtChanged();
  }
}
