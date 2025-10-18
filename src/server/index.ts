import express from 'express';
import { createServer, context, redis } from '@devvit/web/server';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

// Health
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

// Whoami (typed contract lives in shared)
app.get('/api/whoami', async (_req, res): Promise<void> => {
  try {
    const ctxAny = context as any;
    const username = ctxAny.user?.name || ctxAny.userName || null;
    res.json({ username });
  } catch (error) {
    console.error('whoami error:', error);
    res.status(200).json({ username: null });
  }
});

// Memory highscore (store best pairs matched for user)
app.get('/api/memory/highscore', async (_req, res): Promise<void> => {
  try {
    const ctxAny = context as any;
    const username: string | null = ctxAny.user?.name || ctxAny.userName || null;
    if (!username) return res.json({ score: null });
    const key = `user:${username}:memory:highscore`;
    const raw = await redis.get(key);
    res.json(raw ? JSON.parse(raw) : { score: null });
  } catch (error) {
    console.error('memory highscore get error:', error);
    res.status(200).json({ score: null });
  }
});

app.post('/api/memory/highscore', async (req, res): Promise<void> => {
  try {
    const { score } = req.body as { score: number };
    if (typeof score !== 'number' || !Number.isFinite(score)) return void res.status(400).json({ ok: false });
    const ctxAny = context as any;
    const username: string | null = ctxAny.user?.name || ctxAny.userName || null;
    if (!username) return void res.json({ ok: true });
    const key = `user:${username}:memory:highscore`;
    const raw = await redis.get(key);
    const current = raw ? (JSON.parse(raw) as { score: number }) : null;
    const best = current ? Math.max(current.score, score) : score;
    await redis.set(key, JSON.stringify({ score: best }));
    res.json({ ok: true, score: best });
  } catch (error) {
    console.error('memory highscore set error:', error);
    res.status(200).json({ ok: false });
  }
});

const port = process.env.WEBBIT_PORT || 3000;
const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port, () => console.log(`http://localhost:${port}`));
