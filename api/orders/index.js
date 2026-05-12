import { Redis } from '@upstash/redis';

const ORDERS_KEY = 'eto:orders';
const redis = Redis.fromEnv();

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
}

async function readOrders() {
  const orders = await redis.get(ORDERS_KEY);
  return Array.isArray(orders) ? orders : [];
}

export default async function handler(req, res) {
  noStore(res);

  try {
    if (req.method === 'GET') {
      const orders = await readOrders();
      return json(res, 200, orders);
    }

    if (req.method === 'POST') {
      const incoming = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!incoming || typeof incoming !== 'object') return json(res, 400, { error: 'Invalid order payload.' });

      const orders = await readOrders();
      const next = [incoming, ...orders];
      await redis.set(ORDERS_KEY, next);
      return json(res, 201, incoming);
    }

    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return json(res, 500, { error: message });
  }
}
