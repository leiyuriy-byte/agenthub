import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { initializeDatabase } from '@agenthub/db';
import authPlugin from './plugins/auth.js';
import { userRoutes } from './routes/user.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { agentRoutes } from './routes/agent.routes.js';
import { channelRoutes } from './routes/channel.routes.js';
import { postRoutes } from './routes/post.routes.js';
import { commentRoutes } from './routes/comment.routes.js';
import { notificationRoutes } from './routes/notification.routes.js';
import { messageRoutes } from './routes/message.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { searchRoutes } from './routes/search.routes.js';
import { uploadRoutes } from './routes/upload.routes.js';
import { feedRoutes } from './routes/feed.routes.js';
import { oauthRoutes } from './routes/oauth.routes.js';
import { reportRoutes } from './routes/report.routes.js';
import { initializeWebSocket } from './services/websocket.service.js';
import { initializeEmailTransporter } from './services/email.service.js';

const fastify = Fastify({
  trustProxy: true,
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

// Register plugins
await fastify.register(helmet, {
  contentSecurityPolicy: false,
});

await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : true,
  credentials: true,
});

await fastify.register(rateLimit, {
  max: 1000,
  timeWindow: '1 minute',
  keyGenerator: (request) => {
    // Use IP + user agent for rate limiting
    return request.ip + (request.headers['user-agent'] || '');
  },
  global: true,
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  sign: {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
});

await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'AgentHub API',
      description: 'API for AI Agent Developer Community',
      version: '1.0.0',
    },
    servers: [{ url: 'http://localhost:3001' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
});

// Custom auth plugin
await fastify.register(authPlugin);

// Initialize database
await initializeDatabase();

// Initialize email transporter
initializeEmailTransporter();

// Register routes
await fastify.register(userRoutes, { prefix: '/api/users' });
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(agentRoutes, { prefix: '/api/agents' });
await fastify.register(channelRoutes, { prefix: '/api/channels' });
await fastify.register(postRoutes, { prefix: '/api/posts' });
await fastify.register(commentRoutes, { prefix: '/api/comments' });
await fastify.register(notificationRoutes, { prefix: '/api/notifications' });
await fastify.register(messageRoutes, { prefix: '/api/messages' });
await fastify.register(adminRoutes, { prefix: '/api/admin' });
await fastify.register(searchRoutes, { prefix: '/api/search' });
await fastify.register(uploadRoutes, { prefix: '/api/upload' });
await fastify.register(feedRoutes, { prefix: '/api/feed' });
await fastify.register(oauthRoutes, { prefix: '/api/auth' });
await fastify.register(reportRoutes, { prefix: '/api/reports' });

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Initialize WebSocket after server starts
const initializeWebSocketServer = async () => {
  // Wait a bit for the server to be fully ready
  await new Promise(resolve => setTimeout(resolve, 500));
  initializeWebSocket(fastify);
};

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📚 API docs at http://localhost:${port}/docs`);
    
    // Initialize WebSocket after server starts
    await initializeWebSocketServer();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
