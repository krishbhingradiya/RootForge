// RootForge AI Solution Builder API Server
import './config/env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory paths canonically across Windows, macOS, and Linux
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '..', 'uploads');

// Import route modules
import authRoutes from './routes/auth.routes.js';
import workspaceRoutes from './routes/workspace.routes.js';
import documentRoutes from './routes/document.routes.js';
import discoveryRoutes from './routes/discovery.routes.js';
import chatRoutes from './routes/chat.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import solutionRoutes from './routes/solution.routes.js';
import architectureRoutes from './routes/architecture.routes.js';
import processRoutes from './routes/process.routes.js';
import uxRoutes from './routes/ux.routes.js';
import databaseRoutes from './routes/database.routes.js';
import apiRoutes from './routes/api.routes.js';
import planningRoutes from './routes/planning.routes.js';
import collaborationRoutes from './routes/collaboration.routes.js';
import versionRoutes from './routes/version.routes.js';
import exportRoutes from './routes/export.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { aiService } from './ai/aiService.js';
import { geminiConfig } from './ai/config/geminiConfig.js';
import { providerRouter } from './ai/providers/providerRouter.js';

const app = express();
const PORT = process.env.PORT || 5005;

// Parse configured frontend URLs (comma-separated support)
const configuredOrigins = [
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(s => s.trim()) : []),
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : []),
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : [])
].filter(Boolean);

// Allowed frontend origins for dev, web, and mobile (support Vite, Vercel, Capacitor Android, iOS)
const allowedOrigins = [
  ...configuredOrigins,
  'http://localhost:5175',
  'http://localhost:5173',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5173',
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
  'http://10.0.2.2:5005',
  'http://10.0.2.2:5175'
].filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('http://10.0.2.2') ||
      origin.startsWith('capacitor://') ||
      origin.startsWith('ionic://')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving (canonically resolved)
app.use('/uploads', express.static(uploadsDir));

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'RootForge backend',
    status: 'running'
  });
});

// Production Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RootForge backend'
  });
});

// Detailed API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    product: 'AI Solution Builder API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ai: aiService.getProviderStatus()
  });
});

// Diagnostic endpoint: GET /api/health/ai (Requirement 18)
// Returns ONLY safe non-secret telemetry
app.get('/api/health/ai', async (req, res) => {
  try {
    const configuredProvider = providerRouter.getConfiguredProviderName();
    const sanitized = geminiConfig.getSanitizedConfig();

    if (configuredProvider === 'demo') {
      return res.json({
        provider: 'demo',
        configured: true,
        authenticated: true,
        model: 'deterministic',
        status: 'healthy'
      });
    }

    const pingResult = await providerRouter.ping();

    return res.json({
      provider: pingResult.provider || 'gemini',
      configured: Boolean(pingResult.configured),
      authenticated: Boolean(pingResult.authenticated),
      model: pingResult.model || sanitized.model,
      status: pingResult.status?.toLowerCase() || 'unknown',
      ...(pingResult.errorMessage ? { errorCategory: pingResult.errorCategory, error: pingResult.errorMessage } : {})
    });
  } catch (err) {
    return res.status(500).json({
      provider: 'gemini',
      configured: geminiConfig.isConfigured(),
      authenticated: false,
      model: geminiConfig.getModel(),
      status: 'unhealthy',
      error: err.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces', documentRoutes);
app.use('/api/workspaces', discoveryRoutes);
app.use('/api/workspaces', chatRoutes);
app.use('/api/workspaces', analysisRoutes);
app.use('/api/workspaces', solutionRoutes);
app.use('/api/workspaces', architectureRoutes);
app.use('/api/workspaces', processRoutes);
app.use('/api/workspaces', uxRoutes);
app.use('/api/workspaces', databaseRoutes);
app.use('/api/workspaces', apiRoutes);
app.use('/api/workspaces', planningRoutes);
app.use('/api/workspaces', collaborationRoutes);
app.use('/api/workspaces', versionRoutes);
app.use('/api/workspaces', exportRoutes);
app.use('/api/admin', adminRoutes);

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const isProd = process.env.NODE_ENV === 'production';
  const statusCode = err.status || err.statusCode || 500;
  const message = (isProd && statusCode === 500) 
    ? 'Internal Server Error' 
    : (err.message || 'Internal Server Error');

  res.status(statusCode).json({
    error: message
  });
});

const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`=========================================`);
  console.log(` AI SOLUTION BUILDER — BACKEND API SERVER`);
  console.log(` Bound to: http://${HOST}:${PORT}`);
  console.log(` Local:    http://localhost:${PORT}`);
  console.log(` Emulator: http://10.0.2.2:${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=========================================`);
  const safeGemini = geminiConfig.getSanitizedConfig();
  console.log(`GEMINI_CONFIG:`);
  console.log(`provider=${safeGemini.provider}`);
  console.log(`model=${safeGemini.model}`);
  console.log(`apiKeyConfigured=${safeGemini.apiKeyConfigured}`);
  console.log(`=========================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] Port ${PORT} is already in use!`);
    console.error(`Another process is already running on port ${PORT}. Please stop it or choose another PORT in .env.\n`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

// Graceful shutdown on restart/termination
const shutdown = (signal) => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

