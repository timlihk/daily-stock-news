import yahooFinance from 'yahoo-finance2';

export async function getStockData(symbols) {
  const stockData = [];
  
  for (const symbol of symbols) {
    try {
      const quote = await yahooFinance.quote(symbol);
      
      const data = {
        symbol: symbol,
        name: quote.longName || quote.shortName || symbol,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        previousClose: quote.regularMarketPreviousClose,
        dayHigh: quote.regularMarketDayHigh,
        dayLow: quote.regularMarketDayLow,
        volume: quote.regularMarketVolume,
        marketCap: quote.marketCap,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow
      };
      
      stockData.push(data);
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error.message);
      stockData.push({
        symbol: symbol,
        error: true,
        message: `Failed to fetch data: ${error.message}`
      });
    }
  }
  
  return stockData;
}

export async function getHistoricalData(symbol, period = '3mo') {
  try {
    // Use chart API instead of deprecated historical API
    const result = await yahooFinance.chart(symbol, {
      period1: period === '3mo' ? '3mo' :
               period === '1mo' ? '1mo' :
               period === '6mo' ? '6mo' : '3mo',
      interval: '1d'
    });
    
    if (!result || !result.quotes || result.quotes.length === 0) {
      console.log(`No chart data available for ${symbol}`);
      return null;
    }
    
    // Transform chart data to match historical format
    const historical = result.quotes.map(quote => ({
      date: new Date(quote.date),
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.close,
      adjClose: quote.adjclose || quote.close,
      volume: quote.volume
    })).filter(item => item.close !== null);
    
    return historical;
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error.message);
    return null;
  }
}

export function generateChartUrl(symbol, period = '3mo', showVolume = true) {
  // Using QuickChart.io for chart generation
  const chartConfig = {
    type: 'line',
    data: {
      datasets: [{
        label: `${symbol} Price`,
        borderColor: 'rgb(75, 192, 192)',
        fill: false
      }]
    },
    options: {
      title: {
        display: true,
        text: `${symbol} - Last 3 Months`
      },
      scales: {
        xAxes: [{
          type: 'time',
          time: {
            unit: 'week'
          }
        }],
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Price ($)'
          }
        }]
      }
    }
  };
  
  // Alternative: Use Yahoo Finance chart image directly
  const yahooChartUrl = `https://chart.finance.yahoo.com/z?s=${symbol}&t=${period}&q=l&l=on&z=l&a=v&p=m50,m200&lang=en-US&region=US`;
  
  return yahooChartUrl;
}

export function formatStockData(stock) {
  if (stock.error) {
    return `
      <div style="border: 1px solid #f56565; padding: 15px; margin: 10px 0; border-radius: 5px; background-color: #fed7d7;">
        <h3>❌ ${stock.symbol}</h3>
        <p style="color: #c53030;">Error: ${stock.message}</p>
      </div>
    `;
  }
  
  const changeSymbol = stock.change >= 0 ? '+' : '';
  const changeColor = stock.change >= 0 ? '🟢' : '🔴';
  
  return `
    <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; background-color: white;">
      <h3 style="margin-top: 0;">${changeColor} ${stock.symbol} - ${stock.name}</h3>
      <p><strong>Current Price:</strong> $${stock.price?.toFixed(2)}</p>
      <p><strong>Change:</strong> ${changeSymbol}$${stock.change?.toFixed(2)} (${changeSymbol}${stock.changePercent?.toFixed(2)}%)</p>
      <p><strong>Day Range:</strong> $${stock.dayLow?.toFixed(2)} - $${stock.dayHigh?.toFixed(2)}</p>
      <p><strong>Volume:</strong> ${stock.volume?.toLocaleString()}</p>
      <p><strong>Market Cap:</strong> $${(stock.marketCap / 1e9)?.toFixed(2)}B</p>
      <p><strong>52 Week Range:</strong> $${stock.fiftyTwoWeekLow?.toFixed(2)} - $${stock.fiftyTwoWeekHigh?.toFixed(2)}</p>
    </div>
  `;
}