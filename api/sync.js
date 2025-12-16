// Simple sync system using Vercel KV or in-memory (for demo)
// In production, replace with Vercel KV: import { kv } from '@vercel/kv'

// In-memory store (will reset on cold starts - replace with Vercel KV for persistence)
const syncStore = new Map();

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

    const data = syncStore.get(code.toUpperCase());

    if (!data) {
      return res.status(404).json({ error: 'Sync code not found' });
    }

    return res.json({ progress: data.progress, messages: data.messages });
  }

  // POST - Save or create sync
  if (req.method === 'POST') {
    const { code, progress, messages } = req.body;

    // If code provided, update existing
    if (code) {
      const upperCode = code.toUpperCase();
      syncStore.set(upperCode, {
        progress,
        messages: messages?.slice(-50) || [], // Keep last 50 messages
        updatedAt: Date.now()
      });
      return res.json({ code: upperCode, success: true });
    }

    // Generate new code
    let newCode = generateSyncCode();
    let attempts = 0;
    while (syncStore.has(newCode) && attempts < 10) {
      newCode = generateSyncCode();
      attempts++;
    }

    syncStore.set(newCode, {
      progress,
      messages: messages?.slice(-50) || [],
      updatedAt: Date.now()
    });

    return res.json({ code: newCode, success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
