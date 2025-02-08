import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const NASA_API_KEY = process.env.NASA_API_KEY;
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    const response = await fetch(
      `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`NASA API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Transform and filter the asteroid data
    const asteroids = Object.values(data.near_earth_objects)[0]
      .map(asteroid => ({
        id: asteroid.id,
        name: asteroid.name,
        estimated_diameter: {
          kilometers: {
            estimated_diameter_min: asteroid.estimated_diameter.kilometers.estimated_diameter_min,
            estimated_diameter_max: asteroid.estimated_diameter.kilometers.estimated_diameter_max
          }
        },
        is_potentially_hazardous_asteroid: asteroid.is_potentially_hazardous_asteroid,
        close_approach_data: asteroid.close_approach_data.map(approach => ({
          close_approach_date: approach.close_approach_date,
          miss_distance: {
            kilometers: approach.miss_distance.kilometers,
            lunar: approach.miss_distance.lunar
          },
          relative_velocity: {
            kilometers_per_hour: approach.relative_velocity.kilometers_per_hour
          }
        }))
      }))
      .sort((a, b) => {
        // Sort by hazard level and then by close approach distance
        if (a.is_potentially_hazardous_asteroid !== b.is_potentially_hazardous_asteroid) {
          return b.is_potentially_hazardous_asteroid ? 1 : -1;
        }
        return (
          parseFloat(a.close_approach_data[0].miss_distance.kilometers) -
          parseFloat(b.close_approach_data[0].miss_distance.kilometers)
        );
      });

    // Cache the response
    res.setHeader('Cache-Control', 's-maxage=3600'); // Cache for 1 hour

    return res.status(200).json(asteroids);

  } catch (error) {
    console.error('Asteroids Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch asteroid data',
      details: error.message
    });
  }
}