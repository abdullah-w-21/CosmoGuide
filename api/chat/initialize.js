import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { message, context } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Create a context-aware prompt
    let enhancedPrompt = `You are CosmoGuide, an expert AI assistant specializing in astronomy and space science. `;
    
    // Add agent role if provided
    if (context.agentType) {
      enhancedPrompt += `Your current role is: ${context.agentType}. `;
    }

    // Add space data context
    if (context.spaceData) {
      // Add APOD info
      if (context.spaceData.apod) {
        enhancedPrompt += `\n\nToday's NASA Astronomy Picture of the Day:
Title: ${context.spaceData.apod.title}
Description: ${context.spaceData.apod.explanation}`;
      }

      // Add Asteroids info
      if (context.spaceData.asteroids?.length > 0) {
        enhancedPrompt += '\n\nNear-Earth Objects Currently Tracked:';
        context.spaceData.asteroids.forEach(asteroid => {
          enhancedPrompt += `\n- ${asteroid.name}: ${asteroid.diameter}km diameter, ${asteroid.hazardous ? 'potentially hazardous' : 'not hazardous'}, missing Earth by ${asteroid.missDistance.toLocaleString()}km`;
        });
      }

      // Add ISS Position
      if (context.spaceData.issPosition) {
        enhancedPrompt += `\n\nInternational Space Station Current Location:
- Latitude: ${context.spaceData.issPosition.latitude}°
- Longitude: ${context.spaceData.issPosition.longitude}°
- Last Updated: ${context.spaceData.issPosition.timestamp}`;
      }

      // Add Space Weather
      if (context.spaceData.spaceWeather?.alerts) {
        enhancedPrompt += '\n\nCurrent Space Weather Alerts:';
        context.spaceData.spaceWeather.alerts.forEach(alert => {
          enhancedPrompt += `\n- ${alert.type} (${alert.severity}): ${alert.message}`;
        });
      }

      // Add Mars Photos info
      if (context.spaceData.marsPhotos) {
        enhancedPrompt += `\n\nMars Rover Update:
- Latest photos from ${context.spaceData.marsPhotos.rover} rover
- ${context.spaceData.marsPhotos.count} new photos taken on ${context.spaceData.marsPhotos.latestDate}`;
      }
    }

    // Add chat history if available
    if (context.chatHistory?.length > 0) {
      enhancedPrompt += '\n\nPrevious conversation context:';
      context.chatHistory.forEach(msg => {
        enhancedPrompt += `\n${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`;
      });
    }

    // Add the current message
    enhancedPrompt += `\n\nHuman: ${message}\n\nAssistant: `;

    // Get response from Gemini
    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    
    return res.status(200).json({ 
      response: response.text(),
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ 
      message: 'Failed to process chat message',
      error: error.message 
    });
  }
}
