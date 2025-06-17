// api/gcf-scraper.js
export default async function handler(req, res) {
  try {
    // Try multiple sources
    let gcfVolatility = 125;
    let source = 'Default';
    
    // Method 1: Calculate from SOFR volatility as proxy
    try {
      const FRED_API_KEY = 'baf5a172a9b068e621dd4f80fc13dad2';
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const sofrResponse = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=SOFR&api_key=${FRED_API_KEY}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`
      );
      const sofrData = await sofrResponse.json();
      
      if (sofrData.observations && sofrData.observations.length > 5) {
        // Calculate daily changes
        const changes = [];
        for (let i = 1; i < sofrData.observations.length; i++) {
          const current = parseFloat(sofrData.observations[i].value);
          const previous = parseFloat(sofrData.observations[i-1].value);
          if (!isNaN(current) && !isNaN(previous)) {
            changes.push(Math.abs(current - previous) * 100); // Convert to bps
          }
        }
        
        // Calculate volatility
        const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
        gcfVolatility = Math.round(avgChange * 50); // Scale to typical GCF range
        gcfVolatility = Math.max(50, Math.min(300, gcfVolatility));
        source = 'Calculated from SOFR volatility';
      }
    } catch (e) {
      console.error('SOFR calculation error:', e);
    }
    
    res.status(200).json({
      value: gcfVolatility,
      unit: 'bps',
      source: source,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      value: 125, 
      unit: 'bps',
      error: error.message 
    });
  }
}
