class StockManager {
    constructor() {
        this.stocks = [];
        this.init();
    }

    async init() {
        await this.loadStocks();
        await this.loadConfig();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('addBtn').addEventListener('click', () => this.addStock());
        document.getElementById('newSymbol').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addStock();
        });
        document.getElementById('refreshPreview').addEventListener('click', () => this.loadPreview());
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('emailTo').textContent = data.config.emailTo;
                document.getElementById('schedule').textContent = this.formatCron(data.config.cronSchedule);
                
                const statusEl = document.getElementById('status');
                if (data.config.hasEmailConfig && data.config.hasNewsApi) {
                    statusEl.textContent = '✅ Configured';
                    statusEl.style.color = '#28a745';
                } else {
                    statusEl.textContent = '⚠️ Missing config';
                    statusEl.style.color = '#ffc107';
                }
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }
    }

    formatCron(cronSchedule) {
        if (cronSchedule === '0 8 * * *') return 'Daily at 8:00 AM';
        if (cronSchedule === '0 9 * * 1-5') return 'Weekdays at 9:00 AM';
        return cronSchedule;
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
            this.showError('Failed to load stocks');
        }
    }

    renderStocks() {
        const container = document.getElementById('stocksList');
        
        if (this.stocks.length === 0) {
            container.innerHTML = '<div class="loading">No stocks added yet. Add your first stock above!</div>';
            return;
        }

        container.innerHTML = this.stocks.map(symbol => `
            <div class="stock-item" data-symbol="${symbol}">
                <span class="stock-symbol">${symbol}</span>
                <button class="btn btn-danger" onclick="stockManager.removeStock('${symbol}')">Remove</button>
            </div>
        `).join('');
    }

    async addStock() {
        const input = document.getElementById('newSymbol');
        const symbol = input.value.trim().toUpperCase();
        
        if (!symbol) {
            this.showError('Please enter a stock symbol');
            return;
        }

        if (!/^[A-Z0-9\.\-]{1,10}$/.test(symbol)) {
            this.showError('Invalid symbol format');
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
                this.showSuccess(`Added ${symbol} to watchlist`);
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Failed to add stock');
        }
    }

    async removeStock(symbol) {
        if (!confirm(`Remove ${symbol} from watchlist?`)) return;

        try {
            const response = await fetch(`/api/stocks/${symbol}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.stocks = data.symbols;
                this.renderStocks();
                this.showSuccess(`Removed ${symbol} from watchlist`);
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Failed to remove stock');
        }
    }

    async loadPreview() {
        const previewArea = document.getElementById('previewArea');
        previewArea.innerHTML = '<div class="loading">Loading stock prices...</div>';

        try {
            const response = await fetch('/api/stocks/preview');
            const data = await response.json();
            
            if (data.success) {
                this.renderPreview(data.data);
            } else {
                previewArea.innerHTML = '<div class="loading">Failed to load preview</div>';
            }
        } catch (error) {
            previewArea.innerHTML = '<div class="loading">Error loading preview</div>';
        }
    }

    renderPreview(stocks) {
        const previewArea = document.getElementById('previewArea');
        
        if (stocks.length === 0) {
            previewArea.innerHTML = '<div class="loading">No stocks to preview</div>';
            return;
        }

        previewArea.innerHTML = stocks.map(stock => {
            if (stock.error) {
                return `
                    <div class="stock-preview">
                        <h3>${stock.symbol}</h3>
                        <p style="color: #dc3545;">Error: ${stock.message}</p>
                    </div>
                `;
            }

            const changeClass = stock.change >= 0 ? 'positive' : 'negative';
            const changeSymbol = stock.change >= 0 ? '+' : '';

            return `
                <div class="stock-preview">
                    <h3>${stock.symbol} - ${stock.name}</h3>
                    <div>
                        <span class="price">$${stock.price?.toFixed(2)}</span>
                        <span class="change ${changeClass}">
                            ${changeSymbol}${stock.change?.toFixed(2)} (${changeSymbol}${stock.changePercent?.toFixed(2)}%)
                        </span>
                    </div>
                    <div class="stock-details">
                        <div>Day Range: $${stock.dayLow?.toFixed(2)} - $${stock.dayHigh?.toFixed(2)}</div>
                        <div>Volume: ${stock.volume?.toLocaleString()}</div>
                        <div>Market Cap: $${(stock.marketCap / 1e9)?.toFixed(2)}B</div>
                        <div>52W: $${stock.fiftyTwoWeekLow?.toFixed(2)} - $${stock.fiftyTwoWeekHigh?.toFixed(2)}</div>
                    </div>
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