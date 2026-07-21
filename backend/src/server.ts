// 生产入口
import { buildApp } from './app.js';
import { CONFIG } from './config.js';

const app = await buildApp(process.env.DATABASE_URL);

try {
  await app.listen({ port: CONFIG.PORT, host: CONFIG.HOST });
  console.log(`e23-backend listening on ${CONFIG.HOST}:${CONFIG.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
