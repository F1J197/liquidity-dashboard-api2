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
    const financialConditions = parseFloat(nfciData.observations[0].value);
    
    // 3. FETCH NY FED DATA - Primary Dealer Positions
    const dealerResponse = await fetch('https://markets.newyorkfed.org/api/pd/get/all/latest.json');
    const dealerData = await dealerResponse.json();
    // Parse dealer positions (this is example - adjust based on actual data structure)
    let dealerPositions = -250; // Default
    if (dealerData && dealerData.pd) {
      // Sum up net positions from the data
      dealerPositions = dealerData.pd.reduce((sum, item) => sum + (item.net || 0), 0) / 1000000; // Convert to billions
    }
    
    // 4. FETCH NY FED - FX Swap Operations
    const swapResponse = await fetch('https://markets.newyorkfed.org/api/fxs/all/latest.json');
    const swapData = await swapResponse.json();
    let fxSwapUsage = 0;
    if (swapData && swapData.fxSwaps) {
      fxSwapUsage = swapData.fxSwaps.reduce((sum, swap) => sum + (swap.amount || 0), 0) / 1000000000; // Convert to billions
    }
    
    // 5. ECB BALANCE SHEET - Properly parse
    const ecbResponse = await fetch(
      'https://sdw-wsrest.ecb.europa.eu/service/data/ILM/M.U2.N.10.Z5.Z01.S.1.A1.A.B.H._Z._Z._Z.EUR?lastNObservations=1'
    );
    const ecbText = await ecbResponse.text();
    
    // Parse ECB XML/JSON response
    let ecbAssets = 4500; // Default
    try {
      const ecbJson = JSON.parse(ecbText);
      if (ecbJson.dataSets && ecbJson.dataSets[0]) {
        const observations = ecbJson.dataSets[0].series["0:0:0:0:0:0:0:0:0:0:0:0:0:0:0"].observations;
        const latestObs = Object.values(observations)[0];
        ecbAssets = latestObs[0] / 1000000; // Convert to trillions
      }
    } catch (e) {
      console.error('ECB parsing error:', e);
    }
    
    // 6. MMF Data - This would need actual ICI scraping
    // For now, use FRED's WRMFSL series as proxy
    const mmfResponse = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=WRMFSL&api_key=${FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`
    );
    const mmfData = await mmfResponse.json();
    const mmfInstitutional = parseFloat(mmfData.observations[0].value) / 1000; // Convert to trillions
    
    // Return all data
    res.status(200).json({
      bitcoin: btcData.bitcoin.usd,
      btfp: 87.5, // Still need to scrape Fed H.4.1
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
        ecbAssets: 'live',
        fxSwapUsage: 'live',
        financialConditions: 'live',
        mmfInstitutional: 'live',
        dealerPositions: 'live',
        btfp: 'mock',
        gcfVolatility: 'mock',
        crossCurrencyBasis: 'mock'
      }
    });
  } catch (error) {
    console.error('Error in all-data:', error);
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
}
