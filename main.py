from flask import Flask, render_template, jsonify, request
import yfinance as yf
from datetime import datetime
import os
import traceback 

app = Flask(__name__)
TICKER_DATA = {}
TICKER_FILE = 'tickers_data.txt' # File to be read for Ticker and Quantity data

def load_ticker_data():
    """Loads Ticker and Quantity data from the flat file."""
    global TICKER_DATA
    TICKER_DATA = {} # Reset data
    try:
        # NOTE: Assumes tickers_data.txt is in the same directory as main.py
        if not os.path.exists(TICKER_FILE):
            print(f"Warning: {TICKER_FILE} not found. Using empty data.")
            return

        with open(TICKER_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    parts = line.split(',')
                    if len(parts) == 2:
                        ticker = parts[0].strip().upper()
                        try:
                            quantity = int(parts[1].strip())
                            TICKER_DATA[ticker] = {'quantity': quantity}
                        except ValueError:
                            print(f"Skipping line with invalid quantity: {line}")
        print(f"Loaded {len(TICKER_DATA)} tickers successfully.")
    except Exception as e:
        print(f"Error loading ticker data: {e}")

def get_yf_ticker_symbol(ticker_symbol):
    """Converts user ticker to Yahoo Finance format."""
    ticker_symbol = ticker_symbol.upper()
    if ticker_symbol == 'NIFTY':
        return '^NSEI'
    elif ticker_symbol == 'BANKNIFTY':
        return '^NSEBANK'
    elif ticker_symbol == 'SENSEX':
        return '^BSESN'
    # Fallback/Default to .NS for Indian equity
    elif not ticker_symbol.endswith('.NS'):
        return f'{ticker_symbol}.NS'
    return ticker_symbol

# Load data when the application starts
load_ticker_data()

@app.route('/')
def home():
    # Placeholder for a simple homepage
    return render_template('index.html')

@app.route('/option-calculator')
def option_calculator():
    # Pass the list of Tickers (keys from the loaded data) to the template for the dropdown
    tickers = sorted(TICKER_DATA.keys())
    return render_template('option_calculator.html', tickers=tickers)

@app.route('/get_market_price')
def get_market_price():
    """Fetches the current market price, 50 DMA, and quantity."""
    ticker_name = request.args.get('ticker', '').upper()

    if not ticker_name or ticker_name not in TICKER_DATA:
        return jsonify({'error': 'Invalid or missing ticker in data file'}), 400

    yf_symbol = get_yf_ticker_symbol(ticker_name)

    try:
        ticker = yf.Ticker(yf_symbol)
        
        # Fetch data using .info, which typically includes 50-DMA
        info = ticker.info
        market_price = info.get('currentPrice') or info.get('regularMarketPrice')
        
        if not market_price:
            # Fallback to history if price is missing
            data = ticker.history(period='1d')
            if not data.empty:
                market_price = data['Close'].iloc[-1]
        
        if not market_price:
            return jsonify({'error': f'Could not retrieve market price for {ticker_name}'}), 404

        # Fetch 50-DMA Price
        dma_50_price = info.get('fiftyDayAverage', 0.0) # Default to 0.0 if not found
        
        # Calculate 50-DMA as a percentage of Current Market Price (CMP)
        dma_percent = (dma_50_price / market_price) * 100 if market_price > 0 else 0
        
        # Retrieve quantity from the loaded data
        quantity = TICKER_DATA[ticker_name]['quantity']

        return jsonify({
            'market_price': round(market_price, 2),
            'quantity': quantity,
            'dma_50_price': round(dma_50_price, 2),
            'dma_50_percent': round(dma_percent, 2)
        })

    except Exception as e:
        print(f"Error fetching data for {ticker_name}: {e}")
        traceback.print_exc()
        return jsonify({'error': f'Failed to fetch data from Yahoo Finance for {ticker_name}'}), 500

if __name__ == '__main__':
    # Running locally for development
    app.run(host='0.0.0.0', port=5000, debug=True)
    #app.run(debug=True)