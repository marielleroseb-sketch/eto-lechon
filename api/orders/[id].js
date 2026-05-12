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
  const id = req.query && req.query.id ? String(req.query.id) : '';
  if (!id) return json(res, 400, { error: 'Missing id.' });

  try {
    if (req.method === 'PATCH') {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const status = payload && typeof payload.status === 'string' ? payload.status : '';
      if (!status) return json(res, 400, { error: 'Missing status.' });

      const orders = await readOrders();
      const updated = orders.map((order) => (order && order.id === id ? { ...order, status } : order));
      await redis.set(ORDERS_KEY, updated);
      return json(res, 200, { ok: true });
    }

    if (req.method === 'DELETE') {
      const orders = await readOrders();
      const filtered = orders.filter((order) => !(order && order.id === id));
      await redis.set(ORDERS_KEY, filtered);
      res.statusCode = 204;
      res.end();
      return;
    }

    res.setHeader('Allow', 'PATCH, DELETE');
    return json(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return json(res, 500, { error: message });
  }
}
