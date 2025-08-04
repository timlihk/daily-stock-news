import cron from 'node-cron';
import dotenv from 'dotenv';
import { getStockData } from './stocks.js';
import { getStockNews } from './news.js';
import { createEmailTemplate, sendEmail } from './email.js';
import { startWebServer } from './server.js';
import configManager from './config-manager.js';

dotenv.config();

const config = configManager.getConfig();

async function generateAndSendReport() {
  console.log(`[${new Date().toISOString()}] Starting daily stock report generation...`);
  
  try {
    // Get latest config
    const currentConfig = configManager.getConfig();
    
    // Fetch stock data
    console.log('Fetching stock data...');
    const stockData = await getStockData(currentConfig.stockSymbols);
    console.log(`Fetched data for ${stockData.length} stocks`);
    
    // Fetch news
    console.log('Fetching news articles...');
    const newsData = await getStockNews(currentConfig.stockSymbols, currentConfig.newsApiKey);
    console.log(`Fetched ${newsData.length} news articles`);
    
    // Create email
    console.log('Creating email template...');
    const emailHtml = createEmailTemplate(stockData, newsData);
    
    // Send email
    const subject = `Stock Report - ${new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })}`;
    
    console.log(`Sending email to ${currentConfig.emailTo}...`);
    const success = await sendEmail(currentConfig, subject, emailHtml);
    
    if (success) {
      console.log(`[${new Date().toISOString()}] Report sent successfully!`);
    } else {
      console.error(`[${new Date().toISOString()}] Failed to send report`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error generating report:`, error);
  }
}

// Validate configuration
function validateConfig() {
  const required = ['emailUser', 'emailPass', 'newsApiKey'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.log('Please create a .env file based on .env.example and fill in the required values.');
    process.exit(1);
  }
  
  console.log('Configuration validated successfully');
  console.log(`Email will be sent to: ${config.emailTo}`);
  console.log(`Tracking stocks: ${config.stockSymbols.join(', ')}`);
  console.log(`Schedule: ${config.cronSchedule}`);
}

// Main execution
async function main() {
  console.log('Stock Daily Email Service Starting...');
  validateConfig();
  
  // Check for command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--test') || args.includes('-t')) {
    console.log('Running test report...');
    await generateAndSendReport();
    process.exit(0);
  }
  
  // Start web server
  startWebServer();
  
  // Schedule the daily email
  console.log(`Scheduling daily emails at: ${config.cronSchedule}`);
  cron.schedule(config.cronSchedule, generateAndSendReport);
  
  console.log('Service is running. Press Ctrl+C to stop.');
  
  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\nShutting down service...');
    process.exit(0);
  });
}

main().catch(console.error);