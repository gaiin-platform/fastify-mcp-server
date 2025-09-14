import Fastify from 'fastify';
import closeWithGrace from 'close-with-grace';

import FastifyMcpStreamableHttp, { getMcpDecorator, TokenBasedServerProvider } from '../../src/index.js';
import { createBasicMathServer } from './tools/basic-tools.js';
import { createAdminServer } from './tools/admin-tools.js';
import { createDataAnalysisServer } from './tools/data-tools.js';

// Define three different bearer tokens with different capabilities
const TOKENS = {
  'basic-user-token': 'Basic User (Math tools only)',
  'admin-token': 'Admin User (System tools)',
  'analyst-token': 'Data Analyst (Statistics tools)'
};

async function startPerBearerServer() {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    }
  });

  // Create the token-based server provider
  const bearerTokenProvider = new TokenBasedServerProvider({
    'basic-user-token': createBasicMathServer,
    'admin-token': createAdminServer,
    'analyst-token': createDataAnalysisServer
  });

  // Register the MCP plugin with per-bearer configuration
  await app.register(FastifyMcpStreamableHttp, {
    endpoint: '/mcp',
    authorization: {
      bearerTokenProvider,
      oauth2: {
        authorizationServerOAuthMetadata: {
          issuer: 'https://demo.per-bearer-mcp.org',
          authorization_endpoint: 'https://demo.per-bearer-mcp.org/authorize',
          token_endpoint: 'https://demo.per-bearer-mcp.org/token',
          registration_endpoint: 'https://demo.per-bearer-mcp.org/register',
          response_types_supported: ['code']
        },
        protectedResourceOAuthMetadata: {
          resource: 'https://demo.per-bearer-mcp.org/.well-known/oauth-protected-resource'
        }
      }
    }
  });

  // Add a simple endpoint to show available tokens
  app.get('/', async (request, reply) => {
    return {
      message: 'Per-Bearer Token MCP Server Demo',
      tokens: TOKENS,
      endpoints: {
        mcp: '/mcp',
        tokens_info: '/',
        oauth_authorization_server: '/.well-known/oauth-authorization-server',
        oauth_protected_resource: '/.well-known/oauth-protected-resource'
      },
      usage: {
        note: 'Use one of the bearer tokens in the Authorization header',
        example: 'Authorization: Bearer basic-user-token'
      }
    };
  });

  // Setup session event handlers
  const sessionManager = getMcpDecorator(app).getSessionManager();

  sessionManager.on('sessionCreated', (sessionId) => {
    app.log.info({ sessionId }, 'MCP session created');
  });

  sessionManager.on('sessionDestroyed', (sessionId) => {
    app.log.info({ sessionId }, 'MCP session destroyed');
  });

  sessionManager.on('transportError', (sessionId, error) => {
    app.log.error({ sessionId, error }, 'MCP transport error');
  });

  // Graceful shutdown
  closeWithGrace(async ({ signal, err }) => {
    if (err) {
      app.log.error({ err }, 'Server closing with error');
    } else {
      app.log.info(`${signal} received, server closing`);
    }

    await getMcpDecorator(app).shutdown();
    await app.close();
  });

  await app.ready();

  // Start the server
  try {
    const address = await app.listen({
      host: '127.0.0.1',
      port: 9081
    });

    app.log.info(`\n🚀 Per-Bearer Token MCP Server started at ${address}\n`);
    app.log.info('Available bearer tokens:');
    Object.entries(TOKENS).forEach(([token, description]) => {
      app.log.info(`  • ${token} - ${description}`);
    });
    app.log.info('\nTest with: curl -H "Authorization: Bearer basic-user-token" http://127.0.0.1:9081/mcp\n');

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startPerBearerServer().catch(console.error);