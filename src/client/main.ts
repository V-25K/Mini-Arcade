import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import Preloader from './scenes/Preloader';
import { MainMenu } from './game/scenes/MainMenu';
import { Game as GameScene } from './game/scenes/Game';
import Memory from './game/scenes/Memory';
import GameOver from './game/scenes/GameOver';

// Fixed portrait virtual resolution (9:16)
const VIRTUAL = { width: 360, height: 640 };

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a1a',
  scale: {
    width: VIRTUAL.width,
    height: VIRTUAL.height,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
    fullscreenTarget: 'game-container',
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
  scene: [Preloader, MainMenu, GameScene, Memory, GameOver],
};

document.addEventListener('DOMContentLoaded', () => {
  new Game(config);
});