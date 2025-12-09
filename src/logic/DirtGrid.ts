/**
 * Low-level container for scalar dirt values (0..1 per cell).
 * No game logic here - just storage and basic accessors.
 */
export class DirtGrid {
  readonly width: number;
  readonly height: number;
  private gridData: Float32Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.gridData = new Float32Array(width * height);
  }

  /** Fill entire grid with a single value */
  public fill(value: number): void {
    this.gridData.fill(Math.max(0, Math.min(1, value)));
  }

  /** Get dirt value at (x, y). Returns 0 if out of bounds. */
  public getValue(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return 0;
    }
    return this.gridData[y * this.width + x];
  }

  /** Set dirt value at (x, y), clamped to [0, 1]. No-op if out of bounds. */
  public setValue(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    this.gridData[y * this.width + x] = Math.max(0, Math.min(1, value));
  }

  /** Average dirt value across all cells (0..1) */
  public getAverageValue(): number {
    let sum = 0;
    for (let i = 0; i < this.gridData.length; i++) {
      sum += this.gridData[i];
    }
    return sum / this.gridData.length;
  }

  /** Clean percentage: (1 - averageValue) * 100 */
  public getCleanPercent(): number {
    return (1 - this.getAverageValue()) * 100;
  }
}
