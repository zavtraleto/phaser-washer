import type { DirtGrid } from "../logic/DirtGrid";

export class DirtVisual {
  scene: Phaser.Scene;
  ojectToClean: Phaser.GameObjects.Rectangle; // temprary, will be mesh or something later
  dirtGrid: DirtGrid;
  graphics: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    ojectToClean: Phaser.GameObjects.Rectangle,
    dirtGrid: DirtGrid
  ) {
    this.scene = scene;
    this.ojectToClean = ojectToClean;
    this.dirtGrid = dirtGrid;

    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(10); //on top of the current objectToClean
  }

  public redrawFromDirtGrid() {
    this.graphics.clear();

    const boxBounds = this.ojectToClean.getBounds();

    const cellWidth = boxBounds.width / this.dirtGrid.width;
    const cellHeight = boxBounds.height / this.dirtGrid.height;

    // Draw dirt overlay - cells with value > 0 are dirty
    for (let y = 0; y < this.dirtGrid.height; y++) {
      for (let x = 0; x < this.dirtGrid.width; x++) {
        const value = this.dirtGrid.getValueAt(x, y);

        // Only draw dirty cells (value > 0)
        if (value > 0) {
          const alpha = value; // value is 0-1, where 1 = fully dirty, 0 = clean
          this.graphics.fillStyle(0x654321, alpha);
          this.graphics.fillRect(
            boxBounds.x + x * cellWidth,
            boxBounds.y + y * cellHeight,
            cellWidth,
            cellHeight
          );
        }
      }
    }
  }
}
