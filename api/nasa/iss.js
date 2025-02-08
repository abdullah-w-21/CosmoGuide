import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const response = await fetch('http://api.open-notify.org/iss-now.json');
    
    if (!response.ok) {
      throw new Error(`ISS API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the response for a short time since ISS position updates frequently
    res.setHeader('Cache-Control', 's-maxage=5'); // Cache for 5 seconds

    return res.status(200).json(data);
  } catch (error) {
    console.error('ISS Position Error:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch ISS position',
      error: error.message 
    });
  }
}