import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Using the pre-generated query format from NASA docs but modified for our needs
    const response = await fetch(
      'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,disc_year,discoverymethod,sy_dist,pl_type+from+pscomppars+where+default_flag=1+order+by+disc_year+desc&format=json'
    );

    if (!response.ok) {
      throw new Error(`Exoplanet Archive responded with status: ${response.status}`);
    }

    const text = await response.text(); // First get the response as text
    let data;
    try {
      data = JSON.parse(text); // Then try to parse it
    } catch (e) {
      console.error('Failed to parse JSON:', text.substring(0, 500)); // Log first 500 chars if parse fails
      throw new Error('Failed to parse exoplanet data');
    }

    // Transform and clean the data
    const exoplanets = data
      .filter(planet => planet.pl_name && planet.disc_year) // Only include planets with names and discovery years
      .map(planet => ({
        pl_name: planet.pl_name,
        disc_year: parseInt(planet.disc_year),
        discoverymethod: planet.discoverymethod || 'Unknown',
        sy_dist: parseFloat(planet.sy_dist) || null,
        pl_type: planet.pl_type || 'Unknown'
      }))
      .slice(0, 10); // Limit to 10 most recent discoveries

    // Cache the response for 24 hours
    res.setHeader('Cache-Control', 's-maxage=86400');
    return res.status(200).json(exoplanets);
  } catch (error) {
    console.error('Exoplanets Error:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch exoplanets data',
      error: error.message 
    });
  }
}
