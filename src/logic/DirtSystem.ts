import { DirtLayer, DirtLayerId, type DirtLayerConfig } from "./DirtLayer";
import type { ToolId, ToolDirtProfile } from "../tools/ToolTypes";

/**
 * Central manager for all dirt layers.
 * Provides the main API for tools to clean dirt and for visuals to read state.
 */
export class DirtSystem {
  readonly width: number;
  readonly height: number;
  private layers: Map<DirtLayerId, DirtLayer>;

  constructor(width: number, height: number, configs: DirtLayerConfig[]) {
    this.width = width;
    this.height = height;
    this.layers = new Map();

    for (const config of configs) {
      this.layers.set(config.id, new DirtLayer(config, width, height));
    }
  }

  /** Get a specific layer by ID */
  public getLayer(id: DirtLayerId): DirtLayer | undefined {
    return this.layers.get(id);
  }

  /** Get all layers in insertion order (for rendering: first = bottom, last = top) */
  public getAllLayers(): DirtLayer[] {
    return Array.from(this.layers.values());
  }

  /** Combined clean percentage across all layers (average) */
  public getCombinedCleanPercent(): number {
    const allLayers = this.getAllLayers();
    if (allLayers.length === 0) return 100;

    let sum = 0;
    for (const layer of allLayers) {
      sum += layer.getCleanPercent();
    }
    return sum / allLayers.length;
  }

  /**
   * Main API for tools to clean an area.
   * @param toolId - which tool is cleaning
   * @param profile - tool's cleaning rates per layer
   * @param centerX - grid X coordinate
   * @param centerY - grid Y coordinate
   * @param radius - cleaning radius in grid cells
   * @param dtSeconds - time delta in seconds
   * @returns true if any cell in any layer was changed
   */
  public applyAreaClean(
    toolId: ToolId,
    profile: ToolDirtProfile,
    centerX: number,
    centerY: number,
    radius: number,
    dtSeconds: number
  ): boolean {
    let anyChanged = false;

    for (const layer of this.layers.values()) {
      const layerRate = this.getProfileRateForLayer(profile, layer.config.id);
      const effectiveRate = layerRate / layer.config.baseHardness;
      const minValue = layer.getMinValueForTool(toolId);

      const changed = this.cleanLayerArea(
        layer,
        centerX,
        centerY,
        radius,
        effectiveRate,
        minValue,
        dtSeconds
      );
      anyChanged = anyChanged || changed;
    }

    return anyChanged;
  }

  /** Get the cleaning rate from profile for a specific layer */
  private getProfileRateForLayer(
    profile: ToolDirtProfile,
    layerId: DirtLayerId
  ): number {
    switch (layerId) {
      case DirtLayerId.Mold:
        return profile.moldRate;
      case DirtLayerId.Grease:
        return profile.greaseRate;
      default:
        return 0;
    }
  }

  /** Clean a circular area on a single layer */
  private cleanLayerArea(
    layer: DirtLayer,
    centerX: number,
    centerY: number,
    radius: number,
    effectiveRate: number,
    minValue: number,
    dtSeconds: number
  ): boolean {
    const radiusSq = radius * radius;
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(centerY + radius));

    let changed = false;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distSq = dx * dx + dy * dy;

        if (distSq <= radiusSq) {
          const oldValue = layer.grid.getValue(x, y);
          if (oldValue <= minValue) continue; // already at floor

          // Falloff: 1.0 at center, ~0 at edge
          const dist = Math.sqrt(distSq);
          const falloff = 1.0 - dist / radius;
          const delta = effectiveRate * dtSeconds * falloff;
          const newValue = Math.max(minValue, oldValue - delta);

          if (newValue !== oldValue) {
            layer.grid.setValue(x, y, newValue);
            changed = true;
          }
        }
      }
    }

    return changed;
  }
}
