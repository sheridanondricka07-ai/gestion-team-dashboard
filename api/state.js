import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Simple check to ensure we only handle GET/POST
  if (req.method === 'GET') {
    try {
      const state = await kv.get('team_state');
      // If no state exists yet, return empty object so app uses defaults
      return res.status(200).json(state || null);
    } catch (error) {
      console.error('KV Get Error:', error);
      return res.status(500).json({ error: 'Failed to fetch state' });
    }
  }

  if (req.method === 'POST') {
    try {
      const newState = req.body;
      if (!newState) {
        return res.status(400).json({ error: 'No state provided' });
      }
      await kv.set('team_state', newState);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('KV Set Error:', error);
      return res.status(500).json({ error: 'Failed to save state' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
