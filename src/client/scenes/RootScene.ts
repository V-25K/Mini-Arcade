import Phaser from 'phaser';

export default class RootScene extends Phaser.Scene {
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;

  constructor() {
    super('RootScene');
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#111827');

    this.title = this.add.text(width / 2, height / 2 - 20, 'Mini Arcade', {
      fontFamily: 'Poppins, Verdana, sans-serif',
      fontSize: '48px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.subtitle = this.add.text(width / 2, height / 2 + 24, 'Fresh start — let\'s build!', {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '18px',
      color: '#d1d5db',
    }).setOrigin(0.5);

    const onResize = (gameSize: Phaser.Structs.Size) => {
      const { width: w, height: h } = gameSize;
      this.cameras.resize(w, h);
      const base = Math.min(w, h);
      const titleSize = Math.max(28, Math.floor(base * 0.08));
      const subSize = Math.max(14, Math.floor(titleSize * 0.38));
      this.title.setFontSize(titleSize).setPosition(w / 2, h / 2 - Math.floor(titleSize * 0.4));
      this.subtitle.setFontSize(subSize).setPosition(w / 2, h / 2 + Math.floor(subSize * 0.8));
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));
  }
}


