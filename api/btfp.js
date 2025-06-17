import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    // For now, return mock data until we figure out exact HTML structure
    // You can update this later with actual scraping logic
    res.status(200).json({
      value: 87.5, // Mock value in billions
      unit: 'B',
      timestamp: new Date().toISOString(),
      note: 'Update scraping logic for real data'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch BTFP data' });
  }
}
