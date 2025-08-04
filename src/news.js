import axios from 'axios';

export async function getStockNews(symbols, apiKey) {
  const allNews = [];
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  for (const symbol of symbols) {
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: symbol,
          from: weekAgo.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0],
          sortBy: 'relevancy',
          pageSize: 5,
          apiKey: apiKey,
          language: 'en'
        }
      });
      
      const articles = response.data.articles.map(article => ({
        symbol: symbol,
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source.name,
        publishedAt: new Date(article.publishedAt),
        image: article.urlToImage
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