import Phaser, { Scene } from 'phaser';

export class Preloader extends Scene {
  private bg?: Phaser.GameObjects.Image;
  private outline?: Phaser.GameObjects.Rectangle;
  private bar?: Phaser.GameObjects.Rectangle;
  private title?: Phaser.GameObjects.Text;
  private progress = 0;
  private isDestroyed = false;

  constructor() {
    super('Preloader');
  }

  init() {
    const { width, height } = this.scale;

    // --- Create background ---
    this.bg = this.add.image(0, 0, 'background').setOrigin(0);
    this.bg.displayWidth = width;
    this.bg.displayHeight = height;

    // --- Title ---
    this.title = this.add
      .text(width / 2, height * 0.35, '🎮 Mini Arcade', {
        fontFamily: 'Poppins, Verdana, sans-serif',
        fontSize: '42px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    // --- Progress bar setup ---
    this.createProgressBar(width, height);

    // --- Update bar on progress ---
    this.load.on('progress', this.onProgress, this);

    // --- Resize handling ---
    this.scale.on('resize', this.refreshLayout, this);
  }

  preload() {
    this.load.setPath('assets');
    this.load.image('logo', 'logo.png');
  }

  create() {
    // Clean event listeners on shutdown or destroy
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    // Proceed to next scene once everything’s loaded
    this.resolveUsernameAndStart();
  }

  // -------------------------------
  // 👇 Helper Methods
  // -------------------------------

  private createProgressBar(width: number, height: number) {
    const barWidth = Math.min(520, Math.floor(width * 0.8));
    const barHeight = 28;
    const barX = (width - barWidth) / 2;
    const barY = Math.floor(height * 0.55);

    this.outline = this.add
      .rectangle(barX + barWidth / 2, barY, barWidth, barHeight)
      .setStrokeStyle(2, 0xffffff)
      .setDepth(5);

    this.bar = this.add
      .rectangle(barX + 2, barY, 4, barHeight - 4, 0xffffff)
      .setOrigin(0, 0.5)
      .setDepth(6);
  }

  private onProgress(progress: number) {
    if (!this.bar || !this.bar.active) return;
    this.progress = progress;

    const outlineWidth = this.outline?.width ?? 0;
    const usable = outlineWidth - 4;
    const newWidth = Math.max(4, Math.floor(usable * progress));

    this.tweens.add({
      targets: this.bar,
      width: newWidth,
      duration: 150,
      ease: 'Sine.easeOut',
    });
  }

  private async resolveUsernameAndStart() {
    try {
      const username = await this.fetchUsername();
      this.scene.start('MenuScene', { username });
    } catch {
      this.scene.start('MenuScene', { username: 'Guest' });
    }
  }

  private async fetchUsername(): Promise<string> {
    // 1️⃣ URL param override
    const params = new URLSearchParams(window.location.search);
    const override = params.get('username');
    if (override?.trim()) return override.trim();

    // 2️⃣ Local storage
    const stored = localStorage.getItem('username');
    if (stored?.trim()) return stored.trim();

    // 3️⃣ API fallback
    try {
      const url = new URL('/api/whoami', window.location.origin);
      const resp = await fetch(url.toString());
      const data = (await resp.json()) as { username: string | null };
      if (data?.username) return data.username;
    } catch {
      /* ignore */
    }

    return 'Guest';
  }

  private refreshLayout() {
    if (!this.scene.isActive() || this.isDestroyed) return;

    const { width, height } = this.scale;
    this.cameras.resize(width, height);

    // Safely re-layout
    this.bg?.setDisplaySize(width, height);
    this.title?.setPosition(width / 2, height * 0.35);

    const barWidth = Math.min(520, Math.floor(width * 0.8));
    const barHeight = 28;
    const barX = (width - barWidth) / 2;
    const barY = Math.floor(height * 0.55);

    this.outline?.setPosition(barX + barWidth / 2, barY).setSize(barWidth, barHeight);
    this.bar?.setPosition(barX + 2, barY).setSize(barWidth * this.progress, barHeight - 4);
  }

  private cleanup() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.load.off('progress', this.onProgress, this);
    this.scale.off('resize', this.refreshLayout, this);

    this.bg?.destroy();
    this.title?.destroy();
    this.outline?.destroy();
    this.bar?.destroy();
  }
}
