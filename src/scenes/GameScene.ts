import { DirtGrid } from "../logic/DirtGrid";
import { DirtVisual } from "../visuals/DirtVisual";
import { StrokeInput } from "../input/StrokeInput";
import type { Tool } from "../tools/Tool";
import { BrushTool } from "../tools/BrushTool";
import { WaterStreamTool } from "../tools/WaterStreamTool";

export class GameScene extends Phaser.Scene {
  // Game object
  private box!: Phaser.GameObjects.Rectangle;

  // UI elements
  private hudText!: Phaser.GameObjects.Text;
  private toolText!: Phaser.GameObjects.Text;

  // Dirt system
  private dirtGrid!: DirtGrid;
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

    // create a logical dirt grid
    this.dirtGrid = new DirtGrid(256, 256);

    // create a visual dirt grid
    this.dirtVisual = new DirtVisual(this, this.box, this.dirtGrid);

    // Brush tool instance
    this.brushTool = new BrushTool(this.box, this.dirtGrid, onDirtChanged);
    // Water stream tool instance
    this.waterStreamTool = new WaterStreamTool(
      this.box,
      this.dirtGrid,
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

    const cleanPercentage = this.dirtGrid.getCleanPercent();
    const cleanPercentageForUI = Math.round(cleanPercentage * 10) / 10;

    // redraw dirt visual if needed
    if (this.dirtNeedsRedraw) {
      this.dirtVisual.redrawFromDirtGrid();
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
