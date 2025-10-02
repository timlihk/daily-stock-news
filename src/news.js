import axios from 'axios';

export async function getStockNews(symbols, apiKey) {
  const allNews = [];
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const symbol of symbols) {
    try {
      const toDate = today.toISOString().split('T')[0];
      const fromDate = weekAgo.toISOString().split('T')[0];

      const response = await axios.get(`https://finnhub.io/api/v1/company-news`, {
        params: {
          symbol: symbol,
          from: fromDate,
          to: toDate,
          token: apiKey
        }
      });

      const articles = response.data.slice(0, 5).map(article => ({
        symbol: symbol,
        title: article.headline,
        description: article.summary,
        url: article.url,
        source: article.source,
        publishedAt: new Date(article.datetime * 1000), // Finnhub uses Unix timestamp
        image: article.image
      }));

      allNews.push(...articles);
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error.message);
    }
  }

  // Sort by date and limit to most recent
  allNews.sort((a, b) => b.publishedAt - a.publishedAt);
  return allNews.slice(0, 20);
}

export function formatNewsItem(article) {
  const date = article.publishedAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  return `
    <div style="border-left: 3px solid #007bff; padding-left: 15px; margin: 15px 0;">
      <h4 style="margin: 5px 0;">${article.title}</h4>
      <p style="color: #666; font-size: 0.9em;">
        <strong>${article.symbol}</strong> | ${article.source} | ${date}
      </p>
      <p style="margin: 10px 0;">${article.description || 'No description available.'}</p>
      <a href="${article.url}" style="color: #007bff; text-decoration: none;">Read more →</a>
    </div>
  `;
}