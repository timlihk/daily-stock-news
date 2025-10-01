class StockManager {
    constructor() {
        this.stocks = [];
        this.liveInterval = null;
        this.isLiveActive = false;
        this.rowLimit = 10;
        this.init();
    }

    async init() {
        await this.loadStocks();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('addBtn').addEventListener('click', () => this.addStock());
        document.getElementById('newSymbol').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addStock();
        });
        document.getElementById('toggleLive').addEventListener('click', () => this.toggleLivePrices());
        document.getElementById('refreshNews').addEventListener('click', () => this.loadNews());
        document.getElementById('rowLimit').addEventListener('change', (e) => {
            this.rowLimit = parseInt(e.target.value);
        });
    }

    async loadStocks() {
        try {
            const response = await fetch('/api/stocks');
            const data = await response.json();

            if (data.success) {
                this.stocks = data.symbols;
                this.renderStocks();
            }
        } catch (error) {
            console.error('Error loading stocks:', error);
        }
    }

    renderStocks() {
        const container = document.getElementById('stocksList');

        if (this.stocks.length === 0) {
            container.innerHTML = '<div class="placeholder">No stocks added</div>';
            return;
        }

        container.innerHTML = this.stocks.map(symbol => `
            <span class="stock-tag">
                ${symbol}
                <button class="remove-btn" onclick="stockManager.removeStock('${symbol}')">&times;</button>
            </span>
        `).join('');
    }

    async addStock() {
        const input = document.getElementById('newSymbol');
        const symbol = input.value.trim().toUpperCase();

        if (!symbol) {
            this.showError('Enter a symbol');
            return;
        }

        if (!/^[A-Z0-9\.\-]{1,10}$/.test(symbol)) {
            this.showError('Invalid format');
            return;
        }

        try {
            const response = await fetch('/api/stocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol })
            });

            const data = await response.json();

            if (data.success) {
                this.stocks = data.symbols;
                this.renderStocks();
                input.value = '';
                this.showSuccess(`Added ${symbol}`);
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Failed to add');
        }
    }

    async removeStock(symbol) {
        if (!confirm(`Remove ${symbol}?`)) return;

        try {
            const response = await fetch(`/api/stocks/${symbol}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.stocks = data.symbols;
                this.renderStocks();
                this.showSuccess(`Removed ${symbol}`);
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Failed to remove');
        }
    }

    toggleLivePrices() {
        if (this.isLiveActive) {
            this.stopLivePrices();
        } else {
            this.startLivePrices();
        }
    }

    startLivePrices() {
        this.isLiveActive = true;
        const toggleBtn = document.getElementById('toggleLive');
        const statusEl = document.getElementById('liveStatus');

        toggleBtn.textContent = 'Stop';
        toggleBtn.className = 'btn btn-sm btn-danger';
        statusEl.className = 'status live';

        this.updateLivePrices();
        this.liveInterval = setInterval(() => {
            this.updateLivePrices();
        }, 1000);
    }

    stopLivePrices() {
        this.isLiveActive = false;
        const toggleBtn = document.getElementById('toggleLive');
        const statusEl = document.getElementById('liveStatus');

        toggleBtn.textContent = 'Start';
        toggleBtn.className = 'btn btn-sm btn-success';
        statusEl.className = 'status';

        if (this.liveInterval) {
            clearInterval(this.liveInterval);
            this.liveInterval = null;
        }
    }

    async updateLivePrices() {
        try {
            const response = await fetch('/api/stocks/live');
            const data = await response.json();

            if (data.success) {
                this.renderLivePrices(data.data);
            }
        } catch (error) {
            console.error('Error updating live prices:', error);
        }
    }

    renderLivePrices(stocks) {
        const container = document.getElementById('livePrices');

        if (stocks.length === 0) {
            container.innerHTML = '<div class="placeholder">No stocks in watchlist</div>';
            return;
        }

        const displayStocks = stocks.slice(0, this.rowLimit);

        container.innerHTML = `
            <table class="price-table">
                <thead>
                    <tr>
                        <th>Ticker</th>
                        <th>Price</th>
                        <th>Change</th>
                        <th>%</th>
                    </tr>
                </thead>
                <tbody>
                    ${displayStocks.map(stock => {
                        if (stock.error) {
                            return `
                                <tr>
                                    <td>${stock.symbol}</td>
                                    <td colspan="3" class="error">Error</td>
                                </tr>
                            `;
                        }

                        const changeClass = stock.change >= 0 ? 'positive' : 'negative';
                        const changeSymbol = stock.change >= 0 ? '+' : '';

                        return `
                            <tr>
                                <td class="ticker">${stock.symbol}</td>
                                <td class="price">$${stock.price?.toFixed(2)}</td>
                                <td class="${changeClass}">${changeSymbol}${stock.change?.toFixed(2)}</td>
                                <td class="${changeClass}">${changeSymbol}${stock.changePercent?.toFixed(2)}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    async loadNews() {
        const newsArea = document.getElementById('newsArea');
        newsArea.innerHTML = '<div class="placeholder">Loading news...</div>';

        try {
            const response = await fetch('/api/news/preview');
            const data = await response.json();

            if (data.success) {
                this.renderNews(data.data);
            } else {
                newsArea.innerHTML = '<div class="placeholder">Failed to load</div>';
            }
        } catch (error) {
            newsArea.innerHTML = '<div class="placeholder">Error loading</div>';
        }
    }

    renderNews(news) {
        const newsArea = document.getElementById('newsArea');

        if (news.length === 0) {
            newsArea.innerHTML = '<div class="placeholder">No news available</div>';
            return;
        }

        newsArea.innerHTML = news.map(article => {
            const date = new Date(article.publishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });

            return `
                <div class="news-item">
                    <div class="news-header">
                        <span class="news-ticker">${article.symbol}</span>
                        <span class="news-date">${date}</span>
                    </div>
                    <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="news-title">
                        ${article.title}
                    </a>
                    <p class="news-source">${article.source}</p>
                </div>
            `;
        }).join('');
    }

    showError(message) {
        const errorEl = document.getElementById('errorMsg');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 3000);
    }

    showSuccess(message) {
        const successEl = document.getElementById('successMsg');
        successEl.textContent = message;
        successEl.style.display = 'block';
        setTimeout(() => {
            successEl.style.display = 'none';
        }, 3000);
    }
}

const stockManager = new StockManager();
