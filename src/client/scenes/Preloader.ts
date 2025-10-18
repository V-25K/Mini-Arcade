import Phaser from 'phaser';

export default class Preloader extends Phaser.Scene {
  private progressText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private background!: Phaser.GameObjects.RenderTexture;

  constructor() {
    super('Preloader');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0f172a');

    // Create textured background
    this.createBackground();

    // Create loading UI
    this.createLoadingUI();

    // Start loading assets
    this.startLoading();
  }

  private createBackground(): void {
    const { width, height } = this.scale;
    this.background = this.add.renderTexture(0, 0, width, height).setOrigin(0);
    this.drawBackgroundPattern();
  }

  private drawBackgroundPattern(): void {
    const { width, height } = this.scale;
    const rt = this.background;
    rt.resize(width, height);
    rt.clear();

    const g = this.add.graphics({ fillStyle: { color: 0x0f172a } });
    g.fillRect(0, 0, width, height);

    // Draw animated pattern - diagonal stripes
    g.lineStyle(2, 0x1e293b, 0.3);
    const spacing = 60;
    for (let i = -height; i < width + height; i += spacing) {
      g.lineBetween(i, 0, i + height, height);
    }

    // Add some dots pattern
    g.fillStyle(0x334155, 0.2);
    for (let x = 0; x < width; x += 80) {
      for (let y = 0; y < height; y += 80) {
        g.fillCircle(x, y, 2);
      }
    }

    rt.draw(g, 0, 0);
    g.destroy();
  }

  private createLoadingUI(): void {
    const { width, height } = this.scale;
    const s = Math.min(width / 720, height / 1280);

    // Loading title
    const titleFont = Math.max(32, Math.floor(54 * s)); // 3x bigger than before
    this.add.text(width / 2, height * 0.35, 'Loading', {
      fontFamily: 'Arial Black',
      fontSize: `${titleFont}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5);

    // Progress bar background
    const barWidth = Math.max(300, 300 * s);
    const barHeight = Math.max(12, 12 * s);
    this.add.rectangle(width / 2, height * 0.55, barWidth, barHeight, 0x1e293b)
      .setStrokeStyle(2, 0x334155);

    // Progress bar fill
    this.progressBar = this.add.graphics();
    this.progressBar.setPosition(width / 2 - barWidth / 2, height * 0.55 - barHeight / 2);

    // Progress text
    const progressFont = Math.max(20, Math.floor(36 * s)); // 3x bigger
    this.progressText = this.add
      .text(width / 2, height * 0.65, '0%', {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: `${progressFont}px`,
        color: '#ffffff',
        fontStyle: '600',
        shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true },
      })
      .setOrigin(0.5);

    // Loading animation dots
    const dots = this.add.text(width / 2, height * 0.75, '...', {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: `${progressFont}px`,
      color: '#94a3b8',
    }).setOrigin(0.5);

    // Animate dots
    this.tweens.add({
      targets: dots,
      alpha: { from: 0.3, to: 1 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  private startLoading(): void {
    this.load.on('progress', (value: number) => {
      this.updateProgress(value);
    });

    this.load.on('complete', () => {
      this.scene.start('MainMenu');
    });

    // Core UI assets
    this.load.image('logo', 'assets/logo.png');
    this.load.image('background', 'assets/bg.png');
    
    // Start loading
    this.load.start();
  }

  private updateProgress(value: number): void {
    const { width, height } = this.scale;
    const s = Math.min(width / 720, height / 1280);
    const barWidth = Math.max(300, 300 * s);
    const barHeight = Math.max(12, 12 * s);
    
    const percentage = Math.round(value * 100);
    this.progressText.setText(`${percentage}%`);

    // Update progress bar
    this.progressBar.clear();
    this.progressBar.fillStyle(0x3b82f6, 0.9);
    this.progressBar.fillRect(0, 0, barWidth * value, barHeight);
  }
}


