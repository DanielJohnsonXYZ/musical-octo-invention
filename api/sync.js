import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function generateSyncCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - Retrieve progress by sync code
  if (req.method === 'GET') {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Sync code required' });
    }

    try {
      const data = await redis.get(`sync:${code.toUpperCase()}`);

      if (!data) {
        return res.status(404).json({ error: 'Sync code not found' });
      }

      return res.json({ progress: data.progress, messages: data.messages });
    } catch (error) {
      console.error('Redis GET error:', error);
      return res.status(500).json({ error: 'Failed to retrieve data' });
    }
  }

  // POST - Save or create sync
  if (req.method === 'POST') {
    const { code, progress, messages } = req.body;

    try {
      // If code provided, update existing
      if (code) {
        const upperCode = code.toUpperCase();
        await redis.set(
          `sync:${upperCode}`,
          {
            progress,
            messages: messages?.slice(-50) || [], // Keep last 50 messages
            updatedAt: Date.now(),
          },
          { ex: 2592000 } // Expire in 30 days
        );
        return res.json({ code: upperCode, success: true });
      }

      // Generate new code - check for collisions
      let newCode = generateSyncCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await redis.exists(`sync:${newCode}`);
        if (!existing) break;
        newCode = generateSyncCode();
        attempts++;
      }

      await redis.set(
        `sync:${newCode}`,
        {
          progress,
          messages: messages?.slice(-50) || [],
          updatedAt: Date.now(),
        },
        { ex: 2592000 } // Expire in 30 days
      );

      return res.json({ code: newCode, success: true });
    } catch (error) {
      console.error('Redis POST error:', error);
      return res.status(500).json({ error: 'Failed to save data' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
