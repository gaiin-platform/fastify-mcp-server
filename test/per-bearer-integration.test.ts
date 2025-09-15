import { strictEqual, deepStrictEqual, ok } from 'node:assert';
import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import Fastify from 'fastify';

import FastifyMcpStreamableHttp, { TokenBasedServerProvider, getMcpDecorator } from '../src/index.ts';

describe('Per-Bearer Token Integration Tests', () => {
  let app: any;
  let tokenProvider: TokenBasedServerProvider;

  beforeEach(async () => {
    // Create test servers
    const createMathServer = async () => {
      const server = new McpServer({ name: 'math-server', version: '1.0.0' });
      server.tool('add', 'Add two numbers', {
        a: { type: 'number' }, 
        b: { type: 'number' }
      }, ({ a, b }) => ({
        content: [{ type: 'text', text: `${a + b}` }]
      }));
      return server;
    };

    const createTimeServer = async () => {
      const server = new McpServer({ name: 'time-server', version: '1.0.0' });
      server.tool('now', 'Get current time', {}, () => ({
        content: [{ type: 'text', text: new Date().toISOString() }]
      }));
      return server;
    };

    // Create token provider
    tokenProvider = new TokenBasedServerProvider({
      'math-token': createMathServer,
      'time-token': createTimeServer
    });

    // Create Fastify app
    app = Fastify({ logger: false });

    // Register the per-bearer MCP plugin
    await app.register(FastifyMcpStreamableHttp, {
      endpoint: '/mcp',
      authorization: {
        bearerTokenProvider: tokenProvider,
        bearerMiddlewareOptions: {
          verifier: tokenProvider
        }
      }
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    mock.restoreAll();
  });

  describe('End-to-End Per-Bearer Token Flow', () => {
    test('should create different sessions for different tokens', async () => {
      // Initialize session with math-token
      const mathResponse = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer math-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        }
      });

      // Initialize session with time-token
      const timeResponse = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer time-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        }
      });

      strictEqual(mathResponse.statusCode, 200);
      strictEqual(timeResponse.statusCode, 200);

      const mathSessionId = mathResponse.headers['mcp-session-id'];
      const timeSessionId = timeResponse.headers['mcp-session-id'];

      // Sessions should be different
      ok(mathSessionId !== timeSessionId);

      // Verify different servers were created
      ok(mathResponse.payload.includes('math-server'));
      ok(timeResponse.payload.includes('time-server'));

      // Verify session count
      const mcp = getMcpDecorator(app);
      strictEqual(mcp.getStats().activeSessions, 2);
    });

    test('should provide different tools for different tokens', async () => {
      // Initialize math session
      const mathInitResponse = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer math-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        }
      });

      const mathSessionId = mathInitResponse.headers['mcp-session-id'];

      // List tools for math server
      const mathToolsResponse = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer math-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream',
          'mcp-session-id': mathSessionId
        },
        body: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        }
      });

      // Initialize time session
      const timeInitResponse = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer time-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        }
      });

      const timeSessionId = timeInitResponse.headers['mcp-session-id'];

      // List tools for time server
      const timeToolsResponse = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer time-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream',
          'mcp-session-id': timeSessionId
        },
        body: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        }
      });

      strictEqual(mathToolsResponse.statusCode, 200);
      strictEqual(timeToolsResponse.statusCode, 200);

      // Math server should have 'add' tool
      ok(mathToolsResponse.payload.includes('add'));
      ok(!mathToolsResponse.payload.includes('now'));

      // Time server should have 'now' tool
      ok(timeToolsResponse.payload.includes('now'));
      ok(!timeToolsResponse.payload.includes('add'));
    });

    test('should reject requests with invalid bearer tokens', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer invalid-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        }
      });

      strictEqual(response.statusCode, 500); // Should be rejected due to invalid token
    });

    test('should handle session cleanup for per-bearer tokens', async () => {
      // Create session
      const initResponse = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer math-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        }
      });

      const sessionId = initResponse.headers['mcp-session-id'];
      const mcp = getMcpDecorator(app);
      
      strictEqual(mcp.getStats().activeSessions, 1);

      // Delete session
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer math-token',
          'mcp-session-id': sessionId
        }
      });

      strictEqual(deleteResponse.statusCode, 200);
      strictEqual(mcp.getStats().activeSessions, 0);
    });
  });

  describe('Runtime Token Management Integration', () => {
    test('should add token at runtime and immediately use it', async () => {
      const createNewServer = async () => {
        const server = new McpServer({ name: 'runtime-server', version: '1.0.0' });
        server.tool('hello', 'Say hello', {}, () => ({
          content: [{ type: 'text', text: 'Hello from runtime server!' }]
        }));
        return server;
      };

      // Add token at runtime
      tokenProvider.addToken('runtime-token', createNewServer);

      // Immediately use the new token
      const response = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer runtime-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        }
      });

      strictEqual(response.statusCode, 200);
      ok(response.payload.includes('runtime-server'));
    });

    test('should invalidate sessions when token is removed', async () => {
      // Create session with existing token
      const initResponse = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer math-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        }
      });

      const sessionId = initResponse.headers['mcp-session-id'];
      strictEqual(initResponse.statusCode, 200);

      // Remove the token
      tokenProvider.removeToken('math-token');

      // Try to use existing session - should fail since server is cleaned up
      const pingResponse = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer math-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream',
          'mcp-session-id': sessionId
        },
        body: {
          jsonrpc: '2.0',
          id: 2,
          method: 'ping',
          params: {}
        }
      });

      // Should fail because token is no longer valid
      strictEqual(pingResponse.statusCode, 500);
    });

    test('should allow token updates to take effect immediately', async () => {
      const createUpdatedServer = async () => {
        const server = new McpServer({ name: 'updated-math-server', version: '2.0.0' });
        server.tool('subtract', 'Subtract numbers', {
          a: { type: 'number' }, 
          b: { type: 'number' }
        }, ({ a, b }) => ({
          content: [{ type: 'text', text: `${a - b}` }]
        }));
        return server;
      };

      // Update existing token
      tokenProvider.updateToken('math-token', createUpdatedServer);

      // Create new session should use updated server
      const response = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer math-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        }
      });

      strictEqual(response.statusCode, 200);
      ok(response.payload.includes('updated-math-server'));
    });
  });

  describe('Concurrent Access', () => {
    test('should handle multiple concurrent sessions with same token', async () => {
      const requests = Array.from({ length: 3 }, (_, i) => 
        app.inject({
          method: 'POST',
          url: '/mcp',
          headers: {
            'authorization': 'Bearer math-token',
            'content-type': 'application/json',
            'accept': 'application/json, text/event-stream'
          },
          body: {
            jsonrpc: '2.0',
            id: i + 1,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: `client-${i}`, version: '1.0.0' }
            }
          }
        })
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        strictEqual(response.statusCode, 200);
        ok(response.headers['mcp-session-id']);
      });

      // Should have 3 different session IDs
      const sessionIds = responses.map(r => r.headers['mcp-session-id']);
      const uniqueSessionIds = new Set(sessionIds);
      strictEqual(uniqueSessionIds.size, 3);

      // All should use the same math-server
      responses.forEach(response => {
        ok(response.payload.includes('math-server'));
      });
    });

    test('should handle concurrent sessions with different tokens', async () => {
      const mathRequest = app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer math-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'math-client', version: '1.0.0' }
          }
        }
      });

      const timeRequest = app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer time-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'time-client', version: '1.0.0' }
          }
        }
      });

      const [mathResponse, timeResponse] = await Promise.all([mathRequest, timeRequest]);

      strictEqual(mathResponse.statusCode, 200);
      strictEqual(timeResponse.statusCode, 200);

      // Should use different servers
      ok(mathResponse.payload.includes('math-server'));
      ok(timeResponse.payload.includes('time-server'));
      ok(!mathResponse.payload.includes('time-server'));
      ok(!timeResponse.payload.includes('math-server'));
    });
  });

  describe('Error Scenarios', () => {
    test('should handle bearer token extraction failure', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Invalid-Format token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        }
      });

      strictEqual(response.statusCode, 401);
      deepStrictEqual(response.json(), {
        error: 'invalid_token',
        error_description: "Invalid Authorization header format, expected 'Bearer TOKEN'"
      });
    });

    test('should handle missing authorization header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        }
      });

      strictEqual(response.statusCode, 401);
      deepStrictEqual(response.json(), {
        error: 'invalid_token',
        error_description: 'Missing Authorization header'
      });
    });

    test('should handle server factory that throws error', async () => {
      const errorFactory = mock.fn(async () => {
        throw new Error('Server creation failed');
      });

      tokenProvider.addToken('error-token', errorFactory);

      const response = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer error-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        }
      });

      // Should fail due to server creation error
      strictEqual(response.statusCode, 400);
    });
  });

  describe('Session Isolation', () => {
    test('should maintain session isolation between different tokens', async () => {
      // Create sessions for both tokens
      const mathSession = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer math-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'math-client', version: '1.0.0' }
          }
        }
      });

      const timeSession = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer time-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'time-client', version: '1.0.0' }
          }
        }
      });

      const mathSessionId = mathSession.headers['mcp-session-id'];
      const timeSessionId = timeSession.headers['mcp-session-id'];

      // Try to use math session ID with time token (should fail)
      const crossTokenResponse = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer time-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream',
          'mcp-session-id': mathSessionId // Wrong session for this token
        },
        body: {
          jsonrpc: '2.0',
          id: 2,
          method: 'ping',
          params: {}
        }
      });

      // This should fail because session belongs to different token
      strictEqual(crossTokenResponse.statusCode, 400);
    });

    test('should clean up all sessions on shutdown', async () => {
      // Create multiple sessions
      await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer math-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'client1', version: '1.0.0' }
          }
        }
      });

      await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer time-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'client2', version: '1.0.0' }
          }
        }
      });

      const mcp = getMcpDecorator(app);
      strictEqual(mcp.getStats().activeSessions, 2);

      // Shutdown should clean up all sessions
      await mcp.shutdown();
      strictEqual(mcp.getStats().activeSessions, 0);
    });
  });

  describe('Performance and Caching', () => {
    test('should cache servers for same token across multiple sessions', async () => {
      const mockFactory = mock.fn(async () => {
        return new McpServer({ name: 'cached-server', version: '1.0.0' });
      });

      tokenProvider.addToken('cache-token', mockFactory);

      // Create multiple sessions with same token
      const session1 = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer cache-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'client1', version: '1.0.0' }
          }
        }
      });

      const session2 = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'authorization': 'Bearer cache-token',
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'client2', version: '1.0.0' }
          }
        }
      });

      strictEqual(session1.statusCode, 200);
      strictEqual(session2.statusCode, 200);

      // Factory should only be called once due to caching
      strictEqual(mockFactory.mock.callCount(), 1);
    });
  });
});