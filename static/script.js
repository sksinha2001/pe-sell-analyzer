document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const tickerInput = document.getElementById('ticker');
    const strikePriceInput = document.getElementById('strike-price');
    const expiryDateInput = document.getElementById('expiry-date');
    const quantityInput = document.getElementById('quantity');
    const premiumInput = document.getElementById('premium');
    // fundReqInput is now type="text" for custom formatting
    const fundReqInput = document.getElementById('fund-req'); 

    const marketPriceOutput = document.getElementById('market-price');
    const dma50PercentOutput = document.getElementById('dma50-percent'); 
    const dteOutput = document.getElementById('dte');
    const roiOutput = document.getElementById('roi');
    const deltaOutput = document.getElementById('delta');
    

    // --- Helper Functions ---
    
    /**
     * Formats a number using the Indian numbering system (lakh, crore).
     * @param {number|string} num The number to format.
     * @returns {string} The formatted string (e.g., "1,00,000").
     */
    function formatIndianNumber(num) {
        if (typeof num === 'string') {
            num = num.replace(/,/g, ''); // Remove existing commas for clean formatting
        }
        if (isNaN(num) || num === null) return '';
        
        let x = Math.round(parseFloat(num)).toString();
        let lastThree = x.substring(x.length - 3);
        let otherNumbers = x.substring(0, x.length - 3);
        
        if (otherNumbers !== '') {
            lastThree = ',' + lastThree;
        }
        
        // Use regex for Indian style grouping (2 digits after the first 3)
        let formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
        return formatted;
    }


/**
 * Calculates the expiry date (Last Tuesday or Thursday of the current month).
 * @param {string} ticker The selected ticker symbol.
 * @param {Date} now The current date.
 * @returns {string} Expiry date in YYYY-MM-DD format.
 */
