import type { DirtGrid } from "../logic/DirtGrid";
import type { Tool } from "./Tool";
import { WaterStreamVisual } from "../visuals/WaterStreamVisual";

export class WaterStreamTool implements Tool {
  public readonly name: string = "Water Stream";

  private box: Phaser.GameObjects.Rectangle;
  private dirtGrid: DirtGrid;
  private onDirtChanged: () => void;
  private waterVisual: WaterStreamVisual;

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

  private contactRadiusColumns: number;
  private maxTipSpeedRowsPerSecond: number;

  constructor(
    box: Phaser.GameObjects.Rectangle,
    dirtGrid: DirtGrid,
    onDirtChanged: () => void
  ) {
    this.box = box;
    this.dirtGrid = dirtGrid;
    this.onDirtChanged = onDirtChanged;
    this.waterVisual = new WaterStreamVisual(box, dirtGrid.height);

    this.gridWidth = dirtGrid.width;
    this.gridHeight = dirtGrid.height;

    // Tuning values (tweaks for feel), maybe custom tool setup later
    this.beamRadiusColumns = 30;
    this.baseCleanAmountPerSecond = 5;
    this.dirtThreshold = 0.1;
    this.horizontalFollowLerp = 0.15;
    this.contactRadiusColumns = 5;
    this.maxTipSpeedRowsPerSecond = 2000;

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
    centerColumn: number,
    contactRadiusColumns: number
  ): number | null {
    let lowestRow: number | null = null;

    for (
      let cx = centerColumn - contactRadiusColumns;
      cx <= centerColumn + contactRadiusColumns;
      cx++
    ) {
      if (cx < 0 || cx >= this.gridWidth) continue;

      for (let y = this.gridHeight - 1; y >= 0; y--) {
        const value = this.dirtGrid.getValueAt(cx, y);
        if (value > this.dirtThreshold) {
          if (lowestRow === null || y > lowestRow) {
            lowestRow = y;
          }
          break;
        }
      }
    }

    return lowestRow;
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

  public onPointerDown(x?: number): void {
    this.isActive = true;

    if (typeof x === "number") {
      this.targetX = x;
      this.beamX = x;
    } else {
      // fallback: если StrokeInput вызывает onPointerDown без координат,
      // то beamX всё равно сразу ставим в targetX
      this.beamX = this.targetX;
    }
  }

  public onPointerUp(): void {
    this.isActive = false;
  }

  public onPointer(x: number): void {
    this.targetX = x;
  }

  public update(dt: number): void {
    const deltaSeconds = dt / 1000;

    if (!this.isActive) {
      this.waterVisual.redraw(null, null, null);
      return;
    }

    // horizontal inertia
    this.beamX += (this.targetX - this.beamX) * this.horizontalFollowLerp;

    const centerColumn = this.screenXToGridColumn(this.beamX);
    if (centerColumn === null) {
      this.waterVisual.redraw(this.targetX, this.beamX, null);
      return;
    }

    // Find the lowest dirty row only in the central strip
    const targetTipRow = this.findLowestDirtyRowInCenterColumn(
      centerColumn,
      this.contactRadiusColumns
    );

    if (targetTipRow === null) {
      // No dirt in this strip – DO NOT CLEAN ANYTHING,
      // but continue drawing the stream, conditionally to the "sole" of the object.
      const fallbackRow = 0; // or 0, or the last tipRow
      this.tipRow = fallbackRow;
      this.waterVisual.redraw(this.targetX, this.beamX, fallbackRow);
      return;
    }

    // Inertia for tipRow (corrected version)
    if (this.tipRow === null) {
      this.tipRow = targetTipRow;
    } else {
      const maxSpeedPerFrame = this.maxTipSpeedRowsPerSecond * deltaSeconds;
      const deltaRow = targetTipRow - this.tipRow;

      if (Math.abs(deltaRow) <= maxSpeedPerFrame) {
        this.tipRow = targetTipRow;
      } else {
        this.tipRow += Math.sign(deltaRow) * maxSpeedPerFrame;
      }
    }

    const roundedTipRow = Math.round(this.tipRow);

    // Clean only when there is actually dirt
    this.applyCleaningAtTip(centerColumn, roundedTipRow, deltaSeconds);

    // Visual – ALWAYS, while isActive = true
    this.waterVisual.redraw(this.targetX, this.beamX, roundedTipRow);
  }
}
