import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const NASA_API_KEY = process.env.NASA_API_KEY;
    
    // Get latest photos from Perseverance rover
    const response = await fetch(
      `https://api.nasa.gov/mars-photos/api/v1/rovers/perseverance/latest_photos?api_key=${NASA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`NASA API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Transform the photos data to include only necessary information
    const photos = data.latest_photos.map(photo => ({
      id: photo.id,
      img_src: photo.img_src,
      earth_date: photo.earth_date,
      camera: {
        name: photo.camera.name,
        full_name: photo.camera.full_name
      },
      rover: {
        name: photo.rover.name,
        status: photo.rover.status
      }
    }));

    // Cache the response
    res.setHeader('Cache-Control', 's-maxage=3600'); // Cache for 1 hour

    return res.status(200).json({ photos });
  } catch (error) {
    console.error('Mars Photos Error:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch Mars photos',
      error: error.message 
    });
  }
}