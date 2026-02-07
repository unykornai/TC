export { buildState, generateDashboardHTML, startServer } from './server';

// ── Auto-start when run directly ──────────────────────────────
if (require.main === module) {
  const { startServer: boot } = require('./server');
  boot();
}
