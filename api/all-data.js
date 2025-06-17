export default async function handler(req, res) {
  try {
    // Fetch Bitcoin price
    const btcResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const btcData = await btcResponse.json();
    
    // Return all available data
    res.status(200).json({
      bitcoin: btcData.bitcoin.usd,
      btfp: 87.5, // Mock for now
      ecbAssets: 4500, // Mock for now
      fxSwapUsage: 45, // Mock for now
      gcfVolatility: 125, // Mock for now
      crossCurrencyBasis: -65, // Mock for now
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
