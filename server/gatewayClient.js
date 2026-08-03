import https from 'node:https';

// IBKR's Client Portal Gateway runs locally with a self-signed cert
// (https://localhost:5000). Browsers reject that outright and the gateway
// sends no CORS headers anyway, so this proxy is what actually talks to it.
// `rejectUnauthorized: false` is scoped to this one agent — used only for
// requests to the gateway on the same machine, never applied process-wide.
const GATEWAY_HOST = process.env.IBKR_GATEWAY_HOST ?? 'localhost';
const GATEWAY_PORT = process.env.IBKR_GATEWAY_PORT ?? 5000;
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

// GET a path from the gateway and parse the JSON response. Rejects on
// network failure or non-2xx status so callers can surface a clear error
// instead of silently returning empty/garbage data.
export function gatewayGet(path) {
  return new Promise((resolve, reject) => {
    // Belt-and-suspenders deadline: some things that might be squatting on
    // port 5000 (e.g. macOS's AirPlay Receiver / Control Center, a known
    // conflict with IBKR's default gateway port) accept the TCP connection
    // but never complete a response, which can leave the `timeout` socket
    // option ineffective. An explicit AbortController guarantees this
    // always settles.
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 8000);

    const req = https.request(
      {
        host: GATEWAY_HOST,
        port: GATEWAY_PORT,
        path: `/v1/api${path}`,
        method: 'GET',
        agent: insecureAgent,
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          clearTimeout(deadline);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`IBKR gateway ${path} responded ${res.statusCode}: ${body.slice(0, 200)}`));
            return;
          }
          try {
            resolve(body ? JSON.parse(body) : null);
          } catch {
            reject(new Error(`IBKR gateway ${path} returned non-JSON response — is something other than the IBKR gateway listening on port ${GATEWAY_PORT}?`));
          }
        });
      }
    );
    req.on('error', (err) => {
      clearTimeout(deadline);
      if (err.name === 'AbortError') {
        reject(new Error(`IBKR gateway ${path} did not respond within 8s — check nothing else (e.g. macOS AirPlay Receiver) is using port ${GATEWAY_PORT}`));
        return;
      }
      reject(new Error(`IBKR gateway unreachable at https://${GATEWAY_HOST}:${GATEWAY_PORT} — ${err.message}`));
    });
    req.end();
  });
}
