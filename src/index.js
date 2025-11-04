import cron from 'node-cron';
import dotenv from 'dotenv';
import { getStockData } from './stocks.js';
import { getStockNews } from './news.js';
import { createEmailTemplate, sendEmail } from './email.js';
import { startWebServer, setEmailGenerator, updateEmailStatus } from './server.js';
import configManager from './config-manager.js';

dotenv.config();

const config = configManager.getConfig();

async function generateAndSendReport() {
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] ====== CRON JOB TRIGGERED ======`);
  console.log(`Server Time: ${startTime.toString()}`);
  console.log(`UTC Time: ${startTime.toUTCString()}`);
  console.log(`Starting daily stock report generation...`);

  try {
    // Get latest config and stock symbols from Redis
    const currentConfig = configManager.getConfig();
    const stockSymbols = await configManager.getStockSymbols();

    console.log(`Configuration loaded:`);
    console.log(`  - Email To: ${currentConfig.emailTo}`);
    console.log(`  - Stock Symbols: ${stockSymbols.join(', ')}`);
    console.log(`  - Has Email Config: ${!!(currentConfig.emailUser && currentConfig.emailPass)}`);
    console.log(`  - Has News API: ${!!currentConfig.newsApiKey}`);

    // Fetch stock data
    console.log('Fetching stock data...');
    const stockData = await getStockData(stockSymbols);
    console.log(`Fetched data for ${stockData.length} stocks`);

    // Fetch news
    console.log('Fetching news articles...');
    const newsData = await getStockNews(stockSymbols, currentConfig.newsApiKey);
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
      console.log(`[${new Date().toISOString()}] ✅ Report sent successfully!`);
      updateEmailStatus('success');
    } else {
      console.error(`[${new Date().toISOString()}] ❌ Failed to send report`);
      updateEmailStatus('failed');
    }

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    console.log(`[${endTime.toISOString()}] Report generation completed in ${duration.toFixed(2)}s`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error generating report:`, error);
    console.error('Stack trace:', error.stack);
    updateEmailStatus(`error: ${error.message}`);
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
  const now = new Date();
  console.log('========================================');
  console.log('Stock Daily Email Service Starting...');
  console.log('========================================');
  console.log(`Current Time (ISO): ${now.toISOString()}`);
  console.log(`Current Time (UTC): ${now.toUTCString()}`);
  console.log(`Current Time (Local): ${now.toString()}`);
  console.log(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log(`Timezone Offset: ${now.getTimezoneOffset()} minutes from UTC`);
  console.log('========================================');

  validateConfig();

  // Check for command line arguments
  const args = process.argv.slice(2);

  if (args.includes('--test') || args.includes('-t')) {
    console.log('Running test report...');
    await generateAndSendReport();
    process.exit(0);
  }

  // Register email generator with server for manual triggers
  setEmailGenerator(generateAndSendReport);

  // Start web server
  startWebServer();

  // Schedule the daily email
  console.log('========================================');
  console.log('📅 CRON SCHEDULE CONFIGURATION');
  console.log('========================================');
  console.log(`Cron Expression: ${config.cronSchedule}`);
  console.log(`⚠️  IMPORTANT: Cron runs in UTC time zone!`);
  console.log(`Schedule Description: ${describeCronScheduleSimple(config.cronSchedule)}`);
  console.log('========================================');

  const cronJob = cron.schedule(config.cronSchedule, generateAndSendReport);

  console.log('✅ Service is running successfully!');
  console.log('');
  console.log('Available endpoints:');
  console.log(`  - GET  /api/health        - Check service health and timezone`);
  console.log(`  - POST /api/email/send    - Manually trigger email`);
  console.log(`  - GET  /api/config        - View configuration`);
  console.log('');
  console.log('Press Ctrl+C to stop.');

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\nShutting down service...');
    cronJob.stop();
    process.exit(0);
  });
}

function describeCronScheduleSimple(schedule) {
  const parts = schedule.split(' ');
  if (parts.length !== 5) return schedule;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  return `Every day at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC`;
}

main().catch(console.error);