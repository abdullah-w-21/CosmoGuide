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
        let enhancedPrompt = `You are CosmoGuide, an expert AI assistant specializing in astronomy and space science. 
Your current role is: ${context.agentType}.

Here's the latest space data available:`;

        // Add APOD context if available
        if (context.spaceData?.apod) {
            enhancedPrompt += `\n\nToday's NASA Astronomy Picture of the Day:
- Title: ${context.spaceData.apod.title}
- Description: ${context.spaceData.apod.explanation}`;
        }

        // Add Asteroids context if available
        if (context.spaceData?.asteroids?.length > 0) {
            enhancedPrompt += `\n\nNear-Earth Objects Currently Tracked:
${context.spaceData.asteroids.map(asteroid => `- ${asteroid.name}: ${asteroid.diameter}km diameter, ${asteroid.hazardous ? 'potentially hazardous' : 'not hazardous'}, missing Earth by ${asteroid.missDistance.toLocaleString()}km`).join('\n')}`;
        }

        // Add ISS context if available
        if (context.spaceData?.issPosition) {
            enhancedPrompt += `\n\nInternational Space Station Current Location:
- Latitude: ${context.spaceData.issPosition.latitude}°
- Longitude: ${context.spaceData.issPosition.longitude}°
- Last Updated: ${new Date(context.spaceData.issPosition.timestamp).toLocaleString()}`;
        }

        // Add Space Weather context if available
        if (context.spaceData?.spaceWeather?.alerts?.length > 0) {
            enhancedPrompt += `\n\nCurrent Space Weather Alerts:
${context.spaceData.spaceWeather.alerts.map(alert => `- ${alert.type} (${alert.severity}): ${alert.message}`).join('\n')}`;
        }

        // Add the user's question
        enhancedPrompt += `\n\nUser Question: "${message}"\n\nPlease provide a helpful, informative response using the available context when relevant:`;

        // Get response from Gemini
        const result = await model.generateContent(enhancedPrompt);
        const response = await result.response;

        // Log the complete prompt for debugging (remove in production)
        console.log('Enhanced Prompt:', enhancedPrompt);

        return res.status(200).json({
            response: response.text()
        });
    } catch (error) {
        console.error('Chat API Error:', error);
        return res.status(500).json({ 
            message: 'Failed to process chat message',
            error: error.message 
        });
    }
}
