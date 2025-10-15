import Phaser from 'phaser';

type GameButton = {
  label: string;
  sceneKey: string;
  color: string;
  available?: boolean;
};

export default class MenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private playButtons: Phaser.GameObjects.Container[] = [];
  private usernameText!: Phaser.GameObjects.Text;
  private footerText!: Phaser.GameObjects.Text;
  private username: string = 'Guest';
  private gradientTextureKey: string | null = null;

  constructor() {
    super('MenuScene');
  }

  private createGameButton(
    x: number,
    y: number,
    label: string,
    accentColor: string,
    dark: boolean,
    showSoonBadge?: boolean
  ) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 240, 50, 0xffffff, dark ? 0.06 : 0.25);
    bg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(accentColor).color, 0.7);
    const text = this.add.text(0, 0, label, {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '22px',
      color: accentColor,
    }).setOrigin(0.5);
    container.add([bg, text]);

    // Optional "SOON" sticker/badge at bottom
    if (showSoonBadge) {
      const badgeBg = this.add.rectangle(80, 18, 68, 20, 0xffeb3b, 1);
      badgeBg.setStrokeStyle(2, 0x000000, 0.8);
      const badgeText = this.add.text(80, 18, 'SOON', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '14px',
        color: '#000000',
      }).setOrigin(0.5);
      container.add([badgeBg, badgeText]);
      container.setDepth(1);
    }
    return container;
  }

  init(data: { username?: string }) {
    this.username = data?.username || 'Guest';
  }

  create() {
    const { width, height } = this.scale;

    // Prefer themed background gradient (light/dark)
    const prefersDark =
      typeof window !== 'undefined' &&
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const colors = prefersDark
      ? { bg1: 0x0f2027, bg2: 0x203a43, bg3: 0x2c5364 }
      : { bg1: 0xffecd2, bg2: 0xfcb69f, bg3: 0xff9a9e };
    this.gradientTextureKey = this.createVerticalGradientTexture(width, height, [
      { offset: 0, color: colors.bg1 },
      { offset: 0.5, color: colors.bg2 },
      { offset: 1, color: colors.bg3 },
    ]);
    if (this.gradientTextureKey) {
      const bg = this.add.image(0, 0, this.gradientTextureKey).setOrigin(0).setDepth(-10);
      bg.displayWidth = width;
      bg.displayHeight = height;
    } else {
      this.cameras.main.setBackgroundColor('#2b2b2b');
    }

    // Ambient particles (best-effort)
    try {
      const particles = this.add.particles(0, 0, 'logo', {
        frame: undefined as any,
        lifespan: { min: 2000, max: 4000 },
        alpha: { start: 0.2, end: 0 },
        scale: { start: 0.05, end: 0 },
        speed: { min: 10, max: 30 },
        quantity: 2,
        blendMode: 'ADD',
        // older phaser types may not include emitZone config type, so skip
      });
      particles.setDepth(-5);
    } catch {}

    // Title
    this.titleText = this.add
      .text(width / 2, 100, '🎮 Mini Arcade', {
        fontFamily: 'Poppins, Verdana, sans-serif',
        fontSize: '54px',
        color: prefersDark ? '#f1f1f1' : '#1a1a1a',
        fontStyle: 'bold',
        stroke: prefersDark ? '#ffffff20' : '#00000020',
        strokeThickness: 2,
        shadow: { offsetX: 0, offsetY: 0, color: prefersDark ? '#ffffff20' : '#00000030', blur: 10, fill: true } as any,
      })
      .setOrigin(0.5);

    // Removed floating hover animation for title

    // Username line
    this.usernameText = this.add
      .text(width / 2, 180, `Logged in as u/${this.username}` , {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: '18px',
        color: prefersDark ? '#aaa' : '#444',
      })
      .setOrigin(0.5);

    const games: GameButton[] = [
      { label: '🧠 Memory Match', sceneKey: 'MemoryScene', color: '#00e1ff', available: true },
      { label: '♟️ Checkers', sceneKey: 'Game', color: '#ff7b00', available: false },
      { label: '💥 Tank Battle', sceneKey: 'Game', color: '#8fff00', available: false },
    ];

    const buttonYStart = height / 2 - 40;
    games.forEach((game, i) => {
      const btn = this.createGameButton(
        width / 2,
        buttonYStart + i * 80,
        game.label,
        game.color,
        !!prefersDark,
        !game.available
      );
      btn.setInteractive(new Phaser.Geom.Rectangle(-120, -25, 240, 50), Phaser.Geom.Rectangle.Contains);
      btn.on('pointerup', () => {
        try {
          const click = this.sound.get('click');
          if (click) click.play({ volume: 0.5 });
        } catch {}
        if (!game.available) {
          this.showToast(`${game.label} — Available soon!`);
          return;
        }
        // Prevent press-through by delaying scene start slightly
        this.input.enabled = false;
        this.time.delayedCall(60, () => {
          this.scene.start(game.sceneKey, { username: this.username });
          this.input.enabled = true;
        });
      });
      btn.on('pointerover', () => {
        this.tweens.add({ targets: btn, scale: 1.1, duration: 150, ease: 'Back.Out' });
        const text = btn.getAt(1) as Phaser.GameObjects.Text | undefined;
        if (text) text.setAlpha(1);
      });
      btn.on('pointerout', () => {
        this.tweens.add({ targets: btn, scale: 1.0, duration: 150, ease: 'Back.Out' });
        const text = btn.getAt(1) as Phaser.GameObjects.Text | undefined;
        if (text) text.setAlpha(0.9);
      });
      this.playButtons.push(btn);
    });

    this.footerText = this.add
      .text(width / 2, height - 60, 'Tap a game to start 🚀', {
        fontFamily: 'Inter, sans-serif',
        fontSize: '18px',
        color: prefersDark ? '#aaa' : '#444',
      })
      .setOrigin(0.5);

    // Initial responsive layout and resize handling
    this.refreshLayout();
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width: w, height: h } = gameSize;
      this.cameras.resize(w, h);
      if (this.gradientTextureKey) {
        this.textures.remove(this.gradientTextureKey);
        this.gradientTextureKey = null;
      }
      const cs = prefersDark
        ? [ { offset: 0, color: 0x0f2027 }, { offset: 0.5, color: 0x203a43 }, { offset: 1, color: 0x2c5364 } ]
        : [ { offset: 0, color: 0xffecd2 }, { offset: 0.5, color: 0xfcb69f }, { offset: 1, color: 0xff9a9e } ];
      this.gradientTextureKey = this.createVerticalGradientTexture(w, h, cs as any);
      // Remove older gradient images
      this.children.list
        .filter((obj) => (obj as any).texture && (obj as any).texture.key?.startsWith('menu-gradient-'))
        .forEach((obj) => obj.destroy());
      if (this.gradientTextureKey) {
        const bgImage = this.add.image(0, 0, this.gradientTextureKey).setOrigin(0).setDepth(-10);
        bgImage.displayWidth = w;
        bgImage.displayHeight = h;
      }
      this.refreshLayout();
    });
  }

  private refreshLayout() {
    const { width, height } = this.scale;

    const titleSize = Math.max(32, Math.floor(Math.min(width, height) * 0.06));
    const usernameSize = Math.max(14, Math.floor(titleSize * 0.42));
    const buttonFontSize = Math.max(18, Math.floor(titleSize * 0.6));
    const spacing = Math.max(64, Math.floor(buttonFontSize * 2.0));

    this.titleText.setFontSize(titleSize);
    this.usernameText.setFontSize(usernameSize);
    this.footerText.setFontSize(Math.max(12, Math.floor(usernameSize * 0.95)));

    const num = this.playButtons.length;
    const buttonsBlockH = num > 0 ? (num - 1) * spacing + 50 : 0;
    const totalH = this.titleText.height + 12 + this.usernameText.height + 24 + buttonsBlockH;
    const top = Math.max(40, Math.floor((height - totalH) / 2));

    this.titleText.setPosition(width / 2, top + this.titleText.height / 2);
    const usernameY = this.titleText.y + this.titleText.height / 2 + 12 + this.usernameText.height / 2;
    this.usernameText.setPosition(width / 2, usernameY);

    const firstY = this.usernameText.y + this.usernameText.height / 2 + 24 + 25;
    this.playButtons.forEach((btn, i) => {
      btn.setPosition(width / 2, firstY + i * spacing);
      const text = btn.getAt(1) as Phaser.GameObjects.Text | undefined;
      if (text) text.setFontSize(buttonFontSize);
    });

    this.footerText.setPosition(width / 2, height - 50);
  }

  private showToast(message: string) {
    const { width, height } = this.scale;
    const toast = this.add.text(width / 2, height - 100, message, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#000000',
      backgroundColor: '#ffffff',
      padding: { x: 16, y: 8 } as any,
    }).setOrigin(0.5).setDepth(1000);

    this.tweens.add({
      targets: toast,
      alpha: { from: 1, to: 0 },
      y: height - 130,
      duration: 1200,
      ease: 'Sine.easeInOut',
      onComplete: () => toast.destroy(),
      delay: 600,
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


