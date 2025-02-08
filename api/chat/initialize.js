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
    let enhancedPrompt = `As CosmoGuide, an expert in astronomy and space science, please respond to this question: "${message}"\n\n`;
    
    // Add relevant NASA data context
    if (context.apod) {
      enhancedPrompt += `Today's NASA Astronomy Picture of the Day is about: ${context.apod.title}. ${context.apod.explanation}\n\n`;
    }
    
    if (context.asteroids?.length > 0) {
      enhancedPrompt += `Currently tracking ${context.asteroids.length} near-Earth objects.\n\n`;
    }
    
    if (context.issPosition) {
      enhancedPrompt += `The International Space Station is currently at coordinates: ${context.issPosition.iss_position.latitude}°, ${context.issPosition.iss_position.longitude}°\n\n`;
    }

    // Get response from Gemini
    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    
    return res.status(200).json({ 
      response: response.text(),
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ message: 'Failed to process chat message' });
  }
}