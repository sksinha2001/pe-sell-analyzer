from flask import Flask, render_template, jsonify, request
import yfinance as yf
import os

app = Flask(__name__)

# --- NEW: Get SECRET_KEY from environment variables ---
# This looks for the SECRET_KEY variable you set on Render.
# The 'default-fallback-key' is only used if the variable is NOT found.
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default-fallback-key')
# -----------------------------------------------------

# def get_nse_tickers():
#     """Provides a hardcoded list of Nifty 50 tickers and major indices for reliability."""
#     try:
#         nifty50_stocks = [
#             'ADANIENT', 'ADANIPORTS', 'APOLLOHOSP', 'ASIANPAINT', 'AXISBANK', 'BAJAJ-AUTO', 'BAJFINANCE', 
#             'BAJAJFINSV', 'BPCL', 'BHARTIARTL', 'BRITANNIA', 'CIPLA', 'COALINDIA', 'DIVISLAB', 'DRREDDY', 
#             'EICHERMOT', 'GRASIM', 'HCLTECH', 'HDFCBANK', 'HDFCLIFE', 'HEROMOTOCO', 'HINDALCO', 'HINDUNILVR', 
#             'ICICIBANK', 'ITC', 'INDUSINDBK', 'INFY', 'JSWSTEEL', 'KOTAKBANK', 'LTIM', 'LT', 'M&M', 
#             'MARUTI', 'NTPC', 'NESTLEIND', 'ONGC', 'POWERGRID', 'RELIANCE', 'SBILIFE', 'SBIN', 'SUNPHARMA', 
#             'TCS', 'TATACONSUM', 'TATAMOTORS', 'TATASTEEL', 'TECHM', 'TITAN', 'ULTRACEMCO', 'WIPRO'
#         ]
#         indices = ['NIFTY', 'BANKNIFTY']
#         return sorted(indices + nifty50_stocks)

#     except Exception as e:
#         print(f"Error creating ticker list: {e}")
#         return ['INFY', 'TCS', 'RELIANCE', 'NIFTY', 'BANKNIFTY']
# ------------------------------------------------------------------

@app.route('/')
def home():
    # Assuming 'index.html' is your landing page
    return render_template('index.html')

@app.route('/option-calculator')
def option_calculator():
    # MODIFIED: No longer needs to fetch and pass the 'tickers' list
    return render_template('option_calculator.html')

@app.route('/get_market_price')
def get_market_price():
    """Fetches the current market price from Yahoo Finance."""
    # Ensure all user inputs (NIFTY, BANKNIFTY) are handled correctly
    ticker_symbol = request.args.get('ticker', 'INFY.NS').upper() # Added .upper() for robustness

    # Adjust ticker for Yahoo Finance API
    if ticker_symbol == 'NIFTY':
        ticker_symbol = '^NSEI'
    elif ticker_symbol == 'BANKNIFTY':
        ticker_symbol = '^NSEBANK'
    elif not ticker_symbol.endswith('.NS') and not ticker_symbol.startswith('^'):
        ticker_symbol += '.NS'

    try:
        ticker = yf.Ticker(ticker_symbol)
        data = ticker.history(period='1d')
        if data.empty:
            return jsonify({'error': f'No data found for ticker {ticker_symbol}'}), 404
        
        market_price = data['Close'].iloc[-1]
        return jsonify({'market_price': market_price})
    except Exception as e:
        print(f"Error fetching data for {ticker_symbol}: {e}")
        return jsonify({'error': 'Failed to fetch price'}), 500

if __name__ == '__main__':
    app.run(debug=True)