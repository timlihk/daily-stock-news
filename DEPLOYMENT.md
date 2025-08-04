# 🚀 Deployment Guide - Stock Daily Email Service

This guide will help you deploy your stock email service to run 24/7 on the internet.

## 📋 Prerequisites

1. **Gmail App Password**: Create an app password for your Gmail account
   - Go to Google Account settings → Security → 2-Step Verification → App passwords
   - Generate password for "Mail"

2. **News API Key**: Get a free API key from [newsapi.org](https://newsapi.org)

3. **GitHub Account**: For code repository

## 🎯 Recommended: Railway Deployment

Railway is the easiest and most cost-effective option ($5/month for persistent usage).

### Step 1: Prepare Your Code

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/stock-daily-email.git
   git push -u origin main
   ```

### Step 2: Deploy on Railway

1. **Sign up**: Go to [railway.app](https://railway.app) and sign up with GitHub
2. **Create New Project**: Click "New Project" → "Deploy from GitHub repo"
3. **Select Repository**: Choose your stock-daily-email repository
4. **Configure Environment Variables**: Click on your service → Variables tab, add:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_TO=recipient@email.com
NEWS_API_KEY=your-newsapi-key
STOCK_SYMBOLS=AAPL,GOOGL,MSFT,TSLA,AMZN
CRON_SCHEDULE=0 8 * * *
```

5. **Deploy**: Railway will automatically build and deploy your service
6. **Get URL**: Your service will be available at a URL like `https://your-app.railway.app`

### Step 3: Verify Deployment

- Visit your Railway URL to see the web interface
- Check logs in Railway dashboard to ensure emails are being sent
- Test with: `https://your-app.railway.app/api/stocks/preview`

## 🛠 Alternative Deployment Options

### Option 2: Render (Free tier available)

1. Go to [render.com](https://render.com)
2. Connect GitHub repository
3. Create "Web Service"
4. Set environment variables in Render dashboard
5. Deploy automatically

### Option 3: Heroku ($7/month)

```bash
npm install -g heroku
heroku create your-app-name
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASS=your-app-password
# ... add other env vars
git push heroku main
```

### Option 4: DigitalOcean App Platform ($5/month)

1. Create account at [digitalocean.com](https://digitalocean.com)
2. Go to Apps → Create App
3. Connect GitHub repository
4. Configure environment variables
5. Deploy

## 🔧 Configuration

### Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `EMAIL_USER` | ✅ | Your Gmail address | `you@gmail.com` |
| `EMAIL_PASS` | ✅ | Gmail app password | `abcd efgh ijkl mnop` |
| `EMAIL_TO` | ✅ | Recipient email | `recipient@email.com` |
| `NEWS_API_KEY` | ✅ | NewsAPI.org key | `your-api-key` |
| `STOCK_SYMBOLS` | ✅ | Comma-separated symbols | `AAPL,GOOGL,MSFT` |
| `CRON_SCHEDULE` | ❌ | When to send emails | `0 8 * * *` (8 AM daily) |
| `SMTP_HOST` | ❌ | Custom SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | ❌ | SMTP port | `587` |
| `SMTP_SECURE` | ❌ | Use SSL/TLS | `false` |

### Cron Schedule Examples

- `0 8 * * *` - Daily at 8 AM
- `0 9 * * 1-5` - Weekdays at 9 AM  
- `0 6,18 * * *` - Daily at 6 AM and 6 PM
- `0 8 * * 1,3,5` - Monday, Wednesday, Friday at 8 AM

## 🧪 Testing

### Test Email Locally
```bash
npm run test
```

### Test Deployed Service
```bash
curl https://your-app.railway.app/api/stocks/preview
```

## 📊 Monitoring

### Check Service Status
- **Railway**: Check logs in dashboard
- **Render**: View logs in service dashboard
- **Heroku**: `heroku logs --tail`

### Web Interface Features
- View current stock symbols
- Add/remove stocks
- Preview stock data
- Check service configuration

## 💰 Cost Comparison

| Service | Free Tier | Paid | Features |
|---------|-----------|------|----------|
| **Railway** | Limited | $5/month | Easy setup, great performance |
| **Render** | Yes (sleeps) | $7/month | Good free tier |
| **Heroku** | No | $7/month | Mature platform |
| **DigitalOcean** | No | $5/month | Full control |

## 🔒 Security Notes

- Never commit `.env` file to git
- Use app passwords, not your main Gmail password
- Regularly rotate API keys
- Monitor usage to avoid unexpected charges

## 🚨 Troubleshooting

### Email Not Sending
1. Check Gmail app password is correct
2. Verify environment variables are set
3. Check logs for authentication errors

### Service Not Starting
1. Verify all required environment variables are set
2. Check Node.js version compatibility (requires 18+)
3. Review deployment logs

### Stocks Not Loading
1. Verify Yahoo Finance API is accessible
2. Check stock symbols are valid
3. Review API rate limits

## 📞 Support

If you encounter issues:
1. Check the deployment platform's documentation
2. Review service logs for error messages
3. Verify all environment variables are correctly set
4. Test the service locally first with `npm run test`

---

🎉 **Congratulations!** Your stock email service is now running 24/7 on the internet!