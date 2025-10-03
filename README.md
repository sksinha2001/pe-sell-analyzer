# Option Strategy Calculator

This is a simple web application built with Python (Flask) that provides an option strategy calculator. It fetches live stock market data from Yahoo Finance and calculates key metrics in real-time.

## Features

-   **Live Market Data**: Fetches the current market price for NSE stocks and indices from Yahoo Finance.
-   **Ticker Dropdown**: Includes a pre-populated list of the top 50 NSE stocks and major indices (NIFTY, BANKNIFTY).
-   **Real-Time Calculations**: Instantly calculates and updates metrics as you change the inputs:
    -   Days to Expiry (DTE)
    -   ROI Per Week (%)
    -   Delta (%)
-   **Color-Coded Metrics**: Provides visual cues (red, amber, green) for DTE and ROI for quick analysis.
-   **Automatic Expiry Date**: Defaults the expiry date to the last Tuesday of the current month.

## Setup Instructions

Follow these steps to set up and run the project on your local machine.

### 1. Prerequisites

-   Python 3.6 or higher
-   `pip` and `venv` for package management

### 2. Create a Virtual Environment

From the project's root directory (`ScriptsV1/`), create and activate a virtual environment:

```bash
# Create the virtual environment
python3 -m venv .venv

# Activate the virtual environment
# On macOS/Linux:
source .venv/bin/activate

# On Windows:
# .\venv\Scripts\activate
```

### 3. Install Dependencies

With the virtual environment activated, install all the required packages using the `requirements.txt` file:

```bash
pip install -r requirements.txt
```

## How to Run the Application

1.  Make sure your virtual environment is activated.
2.  Run the main Flask application from the root directory:

    ```bash
    python main.py
    ```

3.  The terminal will show that the server is running. Open your web browser and navigate to the following URL:

    [http://127.0.0.1:5000](http://127.0.0.1:5000)

4.  You will see the home page. Click the button to go to the Option Calculator.
