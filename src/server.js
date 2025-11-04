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

// Store reference to email generation function
let emailGeneratorFunction = null;
let lastEmailSent = null;
let lastEmailStatus = null;

export function setEmailGenerator(fn) {
  emailGeneratorFunction = fn;
}

export function updateEmailStatus(status) {
  lastEmailSent = new Date().toISOString();
  lastEmailStatus = status;
}

// Manual email trigger endpoint for testing
app.post('/api/email/send', async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Manual email trigger received`);

    if (!emailGeneratorFunction) {
      return res.status(503).json({
        success: false,
        error: 'Email function not initialized'
      });
    }

    await emailGeneratorFunction();

    res.json({
      success: true,
      message: 'Email sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in manual email trigger:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint with timezone and cron info
app.get('/api/health', (req, res) => {
  try {
    const config = configManager.getConfig();
    const now = new Date();

    const healthInfo = {
      status: 'running',
      timestamp: now.toISOString(),
      serverTime: {
        iso: now.toISOString(),
        utc: now.toUTCString(),
        local: now.toString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: now.getTimezoneOffset()
      },
      cron: {
        schedule: config.cronSchedule,
        description: describeCronSchedule(config.cronSchedule)
      },
      lastEmail: {
        sent: lastEmailSent,
        status: lastEmailStatus
      },
      config: {
        hasEmailConfig: !!(config.emailUser && config.emailPass),
        hasNewsApi: !!config.newsApiKey,
        emailTo: config.emailTo,
        stockCount: config.stockSymbols.length
      }
    };

    res.json({ success: true, health: healthInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function describeCronSchedule(schedule) {
  const parts = schedule.split(' ');
  if (parts.length !== 5) return schedule;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  let description = `At ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC`;

  if (dayOfWeek !== '*') {
    description += ` on ${getDayName(dayOfWeek)}`;
  } else if (dayOfMonth !== '*') {
    description += ` on day ${dayOfMonth} of the month`;
  } else {
    description += ' every day';
  }

  return description;
}

function getDayName(dayOfWeek) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (dayOfWeek.includes('-')) {
    const [start, end] = dayOfWeek.split('-').map(d => parseInt(d));
    return `${days[start]} to ${days[end]}`;
  }
  if (dayOfWeek.includes(',')) {
    return dayOfWeek.split(',').map(d => days[parseInt(d)]).join(', ');
  }
  return days[parseInt(dayOfWeek)] || dayOfWeek;
}

export function startWebServer() {
  app.listen(PORT, () => {
    console.log(`Web interface available at http://localhost:${PORT}`);
  });
}

export default app;