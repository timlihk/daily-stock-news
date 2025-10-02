class StockManager {
    constructor() {
        this.stocks = [];
        this.liveInterval = null;
        this.isLiveActive = false;
        this.rowLimit = 10;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.currentStockData = [];
        this.allNewsData = [];
        this.newsFilter = 'all';
        this.init();
    }

    async init() {
        await this.loadStocks();
        this.setupEventListeners();
        this.startLivePrices();
        this.loadNews();
    }

    setupEventListeners() {
        document.getElementById('addBtn').addEventListener('click', () => this.addStock());
        document.getElementById('newSymbol').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addStock();
        });
        document.getElementById('refreshNews').addEventListener('click', () => this.loadNews());
        document.getElementById('newsFilter').addEventListener('change', (e) => {
            this.newsFilter = e.target.value;
            this.filterAndRenderNews();
        });
        document.getElementById('rowLimit').addEventListener('change', (e) => {
            this.rowLimit = parseInt(e.target.value);
            // Re-render with new limit if data exists
            if (this.currentStockData.length > 0) {
                this.renderLivePrices(this.currentStockData);
            }
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
            container.innerHTML = '<div class="terminal-placeholder" style="padding: 20px;">NO TICKERS</div>';
            return;
        }

        container.innerHTML = this.stocks.map(symbol => `
            <span class="stock-tag">
                ${symbol}
                <button class="remove-btn" onclick="stockManager.removeStock('${symbol}')">&times;</button>
            </span>
        `).join('');

        // Update news filter dropdown
        this.updateNewsFilterDropdown();
    }

    updateNewsFilterDropdown() {
        const filterSelect = document.getElementById('newsFilter');
        const currentValue = filterSelect.value;

        filterSelect.innerHTML = '<option value="all">ALL</option>';
        this.stocks.forEach(symbol => {
            const option = document.createElement('option');
            option.value = symbol;
            option.textContent = symbol;
            filterSelect.appendChild(option);
        });

        // Restore previous selection if it still exists
        if (currentValue !== 'all' && this.stocks.includes(currentValue)) {
            filterSelect.value = currentValue;
        } else {
            filterSelect.value = 'all';
            this.newsFilter = 'all';
        }
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
        const statusDot = document.getElementById('liveStatus');
        const statusText = document.getElementById('statusText');

        statusDot.className = 'status-dot live';
        statusText.textContent = 'LIVE';

        this.updateLivePrices();
        this.liveInterval = setInterval(() => {
            this.updateLivePrices();
        }, 1000);
    }

    stopLivePrices() {
        this.isLiveActive = false;
        const toggleBtn = document.getElementById('toggleLive');
        const statusDot = document.getElementById('liveStatus');
        const statusText = document.getElementById('statusText');

        toggleBtn.textContent = 'START';
        toggleBtn.className = 'terminal-btn btn-small btn-primary';
        statusDot.className = 'status-dot';
        statusText.textContent = 'OFFLINE';

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
                this.currentStockData = data.data;
                // Apply current sort if one is active
                if (this.sortColumn) {
                    this.applySortAndRender();
                } else {
                    this.renderLivePrices(this.currentStockData);
                }
            }
        } catch (error) {
            console.error('Error updating live prices:', error);
        }
    }

    sortBy(column) {
        if (this.sortColumn === column) {
            // Toggle direction if same column
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // New column, default to ascending
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.applySortAndRender();
    }

    applySortAndRender() {
        const sortedData = [...this.currentStockData].sort((a, b) => {
            // Filter out error stocks
            if (a.error) return 1;
            if (b.error) return -1;

            let aVal, bVal;

            switch(this.sortColumn) {
                case 'ticker':
                    aVal = a.symbol;
                    bVal = b.symbol;
                    break;
                case 'price':
                    aVal = a.price || 0;
                    bVal = b.price || 0;
                    break;
                case 'change':
                    aVal = a.change || 0;
                    bVal = b.change || 0;
                    break;
                case 'percent':
                    aVal = a.changePercent || 0;
                    bVal = b.changePercent || 0;
                    break;
                case 'volume':
                    aVal = a.volume || 0;
                    bVal = b.volume || 0;
                    break;
                default:
                    return 0;
            }

            if (typeof aVal === 'string') {
                return this.sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            } else {
                return this.sortDirection === 'asc'
                    ? aVal - bVal
                    : bVal - aVal;
            }
        });

        this.renderLivePrices(sortedData);
    }

    renderLivePrices(stocks) {
        const container = document.getElementById('livePrices');

        if (stocks.length === 0) {
            container.innerHTML = '<div class="terminal-placeholder">NO STOCKS IN WATCHLIST</div>';
            return;
        }

        const displayStocks = stocks.slice(0, this.rowLimit);

        const getSortIcon = (column) => {
            if (this.sortColumn !== column) return '⇅';
            return this.sortDirection === 'asc' ? '↑' : '↓';
        };

        container.innerHTML = `
            <table class="price-table">
                <thead>
                    <tr>
                        <th class="sortable" onclick="stockManager.sortBy('ticker')">
                            Ticker ${getSortIcon('ticker')}
                        </th>
                        <th class="sortable" onclick="stockManager.sortBy('price')">
                            Price ${getSortIcon('price')}
                        </th>
                        <th class="sortable" onclick="stockManager.sortBy('change')">
                            Change ${getSortIcon('change')}
                        </th>
                        <th class="sortable" onclick="stockManager.sortBy('percent')">
                            % ${getSortIcon('percent')}
                        </th>
                        <th class="sortable" onclick="stockManager.sortBy('volume')">
                            Volume ${getSortIcon('volume')}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${displayStocks.map(stock => {
                        if (stock.error) {
                            return `
                                <tr>
                                    <td>${stock.symbol}</td>
                                    <td colspan="4" class="error">Error</td>
                                </tr>
                            `;
                        }

                        const changeClass = stock.change >= 0 ? 'positive' : 'negative';
                        const changeSymbol = stock.change >= 0 ? '+' : '';
                        const formatVolume = (vol) => {
                            if (!vol) return 'N/A';
                            if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
                            if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
                            if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
                            return vol.toLocaleString();
                        };

                        return `
                            <tr>
                                <td class="ticker">${stock.symbol}</td>
                                <td class="price">$${stock.price?.toFixed(2)}</td>
                                <td class="${changeClass}">${changeSymbol}${stock.change?.toFixed(2)}</td>
                                <td class="${changeClass}">${changeSymbol}${stock.changePercent?.toFixed(2)}%</td>
                                <td class="volume">${formatVolume(stock.volume)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    async loadNews() {
        const newsArea = document.getElementById('newsArea');
        newsArea.innerHTML = '<div class="terminal-placeholder">LOADING...</div>';

        try {
            const response = await fetch('/api/news/preview');
            const data = await response.json();

            if (data.success) {
                this.allNewsData = data.data;
                this.filterAndRenderNews();
            } else {
                newsArea.innerHTML = '<div class="terminal-placeholder">FAILED TO LOAD</div>';
            }
        } catch (error) {
            newsArea.innerHTML = '<div class="terminal-placeholder">ERROR LOADING</div>';
        }
    }

    filterAndRenderNews() {
        let filteredNews = this.allNewsData;

        if (this.newsFilter !== 'all') {
            filteredNews = this.allNewsData.filter(article => article.symbol === this.newsFilter);
        }

        this.renderNews(filteredNews);
    }

    renderNews(news) {
        const newsArea = document.getElementById('newsArea');

        if (news.length === 0) {
            newsArea.innerHTML = '<div class="terminal-placeholder">NO NEWS AVAILABLE</div>';
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
