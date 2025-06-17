// api/gcf-scraper.js
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    // SIFMA Repo Statistics page
    const response = await fetch('https://www.sifma.org/resources/research/repo-market-fact-sheet/');
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let gcfVolatility = 125; // Default
    
    // Look for repo rate statistics
    $('table').each((i, table) => {
      const tableText = $(table).text();
      if (tableText.includes('GCF') || tableText.includes('Repo')) {
        // Extract volatility or spread data
        $(table).find('tr').each((j, row) => {
          const cells = $(row).find('td');
          cells.each((k, cell) => {
            const text = $(cell).text();
            // Look for volatility, standard deviation, or range
            if (text.includes('vol') || text.includes('std') || text.includes('range')) {
              const nextCell = $(cell).next('td').text();
              const value = parseFloat(nextCell.replace(/[^0-9.-]+/g, ''));
              if (!isNaN(value) && value > 0) {
                gcfVolatility = value * 100; // Convert to basis points if needed
              }
            }
          });
        });
      }
    });
    
    // Alternative: Calculate from repo rate data if available
    const repoRates = [];
    $('td:contains("GCF"), td:contains("Repo Rate")').each((i, el) => {
      const rate = $(el).next('td').text();
      const value = parseFloat(rate.replace(/[^0-9.-]+/g, ''));
      if (!isNaN(value)) repoRates.push(value);
    });
    
    if (repoRates.length > 1) {
      // Calculate volatility from rates
      const mean = repoRates.reduce((a, b) => a + b) / repoRates.length;
      const variance = repoRates.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / repoRates.length;
      gcfVolatility = Math.sqrt(variance) * 100; // Convert to bps
    }
    
    res.status(200).json({
      value: Math.max(50, Math.min(300, gcfVolatility)),
      unit: 'bps',
      source: 'SIFMA Repo Market Data',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Fallback to DTCC data if available
    try {
      const dtccResponse = await fetch('https://www.dtcc.com/dtcc-connection/articles/2024/january/gcf-repo-index');
      const dtccHtml = await dtccResponse.text();
      const $dtcc = cheerio.load(dtccHtml);
      
      let dtccValue = 125;
      $dtcc('*:contains("volatility"), *:contains("spread")').each((i, el) => {
        const text = $dtcc(el).text();
        const match = text.match(/(\d+\.?\d*)\s*(bps|basis points)/i);
        if (match) {
          dtccValue = parseFloat(match[1]);
        }
      });
      
      res.status(200).json({
        value: dtccValue,
        unit: 'bps',
        source: 'DTCC GCF Repo Data',
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      res.status(500).json({ value: 125, error: error.message });
    }
  }
}
