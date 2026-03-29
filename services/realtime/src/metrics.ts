import { Registry, Gauge, Counter, collectDefaultMetrics } from 'prom-client';
import { createServer } from 'http';

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const socketConnectionsActive = new Gauge({
  name: 'socket_connections_active',
  help: 'Currently active Socket.io connections',
  registers: [registry],
});

export const socketConnectionsTotal = new Counter({
  name: 'socket_connections_total',
  help: 'Total Socket.io connections since start',
  registers: [registry],
});

export const socketEventsTotal = new Counter({
  name: 'socket_events_total',
  help: 'Total Socket.io events processed',
  labelNames: ['event'],
  registers: [registry],
});

// Expose /metrics endpoint on a separate port for Prometheus scraping
export function startMetricsServer(port = 9091): void {
  const metricsServer = createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', registry.contentType);
      res.end(await registry.metrics());
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  metricsServer.listen(port, () => {
    console.log(`[Metrics] Realtime metrics on port ${port}`);
  });
}
