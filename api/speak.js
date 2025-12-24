import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // OpenAI TTS - 'nova' and 'shimmer' sound good for Chinese
    const response = await openai.audio.speech.create({
      model: 'tts-1',      // or 'tts-1-hd' for higher quality (slower, more expensive)
      voice: 'nova',       // Options: alloy, echo, fable, onyx, nova, shimmer
      input: text,
      response_format: 'mp3',
    });

    // Get audio as buffer and send back
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.send(audioBuffer);

  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'TTS generation failed', details: error.message });
  }
}
