import type { DirtSystem } from "../logic/DirtSystem";
import type { Tool } from "./Tool";
import { ToolId, type ToolDirtProfile } from "./ToolTypes";
import { WaterStreamVisual } from "../visuals/WaterStreamVisual";

export class WaterStreamTool implements Tool {
  public readonly name: string = "Water Stream";

  private box: Phaser.GameObjects.Rectangle;
  private dirtSystem: DirtSystem;
  private onDirtChanged: () => void;
  private waterVisual: WaterStreamVisual;
  private profile: ToolDirtProfile;

  // Cached from dirtSystem.width/height for convenience.
  private readonly gridWidth: number;
  private readonly gridHeight: number;

  // Half-width of the water beam in grid columns;
  private readonly beamRadiusColumns: number;

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
    dirtSystem: DirtSystem,
    onDirtChanged: () => void
  ) {
    this.box = box;
    this.dirtSystem = dirtSystem;
    this.onDirtChanged = onDirtChanged;
    this.waterVisual = new WaterStreamVisual(box, dirtSystem.height);

    this.gridWidth = dirtSystem.width;
    this.gridHeight = dirtSystem.height;

    // Water stream profile: effective on both, faster on grease
    this.profile = {
      moldRate: 0.8,
      greaseRate: 1.5,
    };

    // Tuning values (tweaks for feel), maybe custom tool setup later
    this.beamRadiusColumns = 30;
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

  /**
   * Find the lowest dirty row by checking all layers.
   * Returns the row where any layer has dirt above threshold.
   */
  private findLowestDirtyRowInCenterColumn(
    centerColumn: number,
    contactRadiusColumns: number
  ): number | null {
    let lowestRow: number | null = null;
    const layers = this.dirtSystem.getAllLayers();

    for (
      let cx = centerColumn - contactRadiusColumns;
      cx <= centerColumn + contactRadiusColumns;
      cx++
    ) {
      if (cx < 0 || cx >= this.gridWidth) continue;

      for (let y = this.gridHeight - 1; y >= 0; y--) {
        // Check if any layer has dirt at this cell
        let hasDirt = false;
        for (const layer of layers) {
          const value = layer.grid.getValue(cx, y);
          if (value > this.dirtThreshold) {
            hasDirt = true;
            break;
          }
        }

        if (hasDirt) {
          if (lowestRow === null || y > lowestRow) {
            lowestRow = y;
          }
          break;
        }
      }
    }

    return lowestRow;
  }

  /**
   * Apply cleaning at the water stream tip using DirtSystem.
   * Uses the beam radius and delegates to DirtSystem.applyAreaClean.
   */
  private applyCleaningAtTip(
    centerColumn: number,
    tipRow: number,
    deltaSeconds: number
  ): void {
    const changed = this.dirtSystem.applyAreaClean(
      ToolId.WaterStream,
      this.profile,
      centerColumn,
      tipRow,
      this.beamRadiusColumns,
      deltaSeconds
    );

    if (changed) {
      this.onDirtChanged();
    }
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
