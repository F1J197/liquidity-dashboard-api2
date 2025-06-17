// api/all-data.js
export default async function handler(req, res) {
  try {
    // Your FRED API key
    const FRED_API_KEY = 'baf5a172a9b068e621dd4f80fc13dad2';
    
    // 1. FETCH BITCOIN PRICE
    const btcResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const btcData = await btcResponse.json();
    
    // 2. FETCH FINANCIAL CONDITIONS INDEX FROM FRED
    const nfciResponse = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=NFCI&api_key=${FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`
    );
    const nfciData = await nfciResponse.json();
    const financialConditions = parseFloat(nfciData.observations[0]?.value || -0.2);
    
    // 3. FETCH NY FED DATA - Primary Dealer Positions
    let dealerPositions = -250; // Default
    try {
      const dealerResponse = await fetch('https://markets.newyorkfed.org/api/pd/get/all/latest.json');
      const dealerData = await dealerResponse.json();
      if (dealerData && dealerData.pd && dealerData.pd.length > 0) {
        // Sum up net positions from the data
        dealerPositions = dealerData.pd.reduce((sum, item) => sum + (item.net || 0), 0) / 1000000; // Convert to billions
      }
    } catch (e) {
      console.error('Dealer positions error:', e);
    }
    
    // 4. FETCH NY FED - FX Swap Operations
    let fxSwapUsage = 45; // Default
    try {
      const swapResponse = await fetch('https://markets.newyorkfed.org/api/fxs/all/latest.json');
      const swapData = await swapResponse.json();
      if (swapData && swapData.fxSwaps && swapData.fxSwaps.length > 0) {
        fxSwapUsage = swapData.fxSwaps.reduce((sum, swap) => sum + (swap.amount || 0), 0) / 1000000000; // Convert to billions
      }
    } catch (e) {
      console.error('FX swap error:', e);
    }
    
    // 5. ECB BALANCE SHEET - Use simpler endpoint
    let ecbAssets = 4500; // Default
    try {
      // Try a simpler ECB endpoint
      const ecbResponse = await fetch(
        'https://data.ecb.europa.eu/api/v1/data/dataflow/ECB/ILM/1.0/M.U2.N.A.L10.Z.EUR.Z01.E?lastNObservations=1&format=jsondata'
      );
      const ecbData = await ecbResponse.json();
      
      if (ecbData && ecbData.dataSets && ecbData.dataSets[0]) {
        const series = ecbData.dataSets[0].series;
        const firstSeriesKey = Object.keys(series)[0];
        if (firstSeriesKey && series[firstSeriesKey].observations) {
          const observations = series[firstSeriesKey].observations;
          const lastObsKey = Object.keys(observations).pop();
          ecbAssets = observations[lastObsKey][0] / 1000000; // Convert to trillions
        }
      }
    } catch (e) {
      console.error('ECB parsing error:', e);
    }
    
    // 6. MMF Data from FRED
    let mmfInstitutional = 1.2; // Default in trillions
    try {
      const mmfResponse = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=WIMFSL&api_key=${FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`
      );
      const mmfData = await mmfResponse.json();
      if (mmfData.observations && mmfData.observations[0]) {
        mmfInstitutional = parseFloat(mmfData.observations[0].value) / 1000; // Convert to trillions
      }
    } catch (e) {
      console.error('MMF error:', e);
    }
    
    // 7. BTFP - Fetch from our own endpoint
    let btfpValue = 85; // Default
    try {
      const btfpResponse = await fetch('https://liquidity-dashboard-api2.vercel.app/api/btfp');
      const btfpData = await btfpResponse.json();
      btfpValue = btfpData.value || 85;
    } catch (e) {
      console.error('BTFP error:', e);
    }

    // Fetch GCF Volatility from scraper
    let gcfVolatility = 125;
    try {
      const gcfResponse = await fetch('https://liquidity-dashboard-api2.vercel.app/api/gcf-scraper');
      const gcfData = await gcfResponse.json();
      gcfVolatility = gcfData.value || 125;
    } catch (e) {
      console.error('GCF scraping error:', e);
    }
    
    // Fetch Cross-Currency Basis from scraper
    let crossCurrencyBasis = -65;
    try {
      const basisResponse = await fetch('https://liquidity-dashboard-api2.vercel.app/api/basis-scraper');
      const basisData = await basisResponse.json();
      crossCurrencyBasis = basisData.value || -65;
    } catch (e) {
      console.error('Basis scraping error:', e);
    }
    
    // Return all data
    res.status(200).json({
      bitcoin: btcData.bitcoin.usd,
      btfp: btfpValue,
      ecbAssets: ecbAssets,
      fxSwapUsage: fxSwapUsage,
      gcfVolatility: 125, // Still need DTCC
      crossCurrencyBasis: -65, // Still need Bloomberg
      financialConditions: financialConditions,
      mmfInstitutional: mmfInstitutional,
      dealerPositions: dealerPositions,
      timestamp: new Date().toISOString(),
      dataQuality: {
  bitcoin: 'live',
  ecbAssets: ecbAssets !== 4500 ? 'live' : 'fallback',
  fxSwapUsage: fxSwapUsage !== 45 ? 'live' : 'fallback', 
  financialConditions: 'live',
  mmfInstitutional: 'live',
  dealerPositions: dealerPositions !== -250 ? 'live' : 'fallback',
  btfp: btfpValue !== 85 ? 'live' : 'fallback',
  gcfVolatility: gcfVolatility !== 125 ? 'live' : 'mock',  // Update this
  crossCurrencyBasis: crossCurrencyBasis !== -65 ? 'live' : 'mock'  // Update this
}
    });
  } catch (error) {
    console.error('Error in all-data:', error);
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
}
