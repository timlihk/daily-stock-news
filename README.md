# Stock Terminal

A professional financial terminal web application for real-time stock tracking, news aggregation, and automated daily email reports.

## Features

### 📊 Live Market Data Terminal
- **Real-time price streaming** from Yahoo Finance (updates every second)
- **Sortable columns**: Click any column header to sort by Ticker, Price, Change, % or Volume
- **Adjustable view**: Display 10, 25, or 50 stocks at a time
- **Professional interface** styled after Godel Terminal with Oxygen Mono font
- **Auto-refresh**: Live prices update automatically when feed is active

### 📰 Market News Feed
- Latest news aggregation for all tracked stocks
- Full-width vertical news feed
- News from multiple sources via NewsAPI
- Ticker-tagged news items with timestamps

### 🎯 Watchlist Management
- Add/remove stock symbols through web interface
- **Persistent storage** via Redis (changes survive deployments)
- Real-time watchlist updates
- Quick ticker removal with × button

### 📧 Automated Email Reports
- Daily HTML email summaries
- Stock performance overview
- Latest news for tracked tickers
- Customizable cron schedule

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
- **EMAIL_TO**: Recipient email address
- **NEWS_API_KEY**: Get a free API key from [NewsAPI](https://newsapi.org)
- **STOCK_SYMBOLS**: Comma-separated list of stock symbols (initial values)
- **CRON_SCHEDULE**: When to send daily emails (default: `0 8 * * *` = 8 AM daily)

### 3. Redis Setup (Required for Railway/Production)

For persistent stock symbol storage on Railway:

1. Go to your Railway project dashboard
2. Click **"New"** → **"Database"** → **"Add Redis"**
3. Railway will automatically create a `REDIS_URL` environment variable
4. Add the variable reference to your app service:
   - Click on your app service → **Variables** tab
   - Click **"New Variable"** → **"Add a Reference"**
   - Select your Redis service → Select `REDIS_URL`
   - Click **"Add"**

**Important**: Without Redis, stock symbol changes made through the web interface will be lost when Railway redeploys. The app will fall back to using the `.env` file (non-persistent on Railway).

### 4. Gmail Setup

To use Gmail for sending emails:

1. Enable 2-factor authentication on your Google account
2. Generate an app-specific password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and generate a password
   - Use this password as `EMAIL_PASS` in your `.env` file

### 5. Run the Application

#### Test Mode (Send one email immediately):
```bash
npm start -- --test
```

#### Production Mode (Run with web interface and scheduled emails):
```bash
npm start
```

The web interface will be available at http://localhost:3000

## Web Terminal Interface

Access the terminal at http://localhost:3000 (or your Railway URL)

### Live Market Data Panel
- **START/STOP button**: Toggle real-time price updates
- **Status indicator**: Shows LIVE (green dot) or OFFLINE
- **Row selector**: Choose to display 10, 25, or 50 stocks
- **Sortable columns**: Click column headers to sort
  - **Ticker**: Alphabetical sorting
  - **Price**: Sort by current price
  - **Change**: Sort by dollar change
  - **%**: Sort by percentage change
  - **Volume**: Sort by trading volume
- **Auto-refresh**: Prices update every second when live feed is active

### Watchlist Panel
- Add new tickers by typing symbol and clicking ADD
- Remove tickers by clicking the × button
- All changes persist to Redis automatically
- Supports most stock ticker symbols (US and international)

### Market News Panel
- Full-width news feed at bottom of screen
- Click REFRESH to load latest news
- News items show: Ticker tag, Date, Title, Source
- Scroll vertically to view more news
- Click article title to open in new tab

## Stock Symbol Management

You can manage your watchlist through:

1. **Web Interface** (Recommended):
   - Visit http://localhost:3000 or your Railway URL
   - Add/remove tickers in real-time
   - Changes persist automatically with Redis
   - Survives deployments and restarts

2. **Environment Variables** (Initial Setup):
   - Railway dashboard → Variables → `STOCK_SYMBOLS`
   - Format: `AAPL,GOOGL,MSFT,TSLA,AMZN,META,NVDA`
   - Also works in local `.env` file for development

## Email Schedule Customization

The schedule uses cron format. Edit `CRON_SCHEDULE` in your environment variables:

- `0 8 * * *` - Every day at 8 AM (default)
- `0 9 * * 1-5` - Weekdays at 9 AM
- `0 7,18 * * *` - Twice daily at 7 AM and 6 PM
- `0 */4 * * *` - Every 4 hours

## Running as a Service

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start src/index.js --name stock-terminal
pm2 save
pm2 startup
```

### Using systemd (Linux)
Create a service file at `/etc/systemd/system/stock-terminal.service`:

```ini
[Unit]
Description=Stock Terminal
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/daily_email
ExecStart=/usr/bin/node /path/to/daily_email/src/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then enable and start:
```bash
sudo systemctl enable stock-terminal
sudo systemctl start stock-terminal
```

## Deployment to Railway

1. **Push code to GitHub**:
   ```bash
   git push origin main
   ```

2. **Connect to Railway**:
   - Go to [Railway.app](https://railway.app)
   - Create new project from GitHub repo
   - Railway will auto-detect Node.js and deploy

3. **Add Redis database**:
   - In Railway project: **"New"** → **"Database"** → **"Add Redis"**
   - Link Redis to your app (see step 3 in Setup)

4. **Set environment variables** in Railway:
   - `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_TO`
   - `NEWS_API_KEY`
   - `STOCK_SYMBOLS` (initial list)
   - `CRON_SCHEDULE`
   - `PORT` (Railway sets this automatically)

5. **Access your terminal**:
   - Railway provides a public URL
   - Open in browser to use the web terminal

## Terminal Interface Design

The interface follows professional financial terminal aesthetics:

- **Font**: Oxygen Mono (monospace)
- **Theme**: Pure black background with white text
- **Borders**: Subtle white borders (10% opacity)
- **Colors**:
  - Positive changes: Bright green (#0f0)
  - Negative changes: Bright red (#f00)
  - Status live: Green dot with pulse animation
- **Layout**: Grid-based with clean panel separation
- **No gradients, shadows, or rounded corners** - pure terminal aesthetic

## API Endpoints

The application provides REST API endpoints:

- `GET /api/stocks` - Get watchlist symbols
- `POST /api/stocks` - Add a stock symbol
- `DELETE /api/stocks/:symbol` - Remove a stock symbol
- `GET /api/stocks/live` - Get real-time stock data
- `GET /api/news/preview` - Get latest news for watchlist
- `GET /api/config` - Get configuration status

## Troubleshooting

### Email not sending
- Check your Gmail app password is correct
- Ensure 2FA is enabled on your Google account
- Verify `EMAIL_USER` and `EMAIL_PASS` in environment variables

### No news found
- Verify your NewsAPI key is valid
- Check you haven't exceeded NewsAPI quota (free tier has limits)
- Some stocks may have limited news coverage

### Stock data errors
- Some international stocks may not be available through Yahoo Finance
- Check ticker symbol is correct (use uppercase)
- Wait a few seconds and try refreshing

### Live feed not updating
- Check browser console for errors (F12)
- Verify the server is running
- Ensure network connection is stable
- Try stopping and starting the live feed

### Redis connection issues on Railway
- Verify Redis service is running in Railway
- Check `REDIS_URL` variable reference is added to app
- View deployment logs for Redis connection messages

## Technology Stack

- **Backend**: Node.js with Express
- **Stock Data**: Yahoo Finance API (via yahoo-finance2)
- **News**: NewsAPI
- **Email**: Nodemailer
- **Scheduling**: node-cron
- **Database**: Redis (for persistent storage)
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Hosting**: Railway (recommended)

## License

MIT
