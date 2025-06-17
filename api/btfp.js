// api/btfp.js
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    // Fetch the Fed H.4.1 report
    const response = await fetch('https://www.federalreserve.gov/releases/h41/current/');
    const html = await response.text();
    
    // Load HTML into cheerio
    const $ = cheerio.load(html);
    
    let btfpValue = null;
    
    // Look for BTFP in the tables
    $('table').each((tableIndex, table) => {
      $(table).find('tr').each((rowIndex, row) => {
        const rowText = $(row).text();
        if (rowText.includes('Bank Term Funding Program')) {
          // Get the last cell which typically contains the value
          const cells = $(row).find('td');
          if (cells.length > 0) {
            const valueText = $(cells).last().text().trim();
            // Extract number from text (remove commas, spaces, etc)
            const value = parseFloat(valueText.replace(/[^0-9.-]+/g, ''));
            if (!isNaN(value)) {
              btfpValue = value / 1000; // Convert millions to billions
            }
          }
        }
      });
    });
    
    res.status(200).json({
      value: btfpValue || 0,
      unit: 'B',
      source: 'Fed H.4.1 Report',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch BTFP data', details: error.message });
  }
}
