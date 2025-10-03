document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const tickerInput = document.getElementById('ticker');
    const strikePriceInput = document.getElementById('strike-price');
    // FIXED ID to match the HTML: 'expiryDate'
    const expiryDateInput = document.getElementById('expiryDate'); 
    const quantityInput = document.getElementById('quantity');
    const premiumInput = document.getElementById('premium');
    // FIXED ID to match the HTML: 'fundReq'
    const fundReqInput = document.getElementById('fundReq'); 

    const marketPriceOutput = document.getElementById('market-price');
    const dteOutput = document.getElementById('dte');
    const roiOutput = document.getElementById('roi');
    const deltaOutput = document.getElementById('delta');

    // --- Initial Setup ---

    // CORRECTED LOGIC: last Tuesday of current month if in future, else next month
    function setDefaultExpiryDate() {
        const TUESDAY = 2;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to start of day

        let year = today.getFullYear();
        let month = today.getMonth();
        
        // 1. Find the last Tuesday of the CURRENT month
        let currentMonthLastDay = new Date(year, month + 1, 0); 
        let lastTuesdayCurrent = new Date(currentMonthLastDay);
        
        // Step back until we hit Tuesday
        while (lastTuesdayCurrent.getDay() !== TUESDAY) {
            lastTuesdayCurrent.setDate(lastTuesdayCurrent.getDate() - 1);
        }

        let finalExpiryDate = lastTuesdayCurrent;

        // 2. Check the condition: Use next month's Tuesday if current is on or before today
        if (lastTuesdayCurrent <= today) {
            // Move to the next month
            month++;
            if (month > 11) {
                month = 0;
                year++;
            }
            
            // Find the last Tuesday of the NEXT month
            let nextMonthLastDay = new Date(year, month + 1, 0);
            finalExpiryDate = new Date(nextMonthLastDay);
            
            // Step back until we hit Tuesday
            while (finalExpiryDate.getDay() !== TUESDAY) {
                finalExpiryDate.setDate(finalExpiryDate.getDate() - 1);
            }
        }
        
        // Format the date as YYYY-MM-DD for the input field
        const y = finalExpiryDate.getFullYear();
        const m = String(finalExpiryDate.getMonth() + 1).padStart(2, '0');
        const d = String(finalExpiryDate.getDate()).padStart(2, '0');
        expiryDateInput.value = `${y}-${m}-${d}`;
    }

    // --- Calculation Logic ---

    async function calculate() {
        // 1. Get all input values
        const ticker = tickerInput.value || 'INFY.NS';
        const strikePrice = parseFloat(strikePriceInput.value) || 0;
        const expiryDate = expiryDateInput.value;
        const quantity = parseInt(quantityInput.value) || 0;
        const premium = parseFloat(premiumInput.value) || 0;
        
        // Use unformatted fund req value (remove commas) for calculation
        const fundReq = parseFloat(fundReqInput.value.replace(/,/g, '')) || 0; 

        // 2. Fetch Market Price (Only if marketPriceOutput is not already set by fetchMarketPrice button)
        let marketPriceText = marketPriceOutput.textContent.replace('Rs. ', '').replace('Fetching...', '').replace('Error', '').trim();
        let marketPrice = parseFloat(marketPriceText) || 0;

        // 3. Calculate DTE (Days to Expiry)
        let dte = 0;
        if (expiryDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); 
            const expiry = new Date(expiryDate);
            const diffTime = expiry - today;
            dte = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        dteOutput.textContent = dte >= 0 ? dte : 'Expired';
        updateLegendColor(dteOutput, dte, [15, 8], false);

        // 4. Calculate ROI Per Week
        let roi = 0;
        if (fundReq > 0 && dte > 0) {
            roi = (((quantity * premium) / fundReq) / (dte / 7)) * 100;
        }
        roiOutput.textContent = `${roi.toFixed(2)}%`;
        updateLegendColor(roiOutput, roi, [1, 0.5], true);

        // 5. Calculate Delta %
        let delta = 0;
        if (strikePrice > 0 && marketPrice > 0) {
            delta = ((marketPrice - strikePrice) / strikePrice) * 100;
        }
        deltaOutput.textContent = `${delta.toFixed(2)}%`;
        
        // Apply new Delta color-coding criteria
        applyDeltaColor(delta);
    }

    // --- Helper Functions ---
    
    // NEW: Delta % specific color logic
    function applyDeltaColor(deltaValue) {
        const delta = parseFloat(deltaValue);
        deltaOutput.classList.remove('color-red', 'color-amber', 'color-green'); 

        if (isNaN(delta)) return;

        if (delta < 5) {
            // Delta < 5% -> Red
            deltaOutput.classList.add('color-red');
        } else if (delta < 10) {
            // Delta >= 5% but < 10% -> Amber
            deltaOutput.classList.add('color-amber');
        } else {
            // Delta >= 10% -> Green
            deltaOutput.classList.add('color-green');
        }
    }


    function updateLegendColor(element, value, thresholds, isGreenHigh) {
        // Use the correct color classes defined in the HTML
        element.classList.remove('color-red', 'color-amber', 'color-green'); 
        const [high, low] = thresholds;

        if (isGreenHigh) { 
            if (value >= high) {
                element.classList.add('color-green');
            } else if (value >= low) {
                element.classList.add('color-amber');
            } else {
                element.classList.add('color-red');
            }
        } else { 
            if (value >= high) {
                element.classList.add('color-green');
            } else if (value >= low) {
                element.classList.add('color-amber');
            } else {
                element.classList.add('color-red');
            }
        }
    }


    // --- Event Listeners ---
    // Note: The fundReq formatting listener is assumed to be in the HTML script block
    const inputs = [tickerInput, strikePriceInput, expiryDateInput, quantityInput, premiumInput, fundReqInput];
    
    // Listen to all inputs to re-calculate
    inputs.forEach(input => {
        input.addEventListener('input', calculate);
    });

    // --- Initial Call ---
    setDefaultExpiryDate();
    calculate();
});