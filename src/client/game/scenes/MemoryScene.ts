import Phaser from 'phaser';

interface Card {
  sprite: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  value: number; // index into palettes/emojis arrays
  isFlipped: boolean;
  isMatched: boolean;
}

export default class MemoryScene extends Phaser.Scene {
  private username: string = 'Guest';
  private cards: Card[] = [];
  private flippedCards: Card[] = [];
  private turns: number = 0;
  private timer: number = 0;
  private timerText!: Phaser.GameObjects.Text;
  private turnsText!: Phaser.GameObjects.Text;
  private timerEvent!: Phaser.Time.TimerEvent;
  private gradientTextureKey: string | null = null;

  private gridSize = { rows: 4, cols: 4 };
  private cardSize = 80;
  private cardSpacing = 20;
  private colors = [0xff5f6d, 0xffc371, 0x00e1ff, 0xff7b00, 0x8fff00, 0x9b59b6, 0xfff200, 0x1abc9c];
  private emojis = ['🍎', '🚗', '🐶', '🎧', '🌟', '🚀', '🍕', '🎲'];

  constructor() {
    super('MemoryScene');
    console.log('MemoryScene constructor called');
  }

  init(data: { username?: string }) {
    this.username = data?.username || 'Guest';
  }

  create() {
    console.log('MemoryScene create() called');
    const { width, height } = this.scale;

    // Background gradient (same as menu)
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
      this.cameras.main.setBackgroundColor('#2b2b2b');
    }

    // HUD
    this.timerText = this.add.text(width - 20, 20, 'Time: 0', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#fff',
    }).setOrigin(1, 0);

    this.turnsText = this.add.text(20, 20, 'Turns: 0', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#fff',
    }).setOrigin(0, 0);

    // Back button
    const backBtn = this.add.text(20, height - 40, '← Back to Menu', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#fff',
      backgroundColor: '#00000055',
      padding: { x: 15, y: 8 } as any,
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });

    backBtn.on('pointerup', () => {
      this.scene.start('MenuScene', { username: this.username });
    });

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.timer += 1;
        this.timerText.setText(`Time: ${this.timer}`);
      }
    });

    this.createCards();
  }

  private createCards() {
    const totalPairs = (this.gridSize.rows * this.gridSize.cols) / 2;
    const indices = [...Array(totalPairs).keys()];
    let cardValues = [...indices, ...indices];
    Phaser.Utils.Array.Shuffle(cardValues);

    const offsetX = (this.scale.width - (this.gridSize.cols * this.cardSize + (this.gridSize.cols - 1) * this.cardSpacing)) / 2;
    const offsetY = (this.scale.height - (this.gridSize.rows * this.cardSize + (this.gridSize.rows - 1) * this.cardSpacing)) / 2;

    for (let r = 0; r < this.gridSize.rows; r++) {
      for (let c = 0; c < this.gridSize.cols; c++) {
        const x = offsetX + c * (this.cardSize + this.cardSpacing) + this.cardSize / 2;
        const y = offsetY + r * (this.cardSize + this.cardSpacing) + this.cardSize / 2;
        const value = cardValues.pop()!;

        const cardRect = this.add.rectangle(x, y, this.cardSize, this.cardSize, 0x000000);
        cardRect.setStrokeStyle(4, 0xffffff);
        cardRect.setInteractive({ useHandCursor: true });

        const label = this.add.text(x, y, this.emojis[value] ?? '❓', {
          fontFamily: 'Verdana',
          fontSize: `${Math.floor(this.cardSize * 0.6)}px`,
          color: '#000000',
        }).setOrigin(0.5);
        label.setVisible(false);

        const card: Card = { sprite: cardRect, label, value, isFlipped: false, isMatched: false };
        this.cards.push(card);

        cardRect.on('pointerup', () => this.flipCard(card));
      }
    }
  }

  private flipCard(card: Card) {
    if (card.isFlipped || card.isMatched || this.flippedCards.length >= 2) return;

    this.tweens.add({
      targets: card.sprite,
      scaleX: 0,
      duration: 150,
      onComplete: () => {
        // Set face color and show emoji
        const faceColor = this.colors[card.value] ?? 0xffffff;
        card.sprite.setFillStyle(faceColor);
        card.label.setVisible(true);
        this.tweens.add({
          targets: card.sprite,
          scaleX: 1,
          duration: 150,
        });
      }
    });

    card.isFlipped = true;
    this.flippedCards.push(card);

    if (this.flippedCards.length === 2) {
      this.turns += 1;
      this.turnsText.setText(`Turns: ${this.turns}`);
      this.time.delayedCall(700, () => this.checkMatch());
    }
  }

  private checkMatch() {
    const [c1, c2] = this.flippedCards;
    if (c1.value === c2.value) {
      c1.isMatched = true;
      c2.isMatched = true;
    } else {
      [c1, c2].forEach(card => {
        this.tweens.add({
          targets: card.sprite,
          scaleX: 0,
          duration: 150,
          onComplete: () => {
            card.sprite.setFillStyle(0x000000);
            card.label.setVisible(false);
            this.tweens.add({
              targets: card.sprite,
              scaleX: 1,
              duration: 150,
            });
          }
        });
        card.isFlipped = false;
      });
    }
    this.flippedCards = [];

    // Check win
    if (this.cards.every(c => c.isMatched)) {
      // Stop timer updates
      if (this.timerEvent) {
        this.timerEvent.remove(false);
      }

      // Disable further card input
      this.cards.forEach(card => {
        card.sprite.disableInteractive();
      });

      this.time.delayedCall(300, () => {
        const { width, height } = this.scale;

        // Score summary text (clickable)
        const summary = this.add
          .text(
            width / 2,
            height / 2,
            `🎉 Well played, u/${this.username}!
Turns: ${this.turns}   Time: ${this.timer}s

Click here to return to Menu`,
            {
              fontFamily: 'Verdana',
              fontSize: '28px',
              color: '#ffffff',
              align: 'center',
              stroke: '#000000',
              strokeThickness: 6,
            }
          )
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });

        summary.on('pointerup', () => {
          this.scene.start('MenuScene', { username: this.username });
        });
      });
    }
  }

  private createVerticalGradientTexture(
    width: number,
    height: number,
    colorStops: { offset: number; color: number }[]
  ): string | null {
    const key = `memory-gradient-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
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
