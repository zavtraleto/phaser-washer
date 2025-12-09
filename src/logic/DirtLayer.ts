import { DirtGrid } from "./DirtGrid";
import type { ToolId } from "../tools/ToolTypes";

/**
 * Unique identifier for each dirt layer type.
 */
export const DirtLayerId = {
  Mold: "Mold",
  Grease: "Grease",
} as const;

export type DirtLayerId = (typeof DirtLayerId)[keyof typeof DirtLayerId];

/**
 * Configuration for a dirt layer.
 */
export interface DirtLayerConfig {
  id: DirtLayerId;
  displayName: string;

  // Visual
  color: number; // hex color (e.g., 0x9fa4a9)
  maxOpacity: number; // 0..1

  // Logical behavior
  baseHardness: number; // resistance multiplier (higher = harder to clean)
  minValueByTool: Map<ToolId, number>; // per-tool cleaning floor
}

/**
 * Represents one logical dirt type (e.g., Mold, Grease).
 * Combines a DirtGrid with configuration for that type.
 */
export class DirtLayer {
  readonly config: DirtLayerConfig;
  readonly grid: DirtGrid;

  constructor(config: DirtLayerConfig, width: number, height: number) {
    this.config = config;
    this.grid = new DirtGrid(width, height);
  }

  /** Fill entire layer with maximum dirt (value = 1.0) */
  public initializeAsFull(): void {
    this.grid.fill(1.0);
  }

  /**
   * Fill layer with random patches up to ~coveragePercent.
   * Each dirty cell gets intensity between 0.7 and 1.0.
   */
  public initializeAsPatches(coveragePercent: number): void {
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        if (Math.random() < coveragePercent) {
          const intensity = 0.7 + Math.random() * 0.3;
          this.grid.setValue(x, y, intensity);
        } else {
          this.grid.setValue(x, y, 0);
        }
      }
    }
  }

  /** Get the minimum dirt value a tool can reach on this layer */
  public getMinValueForTool(toolId: ToolId): number {
    return this.config.minValueByTool.get(toolId) ?? 0;
  }

  /** Clean percentage for this layer */
  public getCleanPercent(): number {
    return this.grid.getCleanPercent();
  }
}
