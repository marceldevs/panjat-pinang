import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { HomeScene } from "./scenes/HomeScene";
import { CreateRoomScene } from "./scenes/CreateRoomScene";
import { JoinRoomScene } from "./scenes/JoinRoomScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { OfflineGameScene } from "./scenes/OfflineGameScene";
import { GameScene } from "./scenes/GameScene";
import { ResultsScene } from "./scenes/ResultsScene";
import { setupLandscapeLock } from "./ui/landscape";

setupLandscapeLock();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#7ec8e3",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  scene: [
    BootScene,
    HomeScene,
    CreateRoomScene,
    JoinRoomScene,
    LobbyScene,
    OfflineGameScene,
    GameScene,
    ResultsScene,
  ],
  input: {
    activePointers: 3,
  },
  audio: {
    disableWebAudio: false,
  },
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
