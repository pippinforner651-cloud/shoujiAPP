import Fastify from 'fastify';
import { userRoutes } from './routes/users.js';
import { activityRoutes } from './routes/activities.js';
import { syncRoutes } from './routes/sync.js';
import { leaderboardRoutes } from './routes/leaderboard.js';
import { inviteRoutes } from './routes/invite.js';
import { authRoutes } from './routes/auth.js';
import { friendRoutes } from './routes/friends.js';
import { feedRoutes } from './routes/feed.js';
import { phoneAuthRoutes } from './routes/phoneAuth.js';
import { eventRoutes } from './routes/events.js';

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
    },
  },
});

// CORS
server.addHook('onRequest', async (_req, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
});

server.options('/*', async (_req, reply) => {
  reply.status(204).send();
});

// Register routes
server.register(userRoutes, { prefix: '/v1/users' });
server.register(activityRoutes, { prefix: '/v1/activities' });
server.register(syncRoutes, { prefix: '/v1/sync' });
server.register(leaderboardRoutes, { prefix: '/v1/leaderboard' });
server.register(inviteRoutes, { prefix: '/v1/invite' });
server.register(authRoutes, { prefix: '/v1/auth' });
server.register(friendRoutes, { prefix: '/v1/friends' });
server.register(feedRoutes, { prefix: '/v1/feed' });
server.register(phoneAuthRoutes, { prefix: '/v1/auth/phone' });
server.register(eventRoutes, { prefix: '/v1/events' });

// Health check
server.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

const start = async () => {
  const port = parseInt(process.env.PORT || '3001', 10);
  try {
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running at http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
