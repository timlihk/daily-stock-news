import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import configManager from './config-manager.js';
import { getStockData } from './stocks.js';

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
    const stockData = await getStockData(symbols.slice(0, 5));
    res.json({ success: true, data: stockData });
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

export function startWebServer() {
  app.listen(PORT, () => {
    console.log(`Web interface available at http://localhost:${PORT}`);
  });
}

export default app;