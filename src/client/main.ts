import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import RootScene from './scenes/RootScene';

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a1a',
  scale: {
    width: 800,
    height: 600,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
  scene: [RootScene],
};

document.addEventListener('DOMContentLoaded', () => {
  new Game(config);
});


