import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const NASA_API_KEY = process.env.NASA_API_KEY;
    
    // Fetch DONKI notifications for solar flares, CMEs, and geomagnetic storms
    const [flares, cmes, storms] = await Promise.all([
      fetch(`https://api.nasa.gov/DONKI/FLR?api_key=${NASA_API_KEY}`),
      fetch(`https://api.nasa.gov/DONKI/CME?api_key=${NASA_API_KEY}`),
      fetch(`https://api.nasa.gov/DONKI/GST?api_key=${NASA_API_KEY}`)
    ]);

    if (!flares.ok || !cmes.ok || !storms.ok) {
      throw new Error('One or more NASA DONKI APIs failed to respond');
    }

    const [flaresData, cmesData, stormsData] = await Promise.all([
      flares.json(),
      cmes.json(),
      storms.json()
    ]);

    // Transform and combine the space weather data
    const spaceWeather = {
      solarFlares: flaresData.map(flare => ({
        flareID: flare.flareID,
        startTime: flare.beginTime,
        peakTime: flare.peakTime,
        endTime: flare.endTime,
        classType: flare.classType,
        sourceLocation: flare.sourceLocation,
        activeRegionNum: flare.activeRegionNum
      })),
      
      coronalMassEjections: cmesData.map(cme => ({
        activityID: cme.activityID,
        startTime: cme.startTime,
        speed: cme.speed,
        type: cme.type,
        note: cme.note
      })),
      
      geomagneticStorms: stormsData.map(storm => ({
        gstID: storm.gstID,
        startTime: storm.startTime,
        allKpIndex: storm.allKpIndex,
        linkedEvents: storm.linkedEvents
      }))
    };

    // Add severity levels and alerts
    const alerts = [];

    // Check for severe solar flares (M and X class)
    spaceWeather.solarFlares.forEach(flare => {
      if (flare.classType.startsWith('X') || flare.classType.startsWith('M')) {
        alerts.push({
          type: 'Solar Flare',
          severity: flare.classType.startsWith('X') ? 'High' : 'Medium',
          message: `${flare.classType} class solar flare detected`,
          time: flare.startTime
        });
      }
    });

    // Check for fast CMEs (> 1000 km/s)
    spaceWeather.coronalMassEjections.forEach(cme => {
      if (cme.speed > 1000) {
        alerts.push({
          type: 'CME',
          severity: cme.speed > 1500 ? 'High' : 'Medium',
          message: `Fast CME detected at ${cme.speed} km/s`,
          time: cme.startTime
        });
      }
    });

    // Add alerts to response
    spaceWeather.alerts = alerts.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Cache the response
    res.setHeader('Cache-Control', 's-maxage=1800'); // Cache for 30 minutes

    return res.status(200).json(spaceWeather);

  } catch (error) {
    console.error('Space Weather Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch space weather data',
      details: error.message
    });
  }
}