import Phaser from 'phaser';

type Data = {
  game: string;
  result: 'win' | 'lose' | 'draw';
  playerPairs?: number;
  aiPairs?: number;
  turns?: number;
  username?: string;
};

export default class GameOver extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private scoreContainer!: Phaser.GameObjects.Container;
  private playAgainBtn!: Phaser.GameObjects.Text;
  private backToMenuBtn!: Phaser.GameObjects.Text;

  constructor() {
    super('GameOver');
  }

  create(data: Data): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0f172a');

    // Create title with result
    const resultText = data.result === 'win' ? 'You Won!' : data.result === 'lose' ? 'You Lost!' : 'It\'s a Draw!';
    this.titleText = this.add
      .text(width / 2, height * 0.25, resultText, {
        fontFamily: 'Arial Black',
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5);

    // Create scoreboard container with background
    this.createScoreboard(data);

    // Create buttons
    this.createButtons();

    // Setup resize handling
    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.onResize, this));
    
    this.onResize(this.scale.gameSize);
  }

  private createScoreboard(data: Data): void {
    const { width, height } = this.scale;
    const s = Math.min(width / 720, height / 1280);
    
    // Create background panel
    const panelWidth = Math.max(280, 280 * s);
    const panelHeight = Math.max(120, 120 * s);
    const bgPanel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a1a, 0.95)
      .setStrokeStyle(3, 0x374151, 0.8)
      .setOrigin(0.5);

    // Create score texts
    const font = Math.max(20, Math.floor(32 * s));
    const scoreStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: `${font}px`,
      fontStyle: '700',
      color: '#ffffff',
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true },
      align: 'center',
    };

    const aiScore = this.add.text(-panelWidth/4, 0, `AI: ${data.aiPairs ?? 0}`, scoreStyle).setOrigin(0.5);
    const playerScore = this.add.text(panelWidth/4, 0, `You: ${data.playerPairs ?? 0}`, scoreStyle).setOrigin(0.5);

    // Create container for all scoreboard elements
    this.scoreContainer = this.add.container(width / 2, height * 0.45);
    this.scoreContainer.add([bgPanel, aiScore, playerScore]);
  }

  private createButtons(): void {
    const { width, height } = this.scale;
    const s = Math.min(width / 720, height / 1280);
    const font = Math.max(20, Math.floor(28 * s));
    const padX = Math.max(16, Math.floor(24 * s));
    const padY = Math.max(8, Math.floor(12 * s));

    const buttonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial Black',
      fontSize: `${font}px`,
      color: '#ffffff',
      backgroundColor: '#444444',
      padding: { x: padX, y: padY } as any,
      align: 'center',
    };

    this.playAgainBtn = this.add
      .text(width / 2, height * 0.65, 'Play Again', buttonStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.playAgainBtn.setStyle({ backgroundColor: '#555555' }))
      .on('pointerout', () => this.playAgainBtn.setStyle({ backgroundColor: '#444444' }))
      .on('pointerdown', () => this.scene.start('Memory'));

    this.backToMenuBtn = this.add
      .text(width / 2, height * 0.75, 'Back to Menu', buttonStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.backToMenuBtn.setStyle({ backgroundColor: '#555555' }))
      .on('pointerout', () => this.backToMenuBtn.setStyle({ backgroundColor: '#444444' }))
      .on('pointerdown', () => this.scene.start('MainMenu'));
  }

  private onResize(size: Phaser.Structs.Size): void {
    const { width, height } = size;
    this.cameras.resize(width, height);
    const s = Math.min(width / 720, height / 1280);

    // Update title
    const titleFont = Math.max(24, Math.floor(48 * s));
    this.titleText
      .setFontSize(titleFont)
      .setPosition(width / 2, height * 0.25);

    // Update scoreboard
    if (this.scoreContainer) {
      const panelWidth = Math.max(280, 280 * s);
      const panelHeight = Math.max(120, 120 * s);
      const font = Math.max(20, Math.floor(32 * s));
      
      this.scoreContainer.setPosition(width / 2, height * 0.45);
      
      // Update background panel
      const bgPanel = this.scoreContainer.list[0] as Phaser.GameObjects.Rectangle;
      if (bgPanel) {
        bgPanel.setSize(panelWidth, panelHeight);
      }
      
      // Update score texts
      const aiScore = this.scoreContainer.list[1] as Phaser.GameObjects.Text;
      const playerScore = this.scoreContainer.list[2] as Phaser.GameObjects.Text;
      if (aiScore) {
        aiScore.setFontSize(font).setPosition(-panelWidth/4, 0);
      }
      if (playerScore) {
        playerScore.setFontSize(font).setPosition(panelWidth/4, 0);
      }
    }

    // Update buttons
    const btnFont = Math.max(20, Math.floor(28 * s));
    const padX = Math.max(16, Math.floor(24 * s));
    const padY = Math.max(8, Math.floor(12 * s));

    if (this.playAgainBtn) {
      this.playAgainBtn
        .setFontSize(btnFont)
        .setPadding(padX, padY)
        .setPosition(width / 2, height * 0.65);
    }

    if (this.backToMenuBtn) {
      this.backToMenuBtn
        .setFontSize(btnFont)
        .setPadding(padX, padY)
        .setPosition(width / 2, height * 0.75);
    }
  }
}


