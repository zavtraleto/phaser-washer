export class DirtGrid {
  width: number;
  height: number;
  gridData: Float32Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.gridData = new Float32Array(width * height);
    this.initializeGrid(1);
  }

  private initializeGrid(value: number) {
    this.gridData.fill(value);
  }

  public cleanArea(gx: number, gy: number, radius: number) {
    const radiusSq = radius * radius;
    const minX = Math.max(0, Math.floor(gx - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(gx + radius));
    const minY = Math.max(0, Math.floor(gy - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(gy + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - gx;
        const dy = y - gy;
        const distSq = dx * dx + dy * dy;

        if (distSq <= radiusSq) {
          const index = y * this.width + x;
          const cleanAmount = 0.1; // Adjust cleaning strength as needed
          this.gridData[index] = Math.max(
            0,
            this.gridData[index] - cleanAmount
          );
        }
      }
    }
  }

  public getCleanPercent(): number {
    let sum = 0;
    for (let i = 0; i < this.gridData.length; i++) {
      sum += this.gridData[i];
    }
    let averageClear = sum / this.gridData.length;
    return (1 - averageClear) * 100;
  }

  public getValueAt(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return 0;
    }
    const index = y * this.width + x;
    return this.gridData[index];
  }
}
