# Stock Daily Email Service

A Node.js application that tracks stock prices and sends daily email summaries with key news stories.

## Features

- 📈 Real-time stock price tracking using Yahoo Finance
- 📰 Latest news aggregation for tracked stocks
- 📧 Beautiful HTML email reports
- ⏰ Automated daily scheduling
- 🎯 Customizable stock watchlist
- 🖥️ Web interface for managing stock symbols

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

- **EMAIL_USER**: Your Gmail address (for sending emails)
- **EMAIL_PASS**: Your Gmail app password ([Create one here](https://myaccount.google.com/apppasswords))
- **EMAIL_TO**: Recipient email (already set to tim@timli.net)
- **NEWS_API_KEY**: Get a free API key from [NewsAPI](https://newsapi.org)
- **STOCK_SYMBOLS**: Comma-separated list of stock symbols to track (initial values)
- **CRON_SCHEDULE**: When to send daily emails (default: 8 AM daily)

### 3. Redis Setup (Required for Railway Deployment)

For persistent stock symbol storage on Railway:

1. Go to your Railway project dashboard
2. Click **"New"** → **"Database"** → **"Add Redis"**
3. Railway will automatically create a `REDIS_URL` environment variable
4. Your stock symbol edits will now persist across deployments!

**Note**: Without Redis, stock symbol changes made through the web interface will be lost when Railway redeploys. The app will fall back to using the `.env` file (non-persistent on Railway).

### 4. Gmail Setup

To use Gmail for sending emails:

1. Enable 2-factor authentication on your Google account
2. Generate an app-specific password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and generate a password
   - Use this password as EMAIL_PASS in your .env file

### 5. Run the Application

#### Test Mode (Send one email immediately):
```bash
npm start -- --test
```

#### Production Mode (Run continuously with scheduled emails and web interface):
```bash
npm start
```

The web interface will be available at http://localhost:3000

## Web Interface

Access the web interface at http://localhost:3000 to:
- Add/remove stock symbols from your watchlist
- View current stock prices
- Check configuration status
- See which stocks are being tracked

## Customization

### Stock Symbols
You can manage stocks through:
1. **Web Interface** (Recommended): Visit http://localhost:3000 or your Railway URL
   - Changes persist automatically when Redis is configured
   - Survives deployments and restarts
2. **Environment File**: Edit `STOCK_SYMBOLS` in Railway's environment variables dashboard
   - For initial setup or bulk changes
   - Also works in local `.env` file for development
```
STOCK_SYMBOLS=AAPL,GOOGL,MSFT,TSLA,AMZN,META,NVDA
```

### Email Schedule
The schedule uses cron format. Common examples:
- `0 8 * * *` - Every day at 8 AM
- `0 9 * * 1-5` - Weekdays at 9 AM
- `0 7,18 * * *` - Twice daily at 7 AM and 6 PM

## Running as a Service

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start src/index.js --name stock-emailer
pm2 save
pm2 startup
```

### Using systemd (Linux)
Create a service file at `/etc/systemd/system/stock-emailer.service`:
```ini
[Unit]
Description=Stock Daily Email Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/timlihk/daily_email
ExecStart=/usr/bin/node /home/timlihk/daily_email/src/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then enable and start:
```bash
sudo systemctl enable stock-emailer
sudo systemctl start stock-emailer
```

## Troubleshooting

- **Email not sending**: Check your Gmail app password and ensure 2FA is enabled
- **No news found**: Verify your NewsAPI key is valid and has remaining quota
- **Stock data errors**: Some international stocks may not be available through Yahoo Finance

## License

MIT