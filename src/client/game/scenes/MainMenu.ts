import { Scene, GameObjects } from 'phaser';
import type { WhoAmIResponse } from '../../../shared/types/api';

export class MainMenu extends Scene {
  background!: GameObjects.Image;
  logo!: GameObjects.Image;
  title!: GameObjects.Text;
  usernameLabel!: GameObjects.Text;
  memoryBtn!: GameObjects.Text;
  checkersBtn!: GameObjects.Text;
  tankBtn!: GameObjects.Text;

  constructor() {
    super('MainMenu');
  }

  create() {
    this.addBackground();
    this.createLogoAndTitle();
    this.createButtons();
    this.fetchUsername();

    this.scale.on('resize', () => this.refreshLayout());
    this.refreshLayout();
  }

  private addBackground() {
    const { width, height } = this.scale;
    this.background = this.add.image(width / 2, height / 2, 'background').setOrigin(0.5);
    this.background.setDisplaySize(width, height);
  }

  private createLogoAndTitle() {
    const { width, height } = this.scale;

    this.logo = this.add.image(width / 2, height * 0.18, 'logo').setOrigin(0.5);

    this.usernameLabel = this.add.text(width / 2, height * 0.36, 'Hello, ...', {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '24px',
      color: '#cccccc',
      align: 'center',
    }).setOrigin(0.5);
  }

  private createButtons() {
    const makeButton = (label: string, onClick: () => void) => {
      const btn = this.add.text(0, 0, label, {
        fontFamily: 'Arial Black',
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#444444',
        padding: { x: 36, y: 16 } as any,
        align: 'center',
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => btn.setStyle({ backgroundColor: '#555555' }))
        .on('pointerout', () => btn.setStyle({ backgroundColor: '#444444' }))
        .on('pointerdown', onClick);
      return btn;
    };

    this.memoryBtn = makeButton('🧠 Memory', () => this.scene.start('Memory'));
    this.checkersBtn = makeButton('♟️ Checkers', () => this.scene.start('Game'));
        this.tankBtn = makeButton('📚 Stack Em All', () => this.scene.start('Game'));
  }

  private refreshLayout() {
    const { width, height } = this.scale;
    const s = Math.min(width / 720, height / 1280);

    // Resize background
    this.background.setDisplaySize(width, height);

    // Logo and username
    const logoScale = Math.max(0.22, 0.3 * s);
    this.logo.setPosition(width / 2, height * 0.18).setScale(logoScale);

    const nameFont = Math.max(16, Math.floor(28 * s));
    this.usernameLabel.setFontSize(nameFont).setPosition(width / 2, height * 0.36);

    // Buttons
    const buttons = [this.memoryBtn, this.checkersBtn, this.tankBtn];
    const baseY = height * 0.58;
    const spacing = Math.max(56, Math.floor(96 * s));

    const btnFont = Math.max(18, Math.floor(32 * s));
    const padX = Math.max(16, Math.floor(36 * s));
    const padY = Math.max(10, Math.floor(16 * s));

    buttons.forEach((btn, i) => {
      btn.setFontSize(btnFont)
        .setPadding(padX, padY)
        .setPosition(width / 2, baseY + i * spacing)
        .setScale(1);
    });
  }

  private async fetchUsername(): Promise<void> {
    try {
      const res = await fetch('/api/whoami', { headers: { 'content-type': 'application/json' } });
      const data = (await res.json()) as WhoAmIResponse;
      const username = data.username ?? 'Guest';
      this.usernameLabel.setText(`Hello, ${username}`);
    } catch {
      this.usernameLabel.setText('Hello, Guest');
    }
  }
}