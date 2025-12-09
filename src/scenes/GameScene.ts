import { DirtSystem } from "../logic/DirtSystem";
import { DirtLayerId, type DirtLayerConfig } from "../logic/DirtLayer";
import { DirtVisual } from "../visuals/DirtVisual";
import { StrokeInput } from "../input/StrokeInput";
import type { Tool } from "../tools/Tool";
import { ToolId } from "../tools/ToolTypes";
import { BrushTool } from "../tools/BrushTool";
import { WaterStreamTool } from "../tools/WaterStreamTool";

export class GameScene extends Phaser.Scene {
  // Game object
  private box!: Phaser.GameObjects.Rectangle;

  // UI elements
  private hudText!: Phaser.GameObjects.Text;
  private toolText!: Phaser.GameObjects.Text;

  // Dirt system
  private dirtSystem!: DirtSystem;
  private dirtVisual!: DirtVisual;

  // Input system
  private strokeInput!: StrokeInput;

  // Tools
  private currentTool!: Tool;
  private brushTool!: BrushTool;
  private waterStreamTool!: WaterStreamTool;

  // flag to indicate dirt visual needs redraw
  private dirtNeedsRedraw: boolean = true;

  constructor() {
    super("GameScene");
  }

  preload() {
    // Load assets here
  }

  create() {
    const { width, height } = this.scale;
    this.box = this.add.rectangle(width / 2, height / 2, 400, 400, 0x88292f);

    // Dirt changed callback
    const onDirtChanged = () => {
      this.dirtNeedsRedraw = true;
    };

    // Configure dirt layers
    const moldConfig: DirtLayerConfig = {
      id: DirtLayerId.Mold,
      displayName: "Mold",
      color: 0x9fa4a9, // grayish
      maxOpacity: 0.9,
      baseHardness: 1.0,
      minValueByTool: new Map([
        [ToolId.Brush, 0],
        [ToolId.WaterStream, 0],
      ]),
    };

    const greaseConfig: DirtLayerConfig = {
      id: DirtLayerId.Grease,
      displayName: "Grease",
      color: 0x4a3728, // brownish
      maxOpacity: 0.95,
      baseHardness: 1.5, // harder to clean
      minValueByTool: new Map([
        [ToolId.Brush, 0.3], // brush can only reduce to 0.3
        [ToolId.WaterStream, 0], // water stream can clean fully
      ]),
    };

    // Create DirtSystem with layers (mold = bottom, grease = top)
    this.dirtSystem = new DirtSystem(256, 256, [moldConfig, greaseConfig]);

    // Initialize layers
    this.dirtSystem.getLayer(DirtLayerId.Mold)?.initializeAsFull();
    this.dirtSystem.getLayer(DirtLayerId.Grease)?.initializeAsPatches(0.65);

    // Create visual for dirt layers
    this.dirtVisual = new DirtVisual(this, this.box, this.dirtSystem);

    // Brush tool instance
    this.brushTool = new BrushTool(this.box, this.dirtSystem, onDirtChanged);

    // Water stream tool instance (creates its own visual internally)
    this.waterStreamTool = new WaterStreamTool(
      this.box,
      this.dirtSystem,
      onDirtChanged
    );
    // set current tool to a tool by perssing 1-2 keys
    this.currentTool = this.brushTool;

    // temporary input handling for tool switching
    this.input.keyboard?.on("keydown-ONE", () => {
      this.currentTool = this.brushTool;
      this.setTool(this.currentTool);
    });

    this.input.keyboard?.on("keydown-TWO", () => {
      this.currentTool = this.waterStreamTool;
      this.setTool(this.currentTool);
    });

    // create stroke input handler
    this.strokeInput = new StrokeInput(this, this.currentTool);

    this.hudText = this.add.text(16, 16, "Clean: 0%", {
      fontSize: "20px",
      color: "#ffffff",
    });

    this.toolText = this.add.text(16, 46, `Tool: ${this.currentTool.name}`, {
      fontSize: "20px",
      color: "#ffffff",
    });
  }

  public setTool(tool: Tool): void {
    this.currentTool = tool;
    this.strokeInput.setTool(tool);
    this.toolText.setText(`Tool: ${tool.name}`);
  }

  update(time: number, delta: number) {
    // update tool if it has update method
    this.currentTool.update?.(delta);
    time;

    const cleanPercentage = this.dirtSystem.getCombinedCleanPercent();
    const cleanPercentageForUI = Math.round(cleanPercentage * 10) / 10;

    // redraw dirt visual if needed
    if (this.dirtNeedsRedraw) {
      this.dirtVisual.redraw();
      this.dirtNeedsRedraw = false;
    }

    // counting cleanness percentage
    if (cleanPercentage >= 100) {
      this.hudText.setText("Clean: 100% - Done!");
    } else {
      this.hudText.setText(`Clean: ${cleanPercentageForUI}%`);
    }
  }
}
