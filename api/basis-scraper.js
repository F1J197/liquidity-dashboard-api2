// api/basis-scraper.js
export default async function handler(req, res) {
  try {
    let crossCurrencyBasis = -65;
    let source = 'Default';
    
    // Method 1: Calculate from interest rate differentials
    try {
      const FRED_API_KEY = 'baf5a172a9b068e621dd4f80fc13dad2';
      
      // Get US 3-month rate
      const usResponse = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=TB3MS&api_key=${FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`
      );
      const usData = await usResponse.json();
      
      // Get German 3-month rate (proxy for EUR)
      const eurResponse = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=IR3TIB01DEM156N&api_key=${FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`
      );
      const eurData = await eurResponse.json();
      
      if (usData.observations?.[0] && eurData.observations?.[0]) {
        const usRate = parseFloat(usData.observations[0].value);
        const eurRate = parseFloat(eurData.observations[0].value);
        
        // Simple basis calculation from rate differential
        // When USD rates > EUR rates, basis is typically negative
        const rateDiff = usRate - eurRate;
        crossCurrencyBasis = -20 - (rateDiff * 15); // Scale the difference
        crossCurrencyBasis = Math.round(Math.max(-150, Math.min(-10, crossCurrencyBasis)));
        source = 'Calculated from US/EUR rate differential';
      }
    } catch (e) {
      console.error('Rate calculation error:', e);
    }
    
    // Method 2: Use LIBOR-OIS spread as proxy
    if (source === 'Default') {
      try {
        const FRED_API_KEY = 'baf5a172a9b068e621dd4f80fc13dad2';
        const oisResponse = await fetch(
          `https://api.stlouisfed.org/fred/series/observations?series_id=TEDRATE&api_key=${FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`
        );
        const oisData = await oisResponse.json();
        
        if (oisData.observations?.[0]) {
          const tedSpread = parseFloat(oisData.observations[0].value);
          // TED spread correlates with cross-currency basis
          crossCurrencyBasis = -40 - (tedSpread * 50);
          crossCurrencyBasis = Math.round(Math.max(-150, Math.min(-10, crossCurrencyBasis)));
          source = 'Estimated from TED spread';
        }
      } catch (e) {
        console.error('TED spread error:', e);
      }
    }
    
    res.status(200).json({
      value: crossCurrencyBasis,
      unit: 'bps',
      source: source,
      timestamp: new Date().toISOString(),
      quality: source === 'Default' ? 'fallback' : 'calculated'
    });
  } catch (error) {
    res.status(500).json({ 
      value: -65, 
      unit: 'bps',
      source: 'Default',
      error: error.message 
    });
  }
}
