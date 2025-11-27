import type { DirtGrid } from "../logic/DirtGrid";
import type { Tool } from "./Tool";

export class WaterStreamTool implements Tool {
  public readonly name: string = "Water Stream";

  private box: Phaser.GameObjects.Rectangle;
  private dirtGrid: DirtGrid;
  private onDirtChanged: () => void;

  // Cached from dirtGrid.width/height for convenience.
  private readonly gridWidth: number;
  private readonly gridHeight: number;

  // Half-width of the water beam in grid columns;
  private readonly beamRadiusColumns: number;

  // How much dirt value is removed per second at the center of the beam (in grid units 0..1).
  private readonly baseCleanAmountPerSecond: number;

  // Values below this are considered "clean" when searching for lowest dirty row.
  private readonly dirtThreshold: number;

  // How quickly beamX follows targetX (0..1 per frame).
  private readonly horizontalFollowLerp: number;

  // True when player is holding the water tool (pointer is down).
  private isActive: boolean;
  // Latest X from pointer, in screen coordinates.
  private targetX: number;
  // Actual X position of the beam (smoothed towards targetX).
  private beamX: number;
  private tipRow: number | null;

  constructor(
    box: Phaser.GameObjects.Rectangle,
    dirtGrid: DirtGrid,
    onDirtChanged: () => void
  ) {
    this.box = box;
    this.dirtGrid = dirtGrid;
    this.onDirtChanged = onDirtChanged;

    this.gridWidth = dirtGrid.width;
    this.gridHeight = dirtGrid.height;

    // Tuning values (tweaks for feel), maybe custom tool setup later
    this.beamRadiusColumns = 30;
    this.baseCleanAmountPerSecond = 5;
    this.dirtThreshold = 0.1;
    this.horizontalFollowLerp = 0.3;

    this.isActive = false;
    this.targetX = 0;
    this.beamX = 0;
    this.tipRow = null;
  }

  private screenXToGridColumn(screenX: number): number | null {
    const bounds = this.box.getBounds();

    if (screenX < bounds.left || screenX > bounds.right) {
      return null;
    }

    const u = (screenX - bounds.left) / bounds.width;
    return Math.floor(u * this.gridWidth);
  }

  private findLowestDirtyRowInCenterColumn(
    centerColumn: number
  ): number | null {
    for (let y = this.gridHeight - 1; y >= 0; y--) {
      const value = this.dirtGrid.getValueAt(centerColumn, y);
      if (value > this.dirtThreshold) {
        return y;
      }
    }
    return null;
  }

  private applyCleaningAtTip(
    centerColumn: number,
    tipRow: number,
    deltaSeconds: number
  ) {
    const beamRadius = this.beamRadiusColumns;

    // Iterate over grid cells in a square around the tip
    for (let y = tipRow - beamRadius; y <= tipRow + beamRadius; y++) {
      if (y < 0 || y >= this.gridHeight) continue;

      for (
        let x = centerColumn - beamRadius;
        x <= centerColumn + beamRadius;
        x++
      ) {
        if (x < 0 || x >= this.gridWidth) continue;
        const dx = x - centerColumn;
        const dy = y - tipRow;
        const distSq = dx * dx + dy * dy;

        // Skip cells outside the beam radius
        if (distSq > beamRadius * beamRadius) continue;

        const distanceFromCenter = Math.sqrt(distSq);
        // Strength falls off linearly from center (1.0) to edge (0.0)
        const strengthFactor = 1 - distanceFromCenter / beamRadius;

        const cleanAmount =
          this.baseCleanAmountPerSecond * strengthFactor * deltaSeconds;

        // apply celaning to the cell?
        this.applyCleanToCell(x, y, cleanAmount);
      }
    }
  }

  private applyCleanToCell(gx: number, gy: number, amount: number): boolean {
    if (gx < 0 || gx >= this.gridWidth || gy < 0 || gy >= this.gridHeight) {
      return false;
    }
    const index = gy * this.gridWidth + gx;
    const before = this.dirtGrid.gridData[index];
    const after = Math.max(0, before - amount);
    this.dirtGrid.gridData[index] = after;
    if (after !== before) {
      this.onDirtChanged();
      return true;
    }
    return false;
  }

  public onPointerDown(): void {
    this.isActive = true;
  }

  public onPointerUp(): void {
    this.isActive = false;
  }

  public onPointer(x: number): void {
    this.targetX = x;
  }

  public update(dt: number): void {
    const deltaSeconds = dt / 1000;

    if (!this.isActive) return;

    this.beamX += (this.targetX - this.beamX) * this.horizontalFollowLerp;

    const centerColumn = this.screenXToGridColumn(this.beamX);
    if (centerColumn === null) return;

    const targetTipRow = this.findLowestDirtyRowInCenterColumn(centerColumn);
    if (targetTipRow === null) return;

    this.tipRow = targetTipRow;
    const roundedTipRow = Math.round(this.tipRow);
    this.applyCleaningAtTip(centerColumn, roundedTipRow, deltaSeconds);
  }
}
