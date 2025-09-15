import { strictEqual, ok } from 'node:assert';
import { describe, test } from 'node:test';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TokenBasedServerProvider } from '../src/index.ts';

describe('Per-Bearer Token Integration Tests', () => {
  describe('Core Integration Functionality', () => {
    test('should create isolated servers for different bearer tokens', async () => {
      // Create different server factories for different tokens
      const createMathServer = async () => {
        const server = new McpServer({ name: 'math-server', version: '1.0.0' });
        server.tool('add', 'Add two numbers', {
          a: { type: 'number' }, 
          b: { type: 'number' }
        }, ({ a, b }) => ({
          content: [{ type: 'text', text: `${a + b}` }]
        }));
        return server.server;
      };

      const createTimeServer = async () => {
        const server = new McpServer({ name: 'time-server', version: '1.0.0' });
        server.tool('now', 'Get current time', {}, () => ({
          content: [{ type: 'text', text: new Date().toISOString() }]
        }));
        return server.server;
      };

      // Create token provider with different tokens
      const tokenProvider = new TokenBasedServerProvider({
        'math-token': createMathServer,
        'time-token': createTimeServer
      });

      // Verify token provider setup
      ok(tokenProvider.hasToken('math-token'));
      ok(tokenProvider.hasToken('time-token'));
      ok(!tokenProvider.hasToken('invalid-token'));

      // Test token validation
      const mathAuthInfo = await tokenProvider.verifyAccessToken('math-token');
      strictEqual(mathAuthInfo.token, 'math-token');
      strictEqual(mathAuthInfo.clientId, 'client-math-token');

      const timeAuthInfo = await tokenProvider.verifyAccessToken('time-token');
      strictEqual(timeAuthInfo.token, 'time-token');
      strictEqual(timeAuthInfo.clientId, 'client-time-token');

      // Test server creation for different tokens
      const mathServer = await tokenProvider.createServerForToken('math-token', mathAuthInfo);
      const timeServer = await tokenProvider.createServerForToken('time-token', timeAuthInfo);

      // Verify servers are different instances (isolation)
      ok(mathServer !== timeServer);
      ok(mathServer);
      ok(timeServer);

      // Verify caching works (same token returns same server)
      const mathServer2 = await tokenProvider.createServerForToken('math-token', mathAuthInfo);
      strictEqual(mathServer, mathServer2);
    });

    test('should handle runtime token management operations', async () => {
      const tokenProvider = new TokenBasedServerProvider();

      // Initially empty
      strictEqual(tokenProvider.getStats().registeredTokens, 0);

      // Add tokens at runtime
      const createTestServer = async () => {
        const server = new McpServer({ name: 'test-server', version: '1.0.0' });
        return server.server;
      };

      tokenProvider.addToken('runtime-token', createTestServer);
      ok(tokenProvider.hasToken('runtime-token'));
      strictEqual(tokenProvider.getStats().registeredTokens, 1);

      // Update token 
      const createNewServer = async () => {
        const server = new McpServer({ name: 'new-server', version: '2.0.0' });
        return server.server;
      };

      const updated = tokenProvider.updateToken('runtime-token', createNewServer);
      ok(updated);
      ok(tokenProvider.hasToken('runtime-token'));

      // Remove token
      const removed = tokenProvider.removeToken('runtime-token');
      ok(removed);
      ok(!tokenProvider.hasToken('runtime-token'));
      strictEqual(tokenProvider.getStats().registeredTokens, 0);
    });

    test('should reject invalid bearer tokens', async () => {
      const tokenProvider = new TokenBasedServerProvider({
        'valid-token': async () => new McpServer({ name: 'test', version: '1.0.0' }).server
      });

      // Valid token should work
      const authInfo = await tokenProvider.verifyAccessToken('valid-token');
      ok(authInfo);
      strictEqual(authInfo.token, 'valid-token');

      // Invalid token should be rejected
      try {
        await tokenProvider.verifyAccessToken('invalid-token');
        ok(false, 'Should have thrown error for invalid token');
      } catch (error) {
        strictEqual((error as Error).message, 'Invalid token');
      }
    });
  });
});