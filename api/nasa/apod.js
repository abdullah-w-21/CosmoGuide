import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const NASA_API_KEY = process.env.NASA_API_KEY;
    const response = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`NASA API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Transform and validate the data
    const apodData = {
      title: data.title,
      url: data.url,
      hdurl: data.hdurl,
      explanation: data.explanation,
      date: data.date,
      mediaType: data.media_type,
      copyright: data.copyright || 'Public Domain'
    };

    // Cache the response (implement your caching strategy here)
    res.setHeader('Cache-Control', 's-maxage=86400'); // Cache for 24 hours

    return res.status(200).json(apodData);

  } catch (error) {
    console.error('APOD Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch APOD data',
      details: error.message
    });
  }
}