function calculateExpiryDate(ticker, now = new Date()) {
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-11
    
    // SENSEX: Thursday (4), Others: Tuesday (2)
    const findDay = (ticker === 'SENSEX') ? 5 : 3; 

    function findLastTargetDay(y, m, dayOfWeek) {
        // Start by finding the last day of the CURRENT month (m + 1, 0)
        let lastDay = new Date(y, m + 1, 0);
        
        // Loop backward from the last day until we hit the target dayOfWeek (2 or 4)
        while (lastDay.getDay() !== dayOfWeek) {
            lastDay.setDate(lastDay.getDate() - 1);
        }
        
        // Set time to midnight for consistency
        lastDay.setHours(0, 0, 0, 0); 
        return lastDay;
    }

    // Find the last target day of the CURRENT month only.
    const finalDate = findLastTargetDay(year, month, findDay);
    
    // Format as YYYY-MM-DD
    return finalDate.toISOString().split('T')[0];
}
   
    /**
     * Sets the default expiry date for the selected ticker.
     */
    function setDefaultExpiryDate() {
        const ticker = tickerInput.value;
        // Set expiry using the calculated last Tuesday/Thursday based on the ticker
        expiryDateInput.value = calculateExpiryDate(ticker);
    }

    /**
     * Fetches market price, quantity, and 50 DMA percentage from the backend.
     */
    async function fetchTickerData() {
        const ticker = tickerInput.value;
        if (!ticker) return;
        
        marketPriceOutput.textContent = 'Loading...';
        dma50PercentOutput.textContent = '--';

        try {
            // Implement exponential backoff for robustness
            let data = null;
            for (let i = 0; i < 3; i++) {
                const response = await fetch(`/get_market_price?ticker=${ticker}`);
                if (response.status === 200) {
                    data = await response.json();
                    break;
                }
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                }
            }

            if (!data || data.error) {
                marketPriceOutput.textContent = 'Error';
                console.error('API Error:', data ? data.error : 'Failed to retrieve data after retries.');
                quantityInput.value = 0;
                dma50PercentOutput.textContent = 'Error';
                return;
            }

            // 1. Update Market Price
            const marketPrice = data.market_price;
            marketPriceOutput.textContent = marketPrice.toFixed(2);

            // 2. Auto-populate Quantity
            quantityInput.value = data.quantity;
            
            // 3. Update 50 DMA Percentage
            dma50PercentOutput.textContent = `${data.dma_50_percent.toFixed(2)}%`;

            // 4. Update Expiry Date based on Ticker logic (Tuesday/Thursday)
            setDefaultExpiryDate();

        } catch (error) {
            marketPriceOutput.textContent = 'Failed';
            console.error('Fetch error:', error);
            quantityInput.value = 0;
            dma50PercentOutput.textContent = 'Failed';
        }
        
        // Always run calculation after data fetch
        calculate();
    }


    /**
     * Performs all calculations and updates the output fields.
     */
    function calculate() {
        // --- INPUT PARSING ---
        const marketPrice = parseFloat(marketPriceOutput.textContent.replace(/[^\d.]/g, '')) || 0;
        const strikePrice = parseFloat(strikePriceInput.value) || 0;
        const expiryDateStr = expiryDateInput.value;
        const quantity = parseFloat(quantityInput.value) || 0;
        const premium = parseFloat(premiumInput.value) || 0;
        
        // Parse Total Funds, explicitly removing commas first
        const totalFunds = parseFloat(fundReqInput.value.replace(/,/g, '')) || 0;


        // Reset outputs if core data is missing or calculation is nonsensical
        if (!marketPrice || !strikePrice || !expiryDateStr || !quantity || !totalFunds) {
            dteOutput.textContent = '--';
            roiOutput.textContent = '--';
            deltaOutput.textContent = '--';
            return;
        }

        // 1. Calculate Days To Expiry (DTE)
        const today = new Date();
        const expiry = new Date(expiryDateStr);
        expiry.setHours(23, 59, 59, 999); 
        
        const diffTime = expiry.getTime() - today.getTime();
        let dte = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        dte = Math.max(0, dte); 

        dteOutput.textContent = dte;
        // DTE Legend: Green >= 15, Amber >= 7, Red < 7
        updateLegendColor(dteOutput, dte, [15, 7], true);

        // 2. Calculate ROI % per week (Yield on Premium / Weeks to Expiry)
        const totalPremiumReceived = premium * quantity; 
        
        let totalPremiumYield = 0;
        if (totalFunds > 0) {
             // 1. Calculate Total Premium Yield (%)
            totalPremiumYield = (totalPremiumReceived / totalFunds) * 100;
        }

        const weeksToExpiry = dte / 7;
        let weeklyRoi = 0;

        if (weeksToExpiry > 0) {
            // 2. Calculate ROI % per week
            weeklyRoi = totalPremiumYield / weeksToExpiry;
        } else if (totalPremiumYield > 0 && weeksToExpiry === 0) {
            // If DTE is 0 but premium was received, display the total yield (DTE is 0 or less)
            weeklyRoi = totalPremiumYield; 
        }

        roiOutput.textContent = `${weeklyRoi.toFixed(2)}%`;
        // ROI Legend: Green >= 1%, Amber >= 0.5%, Red < 0.5% (Thresholds remain the same)
        updateLegendColor(roiOutput, weeklyRoi, [1, 0.5], true);

        // 3. Calculate Delta % (Difference between market price and strike price as a percentage of strike)
        let delta = 0;
        if (strikePrice > 0) {
            delta = ((marketPrice - strikePrice) / strikePrice) * 100;
        }
        deltaOutput.textContent = `${delta.toFixed(2)}%`;
        // Delta Legend: Green >= 10%, Amber >= 5%, Red < 5% (Higher is safer for PE Sell)
        updateLegendColor(deltaOutput, delta, [10, 5], true);
    }

    // --- Helper Function for Color Legend ---

    function updateLegendColor(element, value, thresholds, isGreenHigh) {
        // Clear existing classes
        element.classList.remove('legend-red', 'legend-amber', 'legend-green');
        // The HTML/CSS is expected to define the text color as white for these classes.
        element.classList.add('px-3', 'py-1', 'rounded-full'); 
        
        const [high, low] = thresholds;

        if (isGreenHigh) { 
            if (value >= high) {
                element.classList.add('legend-green');
            } else if (value >= low) {
                element.classList.add('legend-amber');
            } else {
                element.classList.add('legend-red');
            }
        } else {
            // Not used in current application logic but kept for generality (e.g., lower is better)
            if (value <= low) {
                element.classList.add('legend-green');
            } else if (value < high) {
                element.classList.add('legend-amber');
            } else {
                element.classList.add('legend-red');
            }
        }
    }

    // --- Event Listeners ---
    
    // Listen for changes in the Ticker dropdown to fetch data and auto-populate
    tickerInput.addEventListener('change', fetchTickerData);
    
    // Listen for changes in other inputs to recalculate
    const inputs = [strikePriceInput, expiryDateInput, premiumInput];
    inputs.forEach(input => {
        input.addEventListener('input', calculate);
    });

    // Funds Req input specific logic: format on blur, unformat on focus
    fundReqInput.addEventListener('blur', (e) => {
        // Format the value when the user leaves the field
        const value = e.target.value.replace(/[^0-9]/g, ''); // Clean non-digits
        e.target.value = formatIndianNumber(value);
        calculate();
    });

    fundReqInput.addEventListener('focus', (e) => {
        // Remove formatting when the user clicks into the field
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    // Initial setup
    setDefaultExpiryDate();
    
    // Format the default fund value on load
    fundReqInput.value = formatIndianNumber(fundReqInput.value);

    calculate(); // Initial calculation for default values
});
