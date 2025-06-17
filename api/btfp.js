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
    
    // Method 1: Look for BTFP in all table cells
    $('td').each((index, element) => {
      const text = $(element).text().trim();
      if (text.includes('Bank Term Funding Program')) {
        // Look for the next td with a number
        const nextTds = $(element).nextAll('td');
        nextTds.each((i, td) => {
          const value = $(td).text().trim();
          const numValue = parseFloat(value.replace(/[,\s]/g, ''));
          if (!isNaN(numValue) && numValue > 0) {
            btfpValue = numValue / 1000; // Convert millions to billions
            return false; // Break the loop
          }
        });
      }
    });
    
    // Method 2: If not found, look in the parent row
    if (!btfpValue) {
      $('tr').each((index, row) => {
        const rowText = $(row).text();
        if (rowText.includes('Bank Term Funding Program')) {
          // Get all numbers in the row
          const numbers = rowText.match(/[\d,]+\.?\d*/g);
          if (numbers && numbers.length > 0) {
            // Take the last number (usually the current value)
            const lastNumber = numbers[numbers.length - 1];
            const value = parseFloat(lastNumber.replace(/,/g, ''));
            if (!isNaN(value)) {
              btfpValue = value / 1000; // Convert to billions
            }
          }
        }
      });
    }
    
    // If still no value, use a reasonable default
    if (!btfpValue) {
      btfpValue = 64.4; // Last known value as fallback
    }
    
    res.status(200).json({
      value: btfpValue,
      unit: 'B',
      source: 'Fed H.4.1 Report',
      timestamp: new Date().toISOString(),
      note: btfpValue === 64.4 ? 'Using fallback value - scraping may need update' : 'Live data'
    });
  } catch (error) {
    res.status(500).json({ 
      value: 64.4, // Fallback
      unit: 'B',
      error: 'Failed to scrape BTFP data', 
      details: error.message 
    });
  }
}
