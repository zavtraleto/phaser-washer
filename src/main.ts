import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 390,
  height: 700,
  parent: "game",
  backgroundColor: "#002455",
  scene: [GameScene],
};

new Phaser.Game(config);
