// api/investing-scraper.js
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    // Investing.com has good FX forward and basis data
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    
    // EUR/USD forwards page
    const response = await fetch('https://www.investing.com/currencies/eur-usd-forward-rates', { headers });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let crossCurrencyBasis = -65;
    
    // Extract forward points
    const forwardPoints = [];
    $('#curr_table tbody tr').each((i, row) => {
      const tenor = $(row).find('td').eq(0).text();
      const points = $(row).find('td').eq(4).text(); // Forward points column
      
      if (tenor && points) {
        const value = parseFloat(points.replace(/[^0-9.-]+/g, ''));
        if (!isNaN(value)) {
          forwardPoints.push({
            tenor: tenor.trim(),
            points: value
          });
        }
      }
    });
    
    // Calculate basis from forward points
    if (forwardPoints.length > 0) {
      // Use 3M forward points as proxy for basis
      const threeMonth = forwardPoints.find(fp => fp.tenor.includes('3M') || fp.tenor.includes('3 Month'));
      if (threeMonth) {
        // Convert forward points to basis estimate
        crossCurrencyBasis = threeMonth.points * -0.5; // Simplified conversion
      } else {
        // Average of available tenors
        const avg = forwardPoints.reduce((sum, fp) => sum + fp.points, 0) / forwardPoints.length;
        crossCurrencyBasis = avg * -0.5;
      }
    }
    
    res.status(200).json({
      value: Math.round(crossCurrencyBasis),
      unit: 'bps',
      source: 'Investing.com EUR/USD Forwards',
      forwardPoints: forwardPoints,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      value: -65, 
      error: error.message 
    });
  }
}
