import cron from 'node-cron';
import dotenv from 'dotenv';
import { getStockData } from './stocks.js';
import { getStockNews } from './news.js';
import { createEmailTemplate, sendEmail } from './email.js';
import { startWebServer, setEmailFunctions } from './server.js';
import configManager from './config-manager.js';

dotenv.config();

const config = configManager.getConfig();

// Export status for health check endpoint
export const emailStatus = {
  lastAttempt: null,
  lastSuccess: null,
  lastError: null,
  cronSchedule: config.cronSchedule,
  timezone: process.env.TZ || 'UTC',
  totalAttempts: 0,
  totalSuccess: 0,
  totalFailures: 0
};

async function generateAndSendReport() {
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] Starting daily stock report generation...`);
  console.log(`[${startTime.toISOString()}] Server timezone: ${emailStatus.timezone}`);

  emailStatus.lastAttempt = startTime.toISOString();
  emailStatus.totalAttempts++;

  try {
    // Get latest config and stock symbols from Redis
    const currentConfig = configManager.getConfig();
    const stockSymbols = await configManager.getStockSymbols();

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
      emailStatus.lastSuccess = new Date().toISOString();
      emailStatus.totalSuccess++;
      emailStatus.lastError = null;
      console.log(`[${new Date().toISOString()}] Report sent successfully!`);

      // Store status in Redis if available
      await configManager.saveEmailStatus({
        lastSuccess: emailStatus.lastSuccess,
        lastAttempt: emailStatus.lastAttempt,
        success: true
      });
    } else {
      emailStatus.lastError = 'Failed to send email - check logs for details';
      emailStatus.totalFailures++;
      console.error(`[${new Date().toISOString()}] Failed to send report`);

      // Store status in Redis if available
      await configManager.saveEmailStatus({
        lastAttempt: emailStatus.lastAttempt,
        success: false,
        error: emailStatus.lastError
      });
    }
  } catch (error) {
    emailStatus.lastError = error.message;
    emailStatus.totalFailures++;
    console.error(`[${new Date().toISOString()}] Error generating report:`, error);

    // Store status in Redis if available
    await configManager.saveEmailStatus({
      lastAttempt: emailStatus.lastAttempt,
      success: false,
      error: error.message
    }).catch(err => console.error('Failed to save error status:', err));
  }
}

// Export for use in API
export { generateAndSendReport };

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
  console.log(`Server timezone: ${emailStatus.timezone}`);
  console.log(`Current server time: ${new Date().toISOString()}`);

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

  // Set email functions for API access
  setEmailFunctions(generateAndSendReport, emailStatus);

  // Schedule the daily email
  console.log(`Scheduling daily emails at: ${config.cronSchedule} (${emailStatus.timezone})`);
  const cronJob = cron.schedule(config.cronSchedule, generateAndSendReport);
  console.log(`Cron job scheduled: ${cronJob ? 'SUCCESS' : 'FAILED'}`);

  // Load previous email status from Redis
  const previousStatus = await configManager.getEmailStatus();
  if (previousStatus) {
    console.log('Previous email status loaded from Redis:');
    console.log(`  Last attempt: ${previousStatus.lastAttempt || 'Never'}`);
    console.log(`  Last success: ${previousStatus.lastSuccess || 'Never'}`);
    if (previousStatus.error) {
      console.log(`  Last error: ${previousStatus.error}`);
    }
  }

  console.log('Service is running. Press Ctrl+C to stop.');
  console.log('Use POST /api/email/send to manually trigger an email');
  console.log('Visit /api/health to check service status');

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\nShutting down service...');
    process.exit(0);
  });
}

main().catch(console.error);