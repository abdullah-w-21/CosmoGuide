import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const NASA_API_KEY = process.env.NASA_API_KEY;
    
    // Get confirmed exoplanets from NASA Exoplanet Archive
    const response = await fetch(
      'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,disc_year,discoverymethod,sy_dist,pl_orbper,pl_rade,pl_bmasse,pl_type+from+ps+where+pl_type+is+not+null+order+by+disc_year+desc&format=json'
    );

    if (!response.ok) {
      throw new Error(`Exoplanet Archive responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Transform and clean the data
    const exoplanets = data.map(planet => ({
      pl_name: planet.pl_name,
      disc_year: planet.disc_year,
      discoverymethod: planet.discoverymethod,
      sy_dist: planet.sy_dist, // Distance in light years
      pl_type: planet.pl_type,
      pl_orbper: planet.pl_orbper, // Orbital period in days
      pl_rade: planet.pl_rade, // Planet radius in Earth radii
      pl_bmasse: planet.pl_bmasse // Planet mass in Earth masses
    }));

    // Cache the response
    res.setHeader('Cache-Control', 's-maxage=86400'); // Cache for 24 hours

    return res.status(200).json(exoplanets);
  } catch (error) {
    console.error('Exoplanets Error:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch exoplanets data',
      error: error.message 
    });
  }
}