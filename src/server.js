import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import configManager from './config-manager.js';
import { getStockData } from './stocks.js';
import { getStockNews } from './news.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Store reference to generateAndSendReport function
let generateAndSendReportFn = null;
let emailStatusRef = null;

export function setEmailFunctions(generateFn, statusRef) {
  generateAndSendReportFn = generateFn;
  emailStatusRef = statusRef;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.get('/api/stocks', async (req, res) => {
  try {
    const symbols = await configManager.getStockSymbols();
    res.json({ success: true, symbols });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/stocks', async (req, res) => {
  try {
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Symbol is required' });
    }
    if (!configManager.validateStock(symbol)) {
      return res.status(400).json({ success: false, error: 'Invalid stock symbol format' });
    }
    const symbols = await configManager.addStock(symbol);
    res.json({ success: true, symbols });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.delete('/api/stocks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const symbols = await configManager.removeStock(symbol);
    res.json({ success: true, symbols });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.put('/api/stocks', async (req, res) => {
  try {
    const { symbols } = req.body;
    if (!Array.isArray(symbols)) {
      return res.status(400).json({ success: false, error: 'Symbols must be an array' });
    }
    const invalidSymbols = symbols.filter(s => !configManager.validateStock(s));
    if (invalidSymbols.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid symbols: ${invalidSymbols.join(', ')}`
      });
    }
    const updatedSymbols = await configManager.updateStocks(symbols);
    res.json({ success: true, symbols: updatedSymbols });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/stocks/preview', async (req, res) => {
  try {
    const symbols = await configManager.getStockSymbols();
    const stockData = await getStockData(symbols);
    res.json({ success: true, data: stockData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/stocks/live', async (req, res) => {
  try {
    const symbols = await configManager.getStockSymbols();
    const stockData = await getStockData(symbols);
    res.json({ success: true, data: stockData, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/news/preview', async (req, res) => {
  try {
    const config = configManager.getConfig();
    const symbols = await configManager.getStockSymbols();
    const newsData = await getStockNews(symbols, config.newsApiKey);
    res.json({ success: true, data: newsData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/config', (req, res) => {
  try {
    const config = configManager.getConfig();
    const safeConfig = {
      emailTo: config.emailTo,
      cronSchedule: config.cronSchedule,
      stockCount: config.stockSymbols.length,
      hasEmailConfig: !!(config.emailUser && config.emailPass),
      hasNewsApi: !!config.newsApiKey
    };
    res.json({ success: true, config: safeConfig });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint with email status
app.get('/api/health', async (req, res) => {
  try {
    const config = configManager.getConfig();
    const redisStatus = await configManager.getEmailStatus();

    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      timezone: process.env.TZ || 'UTC',
      uptime: process.uptime(),
      email: {
        configured: !!(config.emailUser && config.emailPass),
        recipient: config.emailTo,
        cronSchedule: config.cronSchedule,
        ...(emailStatusRef || {}),
        ...(redisStatus ? { redis: redisStatus } : {})
      },
      redis: {
        connected: configManager.redisConnected
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    res.json({ success: true, health: healthData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual email trigger endpoint
app.post('/api/email/send', async (req, res) => {
  try {
    if (!generateAndSendReportFn) {
      return res.status(503).json({
        success: false,
        error: 'Email service not initialized'
      });
    }

    console.log('Manual email trigger requested');

    // Run the email generation in background
    generateAndSendReportFn().catch(err =>
      console.error('Error in manual email send:', err)
    );

    res.json({
      success: true,
      message: 'Email generation started. Check /api/health for status.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export function startWebServer() {
  app.listen(PORT, () => {
    console.log(`Web interface available at http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

export default app;