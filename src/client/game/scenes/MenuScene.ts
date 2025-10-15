import Phaser from 'phaser';

type GameButton = {
  label: string;
  sceneKey: string;
  color: string;
};

export default class MenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private playButtons: Phaser.GameObjects.Text[] = [];
  private username: string = 'Guest';
  private gradientTextureKey: string | null = null;

  constructor() {
    super('MenuScene');
  }

  init(data: { username?: string }) {
    this.username = data?.username || 'Guest';
  }

  create() {
    const { width, height } = this.scale;

    // Background gradient as a canvas texture (no prototype hacks)
    this.gradientTextureKey = this.createVerticalGradientTexture(
      width,
      height,
      [
        { offset: 0, color: 0xff5f6d },
        { offset: 1, color: 0xffc371 },
      ]
    );
    if (this.gradientTextureKey) {
      this.add.image(0, 0, this.gradientTextureKey).setOrigin(0);
    } else {
      // Fallback solid background if texture creation failed
      this.cameras.main.setBackgroundColor('#2b2b2b');
    }

    // Title
    this.titleText = this.add
      .text(width / 2, 100, '🎮 Mini Arcade', {
        fontFamily: 'Verdana',
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: this.titleText,
      y: 110,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Username line
    this.add
      .text(width / 2, 170, `Logged in as u/${this.username}` , {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    const games: GameButton[] = [
      { label: '🧠 Memory Match', sceneKey: 'MemoryScene', color: '#00e1ff' },
      { label: '♟️ Checkers', sceneKey: 'Game', color: '#ff7b00' },
      { label: '💥 Tank Battle', sceneKey: 'Game', color: '#8fff00' },
    ];

    const buttonYStart = height / 2 - 40;
    games.forEach((game, i) => {
      console.log(`Creating button ${i}: ${game.label} at position (${width / 2}, ${buttonYStart + i * 80})`);
      
      const btn = this.add
        .text(width / 2, buttonYStart + i * 80, game.label, {
          fontFamily: 'Verdana',
          fontSize: '32px',
          color: game.color,
          backgroundColor: '#00000055',
          padding: { x: 25, y: 10 } as any,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          console.log(`Button clicked: ${game.label}, transitioning to: ${game.sceneKey}`);
          // Play a click sound only if it's already loaded
          try {
            const click = this.sound.get('click');
            if (click) click.play({ volume: 0.5 });
          } catch {}

          // Try both scene.start and scene.launch
          try {
            this.scene.start(game.sceneKey, { username: this.username });
          } catch (error) {
            console.error(`Failed to start scene ${game.sceneKey}:`, error);
            // Fallback: try to launch the scene
            this.scene.launch(game.sceneKey, { username: this.username });
          }
        })
        .on('pointerup', () => {
          console.log(`Button pointerup: ${game.label}`);
        })
        .on('click', () => {
          console.log(`Button click event: ${game.label}`);
        });

      // Add hover effects
      btn.on('pointerover', () => {
        console.log(`Hovering over: ${game.label}`);
        btn.setStyle({ backgroundColor: '#ffffff88', color: '#000000' });
        this.tweens.add({ targets: btn, scale: 1.1, duration: 200, ease: 'Back.Out' });
      });
      btn.on('pointerout', () => {
        console.log(`Stopped hovering: ${game.label}`);
        btn.setStyle({ backgroundColor: '#00000055', color: game.color });
        this.tweens.add({ targets: btn, scale: 1.0, duration: 200, ease: 'Back.Out' });
      });

      this.playButtons.push(btn);
    });

    this.add
      .text(width / 2, height - 60, 'Tap a game to start!', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    // Recreate gradient on resize to match new size
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width: w, height: h } = gameSize;
      if (this.gradientTextureKey) {
        this.textures.remove(this.gradientTextureKey);
        this.gradientTextureKey = null;
      }
      this.gradientTextureKey = this.createVerticalGradientTexture(w, h, [
        { offset: 0, color: 0xff5f6d },
        { offset: 1, color: 0xffc371 },
      ]);
      if (this.gradientTextureKey) {
        const bgImage = this.add.image(0, 0, this.gradientTextureKey).setOrigin(0).setDepth(-1);
        bgImage.displayWidth = w;
        bgImage.displayHeight = h;
      }
    });
  }

  private createVerticalGradientTexture(
    width: number,
    height: number,
    colorStops: { offset: number; color: number }[]
  ): string | null {
    const key = `menu-gradient-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const canvasTex = this.textures.createCanvas(key, Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)));
    if (!canvasTex) return null;

    const ctx = canvasTex.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    colorStops.forEach(({ offset, color }) => {
      const c = Phaser.Display.Color.IntegerToColor(color).rgba;
      gradient.addColorStop(offset, c);
    });
    ctx.fillStyle = gradient as any;
    ctx.fillRect(0, 0, width, height);
    canvasTex.refresh();
    return key;
  }
}


