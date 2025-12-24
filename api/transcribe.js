import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: false, // Disable body parsing to handle raw audio
  },
};

export default async function handler(req, res) {
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
    // Collect the raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length === 0) {
      return res.status(400).json({ error: 'No audio data received' });
    }

    // Create a File object from the buffer
    const file = new File([buffer], 'audio.webm', { type: 'audio/webm' });

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'zh', // Optimize for Chinese
      response_format: 'json',
    });

    return res.json({
      text: transcription.text,
      success: true
    });

  } catch (error) {
    console.error('Whisper transcription error:', error);
    return res.status(500).json({
      error: 'Transcription failed',
      details: error.message
    });
  }
}
