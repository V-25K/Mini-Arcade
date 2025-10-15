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
  private titleText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private gradientTextureKey: string | null = null;

  private gridSize = { rows: 4, cols: 4 };
  private cardSize = 80; // fixed size; do not change on resize
  private cardSpacing = 20; // fixed spacing; do not change on resize
  private colors = [0xff5f6d, 0xffc371, 0x00e1ff, 0xff7b00, 0x8fff00, 0x9b59b6, 0xfff200, 0x1abc9c];
  private emojis = ['🍎', '🚗', '🐶', '🎧', '🌟', '🚀', '🍕', '🎲'];

  // Turn-based vs AI state
  private isPlayerTurn = true;
  private playerScore = 0;
  private aiScore = 0;
  private inputLocked = false;
  private aiMemory: Map<number, Set<number>> = new Map();

  constructor() {
    super('MemoryScene');
  }

  init(data: { username?: string }) {
    this.username = data?.username || 'Guest';
  }

  create() {
    const { width, height } = this.scale;

    // Reset state on (re)enter
    this.resetState();

    // Background gradient
    this.gradientTextureKey = this.createVerticalGradientTexture(
      width,
      height,
      [
        { offset: 0, color: 0xff5f6d },
        { offset: 1, color: 0xffc371 },
      ]
    );
    if (this.gradientTextureKey) {
      const bg = this.add.image(0, 0, this.gradientTextureKey).setOrigin(0).setDepth(-10);
      bg.displayWidth = width;
      bg.displayHeight = height;
    } else {
      this.cameras.main.setBackgroundColor('#2b2b2b');
    }

    // Title & HUD
    this.titleText = this.add.text(width / 2, 36, '🧠 Memory Match vs AI', {
      fontFamily: 'Verdana',
      fontSize: '32px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5, 0);

      this.scoreText = this.add.text(width / 2, 80, `Score  You ${this.playerScore} : ${this.aiScore} AI`, {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#fff',
    }).setOrigin(0.5, 0);

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

    this.createCards();

    // Input settings and slight guard on entry
    this.input.setTopOnly(true);
    this.inputLocked = true;
    this.time.delayedCall(150, () => { this.inputLocked = false; });

    // Initial responsive layout
    this.refreshLayout();

    // Responsive: handle viewport resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width: w, height: h } = gameSize;
      this.cameras.resize(w, h);
      this.refreshLayout();
    });
  }

  private resetState() {
    this.cards = [];
    this.flippedCards = [];
    this.turns = 0;
    this.isPlayerTurn = true;
    this.playerScore = 0;
    this.aiScore = 0;
    this.inputLocked = false;
    this.aiMemory.clear();
  }

  private createCards() {
    const totalPairs = (this.gridSize.rows * this.gridSize.cols) / 2;
    const indices = [...Array(totalPairs).keys()];
    let cardValues = [...indices, ...indices];
    cardValues = Phaser.Utils.Array.Shuffle(cardValues); // .Shuffle returns shuffled array, assign result
    cardValues = Phaser.Utils.Array.Shuffle(cardValues);

    const { positions } = this.calculateGridLayout();

    for (let r = 0; r < this.gridSize.rows; r++) {
      for (let c = 0; c < this.gridSize.cols; c++) {
        const row = positions[r];
        if (!row) continue;
        const pos = row[c];
        if (!pos) continue;
        const { x, y } = pos;
        const value = cardValues.length > 0 ? cardValues.pop()! : 0;

        const cardRect = this.add.rectangle(x, y, this.cardSize, this.cardSize, 0x000000);
        cardRect.setStrokeStyle(4, 0xffffff);
        cardRect.setInteractive({ useHandCursor: true });

        const label = this.add.text(x, y, this.emojis[value] ?? '❓', {
          fontFamily: 'Verdana',
          fontSize: `${Math.floor(this.cardSize * 0.6)}px`,
          color: '#000000',
        }).setOrigin(0.5);
        label.setVisible(false);
        label.setDepth(1);

        const card: Card = { sprite: cardRect, label, value, isFlipped: false, isMatched: false };
        const cardIndex = this.cards.length;
        this.cards.push(card);

        cardRect.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (pointer.rightButtonDown()) return;
          if (!this.isPlayerTurn || this.inputLocked) return;
          this.flipCard(card, cardIndex);
        });
      }
    }
  }

  private refreshLayout() {
    const { width, height } = this.scale;

    // Recreate gradient background to fill viewport
    if (this.gradientTextureKey) {
      this.textures.remove(this.gradientTextureKey);
      this.gradientTextureKey = null;
    }
    this.gradientTextureKey = this.createVerticalGradientTexture(width, height, [
      { offset: 0, color: 0xff5f6d },
      { offset: 1, color: 0xffc371 },
    ]);
    // Remove older background images before adding a new one
    this.children.list
      .filter((obj) => (obj as any).texture && (obj as any).texture.key?.startsWith('memory-gradient-'))
      .forEach((obj) => obj.destroy());
    if (this.gradientTextureKey) {
      const bg = this.add.image(0, 0, this.gradientTextureKey).setOrigin(0).setDepth(-10);
      bg.displayWidth = width;
      bg.displayHeight = height;
    }

    // Keep card size fixed; only reposition

    // Layout HUD
    this.titleText.setPosition(width / 2, 16 + 20);
    this.scoreText.setPosition(width / 2, 16 + 20 + 24 + 20);

    // Layout grid
    const { positions } = this.calculateGridLayout();
    let idx = 0;
    for (let r = 0; r < this.gridSize.rows; r++) {
      for (let c = 0; c < this.gridSize.cols; c++) {
        const pos = positions[r]?.[c];
        if (!pos) continue;
        const { x, y } = pos;
        const card = this.cards[idx++];
        if (!card || !card.sprite || !card.sprite.active) continue;
        card.sprite.setPosition(x, y);
        card.sprite.setDisplaySize(this.cardSize, this.cardSize);
        if (card.label && card.label.active) {
          card.label.setPosition(x, y);
          card.label.setFontSize(Math.floor(this.cardSize * 0.6));
        }
      }
    }
  }

  private calculateGridLayout() {
    const width = this.scale.width;
    const height = this.scale.height;
    const totalW = this.gridSize.cols * this.cardSize + (this.gridSize.cols - 1) * this.cardSpacing;
    const totalH = this.gridSize.rows * this.cardSize + (this.gridSize.rows - 1) * this.cardSpacing;
    const offsetX = Math.floor((width - totalW) / 2);
    // Place grid a bit lower to leave space for title/score
    const topPadding = 140;
    const offsetY = Math.floor((height - totalH) / 2 + Math.max(0, (topPadding - (height - totalH) / 4)) / 3);

    const positions: { x: number; y: number }[][] = [];
    for (let r = 0; r < this.gridSize.rows; r++) {
      const row: { x: number; y: number }[] = [];
      for (let c = 0; c < this.gridSize.cols; c++) {
        const x = offsetX + c * (this.cardSize + this.cardSpacing) + this.cardSize / 2;
        const y = offsetY + r * (this.cardSize + this.cardSpacing) + this.cardSize / 2;
        row.push({ x, y });
      }
      positions.push(row);
    }
    return { positions };
  }

  private flipCard(card: Card, index?: number) {
    if (card.isFlipped || card.isMatched || this.flippedCards.length >= 2) return;

    // Record revealed info into AI memory if index provided
    if (index !== undefined) {
      if (!this.aiMemory.has(card.value)) this.aiMemory.set(card.value, new Set());
      this.aiMemory.get(card.value)!.add(index);
    }

    this.tweens.add({
      targets: card.sprite,
      scaleX: 0,
      duration: 140,
      ease: 'Sine.easeIn',
      onComplete: () => {
        const faceColor = this.colors[card.value] ?? 0xffffff;
        card.sprite.setFillStyle(faceColor);
        card.label.setVisible(true);
        card.label.setAlpha(0);
        card.label.setScale(0.9);
        this.tweens.add({ targets: card.sprite, scaleX: 1, duration: 160, ease: 'Sine.easeOut' });
        this.tweens.add({ targets: card.label, alpha: 1, scaleX: 1, scaleY: 1, duration: 160, ease: 'Sine.easeOut', delay: 40 });
      }
    });

    card.isFlipped = true;
    this.flippedCards.push(card);

    if (this.flippedCards.length === 2) {
      this.turns += 1;
      this.inputLocked = true;
      this.time.delayedCall(700, () => this.checkMatch());
    }
  }

  private checkMatch() {
    if (this.flippedCards.length !== 2) {
      return;
    }
    const [c1, c2] = this.flippedCards as [Card, Card];
    if (c1.value === c2.value) {
      c1.isMatched = true;
      c2.isMatched = true;
      if (this.isPlayerTurn) {
        this.playerScore += 1;
      } else {
        this.aiScore += 1;
      }
      this.scoreText.setText(`Score  You ${this.playerScore} : ${this.aiScore} AI`);
    } else {
      [c1, c2].forEach((card: Card) => {
        this.tweens.add({ targets: card.label, alpha: 0, duration: 100, ease: 'Sine.easeIn' });
        this.tweens.add({
          targets: card.sprite,
          scaleX: 0,
          duration: 140,
          ease: 'Sine.easeIn',
          onComplete: () => {
            card.sprite.setFillStyle(0x000000);
            card.label.setVisible(false);
            this.tweens.add({ targets: card.sprite, scaleX: 1, duration: 160, ease: 'Sine.easeOut' });
          }
        });
        card.isFlipped = false;
      });
      // Switch turn only on mismatch
      this.isPlayerTurn = !this.isPlayerTurn;
    }
    this.flippedCards = [];
    this.inputLocked = false;

    // Check win
    if (this.cards.every(c => c.isMatched)) {
      // Disable further card input
      this.cards.forEach(card => {
        card.sprite.disableInteractive();
      });

      this.time.delayedCall(300, () => {
        const { width, height } = this.scale;

        // Dim overlay (blocks input & sits above cards)
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6)
          .setOrigin(0)
          .setDepth(100)
          .setInteractive({ useHandCursor: false });

        // Result card
        const panelWidth = Math.min(520, width * 0.9);
        const panelHeight = 260;
        const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x1f2937, 1)
          .setStrokeStyle(4, 0xffffff)
          .setOrigin(0.5)
          .setScale(0.9)
          .setDepth(110);

        this.tweens.add({ targets: panel, scale: 1, duration: 200, ease: 'Back.Out' });

        this.add.text(width / 2, height / 2 - 80, '🎉 Game Over', {
          fontFamily: 'Verdana',
          fontSize: '34px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 6,
        }).setOrigin(0.5).setDepth(120);

        this.add.text(width / 2, height / 2 - 20, `You ${this.playerScore} : ${this.aiScore} AI`, {
          fontFamily: 'Verdana',
          fontSize: '28px',
          color: '#ffeb3b',
        }).setOrigin(0.5).setDepth(120);

        this.add.text(width / 2, height / 2 + 16, `Turns: ${this.turns}`, {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#ffffff',
        }).setOrigin(0.5).setDepth(120);

        // Button-like back label
        const back = this.add.text(width / 2, height / 2 + 72, 'Return to Menu', {
          fontFamily: 'Verdana',
          fontSize: '22px',
          color: '#000000',
          backgroundColor: '#ffffff',
          padding: { x: 18, y: 10 } as any,
        }).setOrigin(0.5).setDepth(120).setInteractive({ useHandCursor: true });

        back.on('pointerover', () => back.setStyle({ backgroundColor: '#ffeb3b' }));
        back.on('pointerout', () => back.setStyle({ backgroundColor: '#ffffff' }));
        back.on('pointerup', () => {
          this.scene.start('MenuScene', { username: this.username });
        });

        // Replay button
        const replay = this.add.text(width / 2, height / 2 + 110, 'Replay', {
          fontFamily: 'Verdana',
          fontSize: '22px',
          color: '#000000',
          backgroundColor: '#ffeb3b',
          padding: { x: 18, y: 10 } as any,
        }).setOrigin(0.5).setDepth(120).setInteractive({ useHandCursor: true });
        replay.on('pointerover', () => replay.setStyle({ backgroundColor: '#ffe066' }));
        replay.on('pointerout', () => replay.setStyle({ backgroundColor: '#ffeb3b' }));
        replay.on('pointerup', () => {
          // Restart scene fresh; reset scoreboard immediately
          this.resetState();
          this.scene.restart({ username: this.username });
        });
      });
      return;
    }

    // If AI turn, schedule move
    if (!this.isPlayerTurn) {
      this.time.delayedCall(500, () => this.aiTakeTurn());
    }
  }

  private aiTakeTurn() {
    // Medium difficulty AI
    const availableIndices = this.cards
      .map((card, idx) => ({ card, idx }))
      .filter(({ card }) => !card.isMatched && !card.isFlipped)
      .map(({ idx }) => idx);

    if (availableIndices.length === 0) return;

    // Known pair
    let chosen: number[] | null = null;
    for (const set of this.aiMemory.values()) {
      const candidates = [...set].filter((i) => {
        const card = this.cards[i];
        return card && !card.isMatched && !card.isFlipped;
      });
      if (candidates.length >= 2) {
        chosen = candidates.slice(0, 2);
        break;
      }
    }

    // One known + one random
    if (!chosen) {
      const singles: { value: number; index: number }[] = [];
      for (const [value, set] of this.aiMemory.entries()) {
        const filtered = [...set].filter((i) => {
          const c = this.cards[i];
          return c !== undefined && !c.isMatched && !c.isFlipped;
        });
        if (
          filtered.length === 1 &&
          typeof filtered[0] === 'number'
        ) {
          singles.push({ value, index: filtered[0] });
        }
      }
      if (singles.length > 0 && availableIndices.length > 1) {
        const pick = Phaser.Utils.Array.GetRandom(singles);
        const others = availableIndices.filter((i) => i !== pick.index);
        if (others.length > 0) chosen = [pick.index, Phaser.Utils.Array.GetRandom(others)];
      }
    }

    // Random two
    if (!chosen) {
      Phaser.Utils.Array.Shuffle(availableIndices);
      chosen = availableIndices.slice(0, Math.min(2, availableIndices.length));
    }

    if (!chosen || chosen.length === 0) return;

    this.inputLocked = true;
    const first = chosen[0]!;
    const second = chosen[1] !== undefined ? chosen[1]! : chosen[0]!;
    if (
      typeof first === "number" &&
      this.cards[first] !== undefined
    ) {
      this.flipCard(this.cards[first], first);
    }
    this.time.delayedCall(500, () => {
      if (
        typeof second === "number" &&
        this.cards[second] !== undefined
      ) {
        this.flipCard(this.cards[second], second);
      }
    });
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
