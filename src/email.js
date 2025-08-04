import nodemailer from 'nodemailer';
import { formatStockData } from './stocks.js';
import { formatNewsItem } from './news.js';

export function createEmailTemplate(stockData, newsData) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const stocksHtml = stockData.map(stock => formatStockData(stock)).join('');
  const newsHtml = newsData.map(article => formatNewsItem(article)).join('');
  
  const marketSummary = generateMarketSummary(stockData);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #2c3e50;
          border-bottom: 3px solid #3498db;
          padding-bottom: 10px;
        }
        h2 {
          color: #34495e;
          margin-top: 30px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px;
          margin-bottom: 30px;
        }
        .summary-box {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 0.9em;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="color: white; border: none; margin: 0;">📈 Daily Stock Report</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${date}</p>
      </div>
      
      <div class="summary-box">
        <h2>Market Overview</h2>
        ${marketSummary}
      </div>
      
      <h2>Stock Performance</h2>
      ${stocksHtml}
      
      <h2>Latest News</h2>
      ${newsHtml}
      
      <div class="footer">
        <p>This is an automated daily stock report.</p>
        <p>Generated at ${new Date().toLocaleTimeString('en-US')}</p>
      </div>
    </body>
    </html>
  `;
}

function generateMarketSummary(stockData) {
  const validStocks = stockData.filter(s => !s.error);
  if (validStocks.length === 0) return '<p>No market data available.</p>';
  
  const gainers = validStocks.filter(s => s.change > 0).length;
  const losers = validStocks.filter(s => s.change < 0).length;
  const unchanged = validStocks.filter(s => s.change === 0).length;
  
  const biggestGainer = validStocks.reduce((max, stock) => 
    (!max || stock.changePercent > max.changePercent) ? stock : max, null);
  const biggestLoser = validStocks.reduce((min, stock) => 
    (!min || stock.changePercent < min.changePercent) ? stock : min, null);
  
  return `
    <p><strong>Today's Summary:</strong></p>
    <ul>
      <li>📊 Tracking ${validStocks.length} stocks</li>
      <li>🟢 Gainers: ${gainers}</li>
      <li>🔴 Losers: ${losers}</li>
      ${unchanged > 0 ? `<li>⚪ Unchanged: ${unchanged}</li>` : ''}
      ${biggestGainer ? `<li>🚀 Biggest Gainer: ${biggestGainer.symbol} (+${biggestGainer.changePercent?.toFixed(2)}%)</li>` : ''}
      ${biggestLoser ? `<li>📉 Biggest Loser: ${biggestLoser.symbol} (${biggestLoser.changePercent?.toFixed(2)}%)</li>` : ''}
    </ul>
  `;
}

export async function sendEmail(config, subject, htmlContent) {
  // Use custom SMTP settings if provided, otherwise fall back to Gmail
  const smtpConfig = config.smtpHost ? {
    host: config.smtpHost,
    port: config.smtpPort || 587,
    secure: config.smtpSecure === 'true' || config.smtpSecure === true,
    auth: {
      user: config.emailUser,
      pass: config.emailPass
    }
  } : {
    service: 'gmail',
    auth: {
      user: config.emailUser,
      pass: config.emailPass
    }
  };
  
  const transporter = nodemailer.createTransport(smtpConfig);
  
  const mailOptions = {
    from: config.emailUser,
    to: config.emailTo,
    subject: subject,
    html: htmlContent
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}