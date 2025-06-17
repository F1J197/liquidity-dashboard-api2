// api/mmf.js
export default async function handler(req, res) {
  try {
    // Using FRED API for institutional MMF data
    const FRED_API_KEY = 'baf5a172a9b068e621dd4f80fc13dad2';
    
    // Get the last 10 observations to ensure we have recent data
    const response = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=WIMFSL&api_key=${FRED_API_KEY}&file_type=json&limit=10&sort_order=desc`
    );
    const data = await response.json();
    
    // Find the most recent non-null observation
    let latestObs = null;
    for (const obs of data.observations) {
      if (obs.value && obs.value !== '.') {
        latestObs = obs;
        break;
      }
    }
    
    if (!latestObs) {
      throw new Error('No valid data found');
    }
    
    const value = parseFloat(latestObs.value) / 1000; // Convert to trillions
    
    res.status(200).json({
      value: value,
      unit: 'T',
      date: latestObs.date,
      source: 'FRED: WIMFSL',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      value: 1.2, // Fallback value in trillions
      unit: 'T',
      error: 'Failed to fetch MMF data', 
      details: error.message 
    });
  }
}
