#!/usr/bin/env node

/**
 * Simple debug server to test bearer token functionality
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import Fastify from 'fastify';
import { z } from 'zod';

// Import the built version
import FastifyMcpStreamableHttp, { TokenBasedServerProvider, getMcpDecorator } from './dist/index.js';

async function createSimpleServer (name) {
  console.log(`Creating server: ${name}`);
  const server = new Server(
    { name, version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler('tools/call', async (request) => {
    console.log('Tool call received:', request.params);
    return {
      content: [{ type: 'text', text: `Hello from ${name}` }]
    };
  });

  server.setRequestHandler('tools/list', async () => {
    return {
      tools: [
        {
          name: 'hello',
          description: `Say hello from ${name}`,
          inputSchema: z.object({}).passthrough()
        }
      ]
    };
  });

  console.log(`Server ${name} created successfully`);
  return server;
}

async function startServer () {
  console.log('Starting debug server...');

  const app = Fastify({
    logger: true
  });

  // Create simple token provider
  const bearerTokenProvider = new TokenBasedServerProvider({
    'test-token': () => createSimpleServer('test-server')
  });

  console.log('Bearer token provider created');

  try {
    await app.register(FastifyMcpStreamableHttp, {
      endpoint: '/mcp',
      authorization: {
        bearerTokenProvider
      }
    });
    console.log('MCP plugin registered');
  } catch (error) {
    console.error('Error registering plugin:', error);
    process.exit(1);
  }

  app.get('/', async () => ({ message: 'Debug server running', test_token: 'test-token' }));

  try {
    const address = await app.listen({ host: '127.0.0.1', port: 9083 });
    console.log(`Debug server running at ${address}`);
    console.log('Test with: curl -H "Authorization: Bearer test-token" -H "Content-Type: application/json" -d \'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}\' http://127.0.0.1:9082/mcp');
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
