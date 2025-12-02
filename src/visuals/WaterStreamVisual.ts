export class WaterStreamVisual {
  private graphics: Phaser.GameObjects.Graphics;
  private box: Phaser.GameObjects.Rectangle;
  private gridHeight: number;

  constructor(box: Phaser.GameObjects.Rectangle, gridHeight: number) {
    this.box = box;
    this.gridHeight = gridHeight;
    // Get scene from the box game object
    this.graphics = box.scene.add.graphics();
    this.graphics.setDepth(12);
  }

  public redraw(
    targetX: number | null,
    beamX: number | null,
    tipRow: number | null
  ): void {
    this.graphics.clear();

    if (beamX === null || tipRow === null || targetX === null) return;

    const bounds = this.box.getBounds();
    const cellHeight = bounds.height / this.gridHeight;

    const clampedStartTargetX = Phaser.Math.Clamp(
      targetX,
      bounds.left,
      bounds.right
    );
    const clampedTipTargetX = Phaser.Math.Clamp(
      beamX,
      bounds.left,
      bounds.right
    );

    const bottomY = bounds.bottom + 50;

    const tipY = bounds.y + (tipRow + 0.5) * cellHeight;

    this.graphics.lineStyle(12, 0x3399ff, 0.7);
    this.graphics.beginPath();
    this.graphics.moveTo(clampedStartTargetX, bottomY);
    this.graphics.lineTo(clampedTipTargetX, tipY);
    this.graphics.strokePath();
  }
}
