import Phaser from 'phaser';
import type { WhoAmIResponse } from '../../../shared/types/api';

type CardState = 'hidden' | 'revealed' | 'matched';

type Card = {
  id: number;
  index: number;
  row: number;
  col: number;
  state: CardState;
  container: Phaser.GameObjects.Container;
  frontText: Phaser.GameObjects.Text;
  backRect: Phaser.GameObjects.Rectangle;
};

type TurnOwner = 'player' | 'ai';

export default class Memory extends Phaser.Scene {
  constructor() {
    super('Memory');
  }

  private gridSize = 4;
  private emojis = ['🍎', '🚗', '⭐', '🐶', '🌙', '🎈', '⚽', '🎵'];
  private cards: Card[] = [];
  private firstSelected: Card | null = null;
  private isBusy = false;
  private currentTurn: TurnOwner = 'player';
  private playerPairs = 0;
  private aiPairs = 0;
  private turnsCount = 0;
  private backButton!: Phaser.GameObjects.Text;
  private username: string = 'Guest';

  private aiMemory = new Map<number, number>();
  private aiMemoryQueue: number[] = [];
  private readonly aiMemoryMax = 16;

  init(): void {
    this.cards = [];
    this.firstSelected = null;
    this.isBusy = false;
    this.currentTurn = 'player';
    this.playerPairs = 0;
    this.aiPairs = 0;
    this.turnsCount = 0;
    this.aiMemory.clear();
    this.aiMemoryQueue = [];
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor('#0f172a');
    this.input.setTopOnly(true);

    await this.fetchUsername();
    this.createBoard();
    this.createHUD();
    this.createBackButton();
    this.updateHUD();

    this.tweens.add({
      targets: this.cards.map(c => c.container),
      alpha: { from: 0, to: 1 },
      scale: { from: 0.85, to: 1 },
      duration: 400,
      ease: 'Back.easeOut',
      delay: (i: number) => i * 40,
    });

    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off('resize', this.onResize, this)
    );

