import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from 'redis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.join(__dirname, '..', '.env');

export class ConfigManager {
  constructor() {
    this.redisClient = null;
    this.redisConnected = false;
    this.loadConfig();
    this.initRedis();
  }

  async initRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;

      if (!redisUrl) {
        console.log('No Redis URL found. Stock symbols will be stored in .env file (non-persistent on Railway)');
        return;
      }

      this.redisClient = createClient({ url: redisUrl });

      this.redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.redisConnected = false;
      });

      this.redisClient.on('connect', () => {
        console.log('Redis connected successfully');
        this.redisConnected = true;
      });

      await this.redisClient.connect();

      // Load stock symbols from Redis if available
      const redisSymbols = await this.redisClient.get('stock_symbols');
      if (redisSymbols) {
        this.config.stockSymbols = JSON.parse(redisSymbols);
        console.log('Loaded stock symbols from Redis:', this.config.stockSymbols);
      } else {
        // Initialize Redis with current symbols from env
        await this.redisClient.set('stock_symbols', JSON.stringify(this.config.stockSymbols));
        console.log('Initialized Redis with stock symbols from .env');
      }

    } catch (error) {
      console.error('Failed to initialize Redis:', error.message);
      this.redisConnected = false;
    }
  }

  loadConfig() {
    dotenv.config();
    this.config = {
      emailUser: process.env.EMAIL_USER,
      emailPass: process.env.EMAIL_PASS,
      emailTo: process.env.EMAIL_TO || 'tim@timli.net',
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
      smtpSecure: process.env.SMTP_SECURE === 'true',
      newsApiKey: process.env.NEWS_API_KEY,
      stockSymbols: this.parseStockSymbols(process.env.STOCK_SYMBOLS),
      cronSchedule: process.env.CRON_SCHEDULE || '0 8 * * *'
    };
  }

  parseStockSymbols(symbolsStr) {
    if (!symbolsStr) return ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
    return symbolsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  async getStockSymbols() {
    if (this.redisConnected && this.redisClient) {
      try {
        const symbols = await this.redisClient.get('stock_symbols');
        if (symbols) {
          this.config.stockSymbols = JSON.parse(symbols);
        }
      } catch (error) {
        console.error('Error reading from Redis:', error.message);
      }
    }
    return this.config.stockSymbols;
  }

  async addStock(symbol) {
    symbol = symbol.toUpperCase().trim();
    if (!symbol) throw new Error('Invalid stock symbol');

    await this.getStockSymbols(); // Refresh from Redis

    if (this.config.stockSymbols.includes(symbol)) {
      throw new Error(`Stock ${symbol} already exists`);
    }
    this.config.stockSymbols.push(symbol);
    await this.saveConfig();
    return this.config.stockSymbols;
  }

  async removeStock(symbol) {
    symbol = symbol.toUpperCase().trim();

    await this.getStockSymbols(); // Refresh from Redis

    const index = this.config.stockSymbols.indexOf(symbol);
    if (index === -1) {
      throw new Error(`Stock ${symbol} not found`);
    }
    this.config.stockSymbols.splice(index, 1);
    await this.saveConfig();
    return this.config.stockSymbols;
  }

  async updateStocks(symbols) {
    if (!Array.isArray(symbols)) {
      throw new Error('Symbols must be an array');
    }
    this.config.stockSymbols = symbols.map(s => s.toUpperCase().trim()).filter(s => s.length > 0);
    await this.saveConfig();
    return this.config.stockSymbols;
  }

  async saveConfig() {
    try {
      // Save to Redis if connected
      if (this.redisConnected && this.redisClient) {
        await this.redisClient.set('stock_symbols', JSON.stringify(this.config.stockSymbols));
        console.log('Stock symbols saved to Redis:', this.config.stockSymbols);
      } else {
        // Fallback to .env file
        let envContent = '';

        if (fs.existsSync(ENV_PATH)) {
          envContent = fs.readFileSync(ENV_PATH, 'utf8');
        }

        const stockSymbolsLine = `STOCK_SYMBOLS=${this.config.stockSymbols.join(',')}`;

        if (envContent.includes('STOCK_SYMBOLS=')) {
          envContent = envContent.replace(/STOCK_SYMBOLS=.*$/m, stockSymbolsLine);
        } else {
          if (envContent && !envContent.endsWith('\n')) {
            envContent += '\n';
          }
          envContent += stockSymbolsLine + '\n';
        }

        fs.writeFileSync(ENV_PATH, envContent);
        console.log('Stock symbols saved to .env file (non-persistent on Railway)');
      }

      process.env.STOCK_SYMBOLS = this.config.stockSymbols.join(',');

    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  getConfig() {
    return { ...this.config };
  }

  validateStock(symbol) {
    const validPattern = /^[A-Z0-9\.\-]{1,10}$/;
    return validPattern.test(symbol.toUpperCase());
  }
}

export default new ConfigManager();