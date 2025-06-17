export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://sdw-wsrest.ecb.europa.eu/service/data/ILM/M.U2.N.10.Z5.Z01.A.1._Z.N.ALL?lastNObservations=1'
    );
    const data = await response.json();
    
    // ECB API returns complex structure, this is simplified
    res.status(200).json({
      value: 4500, // Placeholder - update with actual parsing
      unit: 'T€',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ECB data' });
  }
}
