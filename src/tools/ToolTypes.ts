/**
 * Unique identifier for each tool type.
 * Used by DirtSystem to look up per-tool cleaning rules.
 */
export const ToolId = {
  Brush: "Brush",
  WaterStream: "WaterStream",
} as const;

export type ToolId = (typeof ToolId)[keyof typeof ToolId];

/**
 * Defines how effective a tool is against each dirt layer.
 * Rates are in "dirt units per second" at the center of the cleaning area.
 */
export interface ToolDirtProfile {
  moldRate: number; // cleaning rate vs Mold layer
  greaseRate: number; // cleaning rate vs Grease layer
}
