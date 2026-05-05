const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const state = await kv.get('GESTION_TEAM_SHARED_STATE');
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
      await kv.set('GESTION_TEAM_SHARED_STATE', newState);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('KV Set Error:', error);
      return res.status(500).json({ error: 'Failed to save state' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
