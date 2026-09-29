import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { authRouter } from './server/routes/auth.routes.js';
import { teamsRouter } from './server/routes/teams.routes.js';
import { meetingsRouter } from './server/routes/meetings.routes.js';
import { tasksRouter } from './server/routes/tasks.routes.js';
import { chatRouter } from './server/routes/chat.routes.js';
import { dashboardRouter } from './server/routes/dashboard.routes.js';
import { commitmentsRouter } from './server/routes/commitments.routes.js';
import { decisionsRouter } from './server/routes/decisions.routes.js';
import { issuesRouter } from './server/routes/issues.routes.js';
import { notificationsRouter } from './server/routes/notifications.routes.js';
import { recordingsRouter } from './server/routes/recordings.routes.js';
import { demoRouter } from './server/routes/demo.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/recordings', recordingsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/commitments', commitmentsRouter);
app.use('/api/decisions', decisionsRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/demo', demoRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const details = typeof error === 'object' && error !== null
      ? error as { code?: string; type?: string; message?: string }
      : {};
    const tooLarge = details.code === 'LIMIT_FILE_SIZE' || details.type === 'entity.too.large';
    if (process.env.NODE_ENV === 'production') {
      console.error('Request failed', details.code || details.type || 'unhandled error');
    } else {
      console.error('Request failed:', error);
    }
    res.status(tooLarge ? 413 : 500).json({
      error: tooLarge ? 'The uploaded request is too large.' : 'An unexpected server error occurred.',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    const hostDisplay = process.env.HOST_DISPLAY || 'localhost';
    console.log(`Server listening on http://${hostDisplay}:${PORT} (bound to 0.0.0.0)`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
