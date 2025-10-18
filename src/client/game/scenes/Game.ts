import { Scene } from 'phaser';

export class Game extends Scene {
  backButton!: Phaser.GameObjects.Text;
  titleText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x121212);

    this.titleText = this.add.text(0, 0, 'Coming Soon', {
      fontFamily: 'Arial Black',
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center',
    }).setOrigin(0.5);

    this.backButton = this.makeButton('⬅️ Back to Menu', () => this.scene.start('MainMenu'));

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => this.updateLayout(gameSize.width, gameSize.height));
    this.updateLayout(width, height);
  }

  private makeButton(label: string, onClick: () => void) {
    const btn = this.add.text(0, 0, label, {
      fontFamily: 'Arial Black',
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 28, y: 12 } as any,
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => btn.setStyle({ backgroundColor: '#444444' }))
      .on('pointerout', () => btn.setStyle({ backgroundColor: '#333333' }))
      .on('pointerdown', onClick);
    return btn;
  }

  private updateLayout(width: number, height: number) {
    this.cameras.resize(width, height);
    const s = Math.min(width / 720, height / 1280);

    const titleFont = Math.max(24, Math.floor(48 * s));
    this.titleText
      .setFontSize(titleFont)
      .setPosition(width / 2, height * 0.4);

    const btnFont = Math.max(18, Math.floor(32 * s));
    const padX = Math.max(12, Math.floor(28 * s));
    const padY = Math.max(8, Math.floor(12 * s));

    this.backButton
      .setFontSize(btnFont)
      .setPadding(padX, padY)
      .setPosition(width / 2, height * 0.85)
      .setScale(1);
  }
}