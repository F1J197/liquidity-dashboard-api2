// api/mmf.js
export default async function handler(req, res) {
  try {
    // Using FRED API for institutional MMF data
    const FRED_API_KEY = 'baf5a172a9b068e621dd4f80fc13dad2';
    
    // Fetch institutional money market fund assets
    const response = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=WIMFSL&api_key=${FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`
    );
    const data = await response.json();
    
    const value = parseFloat(data.observations[0].value) / 1000; // Convert to trillions
    
    res.status(200).json({
      value: value,
      unit: 'T',
      date: data.observations[0].date,
      source: 'FRED: WIMFSL',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch MMF data', details: error.message });
  }
}
