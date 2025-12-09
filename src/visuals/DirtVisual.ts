import type { DirtSystem } from "../logic/DirtSystem";

/**
 * Renders all dirt layers from DirtSystem as overlays on the object to clean.
 * Layers are rendered in order (first = bottom, last = top).
 */
export class DirtVisual {
  private scene: Phaser.Scene;
  private objectToClean: Phaser.GameObjects.Rectangle; // temporary, will be mesh or something later
  private dirtSystem: DirtSystem;
  private graphics: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    objectToClean: Phaser.GameObjects.Rectangle,
    dirtSystem: DirtSystem
  ) {
    this.scene = scene;
    this.objectToClean = objectToClean;
    this.dirtSystem = dirtSystem;

    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(10); // on top of the current objectToClean
  }

  /**
   * Redraw all dirt layers from DirtSystem.
   * Layers are drawn in order: first layer is bottom, last layer is on top.
   */
  public redraw(): void {
    this.graphics.clear();

    const boxBounds = this.objectToClean.getBounds();
    const cellWidth = boxBounds.width / this.dirtSystem.width;
    const cellHeight = boxBounds.height / this.dirtSystem.height;

    const layers = this.dirtSystem.getAllLayers();

    // Draw each layer in order (first = bottom, last = top)
    for (const layer of layers) {
      const { color, maxOpacity } = layer.config;

      for (let y = 0; y < this.dirtSystem.height; y++) {
        for (let x = 0; x < this.dirtSystem.width; x++) {
          const value = layer.grid.getValue(x, y);

          if (value > 0) {
            const alpha = value * maxOpacity;
            this.graphics.fillStyle(color, alpha);
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
}