    this.onResize(this.scale.gameSize);
  }

  private createBoard(): void {
    const totalPairs = (this.gridSize * this.gridSize) / 2;
    const ids = Array.from({ length: totalPairs }, (_, i) => i);
    const deck: number[] = this.shuffle([...ids, ...ids]);

    for (let i = 0; i < deck.length; i++) {
      const row = Math.floor(i / this.gridSize);
      const col = i % this.gridSize;
      const idNum = deck[i];
      if (idNum === undefined) continue;

      const container = this.add.container(0, 0).setAlpha(0);
      const back = this.add.rectangle(0, 0, 100, 140, 0x1f2937)
        .setStrokeStyle(3, 0x374151)
        .setOrigin(0.5);
      const front = this.add.text(0, 0, this.emojis[idNum] ?? '❓', {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: '48px',
        color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0);

      container.add([back, front]);
      container.setSize(100, 140);
      container.setInteractive();

      const card: Card = {
        id: idNum, index: i, row, col, state: 'hidden',
        container, frontText: front, backRect: back
      };
      this.cards.push(card);

      container.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        (ev as any)?.stopPropagation?.();
        if (this.currentTurn !== 'player') return;
        this.handleFlip(card);
      });
    }

    this.layoutCards();
  }

  private createHUD(): void {
    const { width, height } = this.scale;
    const hudContainer = this.add.container(0, 0);

    const s = Math.min(width / 720, height / 1280);
    const font = Math.max(16, Math.floor(28 * s));
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: `${font}px`,
      fontStyle: '600',
      color: '#f3f4f6',
      shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 4, fill: true },
      align: 'right',
    };

    const aiText = this.add.text(0, 0, 'AI: 0', textStyle).setOrigin(1, 0);
    const youText = this.add.text(0, font + 6, 'You: 0', textStyle).setOrigin(1, 0);

    hudContainer.add([aiText, youText]);
    hudContainer.setPosition(width - 20, 20);

    (this as any).aiText = aiText;
    (this as any).playerText = youText;
    (this as any).hudContainer = hudContainer;
  }

  private createBackButton(): void {
    const makeArrow = (label: string, onClick: () => void) => {
      const btn = this.add.text(0, 0, label, {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: 36,
        fontStyle: '700',
        color: '#f9fafb',
        backgroundColor: '#111827',
        padding: { x: 20, y: 12 } as any,
        align: 'center',
      })
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => btn.setStyle({ backgroundColor: '#1f2937' }))
        .on('pointerout', () => btn.setStyle({ backgroundColor: '#111827' }))
        .on('pointerdown', onClick);
      btn.setDepth(1000);
      btn.setScrollFactor(0);
      return btn;
    };
    this.backButton = makeArrow('⬅ Back', () => this.scene.start('MainMenu'));
    this.positionBackButton();
  }

  private onResize(size: Phaser.Structs.Size): void {
    const { width, height } = size;
    this.cameras.resize(width, height);
    this.layoutCards();
    this.positionBackButton();

    const s = Math.min(width / 720, height / 1280);
    const font = Math.max(16, Math.floor(28 * s));
    const hudContainer = (this as any).hudContainer as Phaser.GameObjects.Container;
    const aiText = (this as any).aiText as Phaser.GameObjects.Text;
    const youText = (this as any).playerText as Phaser.GameObjects.Text;
    if (aiText) aiText.setFontSize(font);
    if (youText) youText.setFontSize(font).setY(font + 6);
    if (hudContainer) hudContainer.setPosition(width - 20, 20);
  }

  private layoutCards(): void {
    const { width, height } = this.scale;
    const cols = this.gridSize;
    const rows = this.gridSize;

    // ⬆️ Increase padding for more space between cards
    const padding = Math.max(8, Math.min(width, height) * 0.015);

    const availableWidth = width - padding * (cols + 1);
    const availableHeight = height - padding * (rows + 2) - 80; // leave space for HUD

    // 🟥 Cards slightly shorter: use a height ratio
    const cardWidth = Math.floor(availableWidth / cols);
    const cardHeight = Math.floor((availableHeight / rows) * 0.8); // 0.8 = shorter cards

    const totalGridWidth = cardWidth * cols + padding * (cols - 1);
    const totalGridHeight = cardHeight * rows + padding * (rows - 1);

    const startX = (width - totalGridWidth) / 2 + cardWidth / 2;
    const startY = (height - totalGridHeight) / 2 + cardHeight / 2 + 40;

    for (const card of this.cards) {
      const x = startX + card.col * (cardWidth + padding);
      const y = startY + card.row * (cardHeight + padding);

      card.container.setPosition(x, y);
      card.container.setSize(cardWidth, cardHeight);

      card.backRect
        .setSize(cardWidth, cardHeight)
        .setOrigin(0.5)
        .setFillStyle(0x1f2937) // dark neutral background
        .setStrokeStyle(3, 0x374151); // lighter outline

      // Slightly rounder corners now that spacing increased
      (card.backRect as any).setCornerRadius?.(Math.min(cardWidth, cardHeight) * 0.15);

      const fontSize = Math.max(20, cardHeight * 0.45);
      card.frontText.setFontSize(fontSize);

      // Preserve interactive hit area
      card.container.setInteractive(
        new Phaser.Geom.Rectangle(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight),
        Phaser.Geom.Rectangle.Contains
      );
    }
  }

  private positionBackButton(): void {
    if (!this.backButton) return;
    const { width, height } = this.scale;
    const s = Math.min(width / 720, height / 1280);
    const font = Math.max(18, Math.floor(36 * s));
    const padX = Math.max(10, Math.floor(20 * s));
    const padY = Math.max(6, Math.floor(12 * s));
    this.backButton
      .setFontSize(font)
      .setPadding(padX, padY)
      .setPosition(12, 12)
      .setScale(1);
  }

  private handleFlip(card: Card): void {
    if (this.isBusy || card.state !== 'hidden') return;
    this.reveal(card);
    this.rememberForAI(card);

    if (!this.firstSelected) {
      this.firstSelected = card;
      return;
    }

    if (this.firstSelected && card.index === this.firstSelected.index) return;

    this.isBusy = true;
    const first = this.firstSelected;
    this.firstSelected = null;
    this.turnsCount += this.currentTurn === 'player' ? 1 : 0;

    if (first && first.id === card.id) {
      this.match(first, card);
      if (this.currentTurn === 'player') this.playerPairs++; else this.aiPairs++;
      this.isBusy = false;
      this.updateHUD();
      if (this.isGameComplete()) return void this.finishGame();
      if (this.currentTurn === 'ai') this.time.delayedCall(450, () => this.aiTurn());
    } else {
      this.time.delayedCall(700, () => {
        if (first) this.hide(first);
        this.hide(card);
        this.isBusy = false;
        this.switchTurn();
      });
    }
  }

  private switchTurn(): void {
    this.currentTurn = this.currentTurn === 'player' ? 'ai' : 'player';
    this.updateHUD();
    if (this.currentTurn === 'ai') this.time.delayedCall(450, () => this.aiTurn());
  }

  private aiTurn(): void {
    if (this.isBusy) return;
    const hidden = this.cards.filter(c => c.state === 'hidden');
    if (hidden.length < 2) return;

    const pair = this.findKnownPair();
    let first = pair?.[0] ?? this.pickRandom(hidden);
    let second: Card;

    if (pair) {
      second = pair[1];
    } else {
      const found = [...this.aiMemory.entries()].find(([idx, id]) => id === first.id && idx !== first.index);
      if (found) {
        const candidateIndex = found[0];
        const candidate = this.cards[candidateIndex];
        second = candidate?.state === 'hidden'
          ? candidate
          : this.pickRandom(hidden.filter(c => c.index !== first.index));
      } else {
        second = this.pickRandom(hidden.filter(c => c.index !== first.index));
      }
    }

    this.handleFlip(first);
    this.time.delayedCall(500, () => this.handleFlip(second));
  }

  private findKnownPair(): [Card, Card] | null {
    const idToIndices = new Map<number, number[]>();
    for (const [idx, id] of this.aiMemory.entries()) {
      const list = idToIndices.get(id) ?? [];
      list.push(idx);
      idToIndices.set(id, list);
    }
    for (const [_id, list] of idToIndices.entries()) {
      const hiddenIndices = list.filter(i => this.cards[i]?.state === 'hidden');
      if (hiddenIndices.length >= 2) {
        const idx0 = hiddenIndices[0];
        const idx1 = hiddenIndices[1];
        if (idx0 === undefined || idx1 === undefined) continue;
        const a = this.cards[idx0];
        const b = this.cards[idx1];
        if (a && b) return [a, b];
      }
    }
    return null;
  }

  private pickRandom(pool: Card[]): Card {
    return pool[Math.floor(Math.random() * pool.length)] ?? this.cards.find(c => c.state === 'hidden')!;
  }

  private rememberForAI(card: Card): void {
    if (!this.aiMemory.has(card.index)) {
      this.aiMemoryQueue.push(card.index);
    }
    this.aiMemory.set(card.index, card.id);
    while (this.aiMemoryQueue.length > this.aiMemoryMax) {
      const idx = this.aiMemoryQueue.shift();
      if (idx !== undefined) this.aiMemory.delete(idx);
    }
  }

  private reveal(card: Card): void {
    if (card.state !== 'hidden') return;
    card.state = 'revealed';
    card.container.disableInteractive();
    this.tweens.add({ targets: card.container, scale: 1.08, yoyo: true, duration: 120 });
    this.tweens.add({ targets: card.backRect, alpha: 0, duration: 120 });
    this.tweens.add({ targets: card.frontText, alpha: 1, duration: 120 });
  }

  private hide(card: Card): void {
    if (card.state !== 'revealed') return;
    card.state = 'hidden';
    card.container.setInteractive();
    this.tweens.add({ targets: card.backRect, alpha: 1, duration: 120 });
    this.tweens.add({ targets: card.frontText, alpha: 0, duration: 120 });
  }

  private match(a: Card, b: Card): void {
    a.state = 'matched';
    b.state = 'matched';
    a.container.disableInteractive();
    b.container.disableInteractive();
    this.tweens.add({
      targets: [a.container, b.container],
      scale: 1.15,
      yoyo: true,
      duration: 180,
      ease: 'Back.easeOut',
    });
  }

  private isGameComplete(): boolean {
    return this.cards.every(c => c.state === 'matched');
  }

  private async finishGame(): Promise<void> {
    const result = this.playerPairs === this.aiPairs
      ? 'draw'
      : this.playerPairs > this.aiPairs
        ? 'win'
        : 'lose';
    try {
      await fetch('/api/memory/highscore', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ score: this.playerPairs }),
      });
    } catch { }
    this.scene.start('GameOver', {
      game: 'Memory',
      result,
      playerPairs: this.playerPairs,
      aiPairs: this.aiPairs,
      turns: this.turnsCount,
      username: this.username,
    });
  }

  private updateHUD(): void {
    const { width, height } = this.scale;
    const s = Math.min(width / 720, height / 1280);
    const font = Math.max(16, Math.floor(28 * s));
    const aiText = (this as any).aiText as Phaser.GameObjects.Text;
    const playerText = (this as any).playerText as Phaser.GameObjects.Text;
    if (!aiText || !playerText) return;
    aiText.setFontSize(font).setText(`AI: ${this.aiPairs}`);
    playerText.setFontSize(font).setText(`You: ${this.playerPairs}`).setY(font + 6);
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j] as T;
      arr[j] = temp as T;
    }
    return arr;
  }

  private async fetchUsername(): Promise<void> {
    try {
      const res = await fetch('/api/whoami');
      const data = (await res.json()) as WhoAmIResponse;
      this.username = data.username ?? 'Guest';
    } catch {
      this.username = 'Guest';
    }
  }
}
