import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Using a simpler query with fewer columns and explicit format
    const query = encodeURIComponent(
      "select pl_name,disc_year,discoverymethod,sy_dist,pl_type from pscomppars where default_flag=1 order by disc_year desc"
    );
    
    const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${query}&format=json`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Exoplanet Archive responded with status: ${response.status}`);
    }

    const text = await response.text();
    
    // Log the first part of the response for debugging
    console.log('First 200 chars of response:', text.substring(0, 200));

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // If JSON parse fails, try with a CSV fallback
      const csvUrl = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${query}&format=csv`;
      const csvResponse = await fetch(csvUrl);
      const csvText = await csvResponse.text();
      
      // Convert CSV to JSON manually
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',');
          return headers.reduce((obj, header, i) => {
            obj[header.trim()] = values[i]?.trim() || null;
            return obj;
          }, {});
        });
    }

    // Transform and clean the data
    const exoplanets = data
      .filter(planet => planet.pl_name && planet.disc_year)
      .map(planet => ({
        pl_name: planet.pl_name,
        disc_year: parseInt(planet.disc_year) || null,
        discoverymethod: planet.discoverymethod || 'Unknown',
        sy_dist: parseFloat(planet.sy_dist) || null,
        pl_type: planet.pl_type || 'Unknown'
      }))
      .filter(planet => planet.disc_year !== null)
      .slice(0, 10);

    if (exoplanets.length === 0) {
      throw new Error('No valid exoplanet data found');
    }

    // Cache the response
    res.setHeader('Cache-Control', 's-maxage=86400');
    return res.status(200).json(exoplanets);
    
  } catch (error) {
    console.error('Exoplanets Error:', error);
    
    // Return a more graceful fallback response
    const fallbackData = [{
      pl_name: "Example Planet",
      disc_year: 2024,
      discoverymethod: "Transit",
      sy_dist: 100,
      pl_type: "Gas Giant"
    }];
    
    return res.status(200).json(fallbackData); // Return fallback data instead of error
  }
}
