import { strictEqual, deepStrictEqual, ok, throws } from 'node:assert';
import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

import { TokenBasedServerProvider } from '../src/bearer-provider.ts';
import { SessionManager } from '../src/session-manager.ts';

describe('Per-Bearer Token Functionality', () => {
  let tokenProvider: TokenBasedServerProvider;
  let mockServerFactory1: () => Promise<McpServer>;
  let mockServerFactory2: () => Promise<McpServer>;
  let mockServer1: McpServer;
  let mockServer2: McpServer;

  beforeEach(() => {
    // Create mock servers
    mockServer1 = new McpServer({ name: 'test-server-1', version: '1.0.0' });
    mockServer2 = new McpServer({ name: 'test-server-2', version: '2.0.0' });

    // Create mock factories
    mockServerFactory1 = mock.fn(async () => mockServer1);
    mockServerFactory2 = mock.fn(async () => mockServer2);

    // Create token provider with initial tokens
    tokenProvider = new TokenBasedServerProvider({
      'token1': mockServerFactory1,
      'token2': mockServerFactory2
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('TokenBasedServerProvider', () => {
    test('should verify valid tokens', async () => {
      const authInfo = await tokenProvider.verifyAccessToken('token1');
      
      deepStrictEqual(authInfo, {
        token: 'token1',
        clientId: 'client-token1',
        scopes: []
      });
    });

    test('should reject invalid tokens', async () => {
      await throws(
        () => tokenProvider.verifyAccessToken('invalid-token'),
        { message: 'Invalid token' }
      );
    });

    test('should create server for valid token', async () => {
      const authInfo: AuthInfo = {
        token: 'token1',
        clientId: 'client-token1',
        scopes: []
      };

      const server = await tokenProvider.createServerForToken('token1', authInfo);
      
      strictEqual(server, mockServer1);
      strictEqual(mockServerFactory1.mock.callCount(), 1);
    });

    test('should throw error for token without factory', async () => {
      const authInfo: AuthInfo = {
        token: 'nonexistent',
        clientId: 'client-nonexistent',
        scopes: []
      };

      await throws(
        () => tokenProvider.createServerForToken('nonexistent', authInfo),
        { message: 'No server factory found for token' }
      );
    });

    test('should cache created servers', async () => {
      const authInfo: AuthInfo = {
        token: 'token1',
        clientId: 'client-token1',
        scopes: []
      };

      // First call should create server
      const server1 = await tokenProvider.createServerForToken('token1', authInfo);
      strictEqual(server1, mockServer1);
      strictEqual(mockServerFactory1.mock.callCount(), 1);

      // Second call should return cached server
      const server2 = await tokenProvider.createServerForToken('token1', authInfo);
      strictEqual(server2, mockServer1);
      strictEqual(mockServerFactory1.mock.callCount(), 1); // Not called again
    });
  });

  describe('Runtime Token Management', () => {
    test('should add new token at runtime', () => {
      const newFactory = mock.fn(async () => mockServer1);
      
      tokenProvider.addToken('new-token', newFactory);
      
      ok(tokenProvider.hasToken('new-token'));
      strictEqual(tokenProvider.getTokenCount(), 3); // original 2 + 1 new
      deepStrictEqual(tokenProvider.getRegisteredTokens(), ['token1', 'token2', 'new-token']);
    });

    test('should remove existing token', () => {
      const removed = tokenProvider.removeToken('token1');
      
      strictEqual(removed, true);
      strictEqual(tokenProvider.hasToken('token1'), false);
      strictEqual(tokenProvider.getTokenCount(), 1);
      deepStrictEqual(tokenProvider.getRegisteredTokens(), ['token2']);
    });

    test('should return false when removing non-existent token', () => {
      const removed = tokenProvider.removeToken('nonexistent');
      
      strictEqual(removed, false);
      strictEqual(tokenProvider.getTokenCount(), 2); // unchanged
    });

    test('should update existing token factory', () => {
      const newFactory = mock.fn(async () => mockServer2);
      
      const updated = tokenProvider.updateToken('token1', newFactory);
      
      strictEqual(updated, true);
      strictEqual(tokenProvider.getTokenCount(), 2); // count unchanged
      deepStrictEqual(tokenProvider.getRegisteredTokens(), ['token1', 'token2']);
    });

    test('should return false when updating non-existent token', () => {
      const newFactory = mock.fn(async () => mockServer1);
      
      const updated = tokenProvider.updateToken('nonexistent', newFactory);
      
      strictEqual(updated, false);
    });

    test('should clear all tokens', () => {
      tokenProvider.clearAllTokens();
      
      strictEqual(tokenProvider.getTokenCount(), 0);
      deepStrictEqual(tokenProvider.getRegisteredTokens(), []);
      strictEqual(tokenProvider.hasToken('token1'), false);
      strictEqual(tokenProvider.hasToken('token2'), false);
    });

    test('should provide accurate statistics', () => {
      tokenProvider.addToken('new-token', mockServerFactory1);
      
      const stats = tokenProvider.getStats();
      
      strictEqual(stats.registeredTokens, 3);
      strictEqual(stats.activeServers, 0); // No servers created yet
      deepStrictEqual(stats.tokens, ['token1', 'token2', 'new-token']);
    });

    test('should update active server count after creation', async () => {
      const authInfo: AuthInfo = {
        token: 'token1',
        clientId: 'client-token1',
        scopes: []
      };

      // Create a server
      await tokenProvider.createServerForToken('token1', authInfo);
      
      const stats = tokenProvider.getStats();
      strictEqual(stats.activeServers, 1);
    });
  });

  describe('SessionManager with Per-Bearer Tokens', () => {
    let sessionManager: SessionManager;

    beforeEach(() => {
      sessionManager = new SessionManager(undefined, tokenProvider);
    });

    test('should create session with bearer token', async () => {
      const transport = await sessionManager.createSession('token1');
      
      ok(transport);
      strictEqual(mockServerFactory1.mock.callCount(), 1);
    });

    test('should fail to create session with invalid token', async () => {
      await throws(
        () => sessionManager.createSession('invalid-token'),
        { message: 'Invalid token' }
      );
    });

    test('should create session without token when default server provided', async () => {
      const defaultServer = new McpServer({ name: 'default', version: '1.0.0' });
      const sessionManagerWithDefault = new SessionManager(defaultServer.server, tokenProvider);
      
      const transport = await sessionManagerWithDefault.createSession();
      
      ok(transport);
      // Should use default server, not call token factories
      strictEqual(mockServerFactory1.mock.callCount(), 0);
      strictEqual(mockServerFactory2.mock.callCount(), 0);
    });

    test('should fail when no default server and no token provided', async () => {
      await throws(
        () => sessionManager.createSession(),
        { message: 'No server available for session creation' }
      );
    });

    test('should throw error when neither default server nor bearer provider given', () => {
      throws(
        () => new SessionManager(),
        { message: 'Either defaultServer or bearerTokenProvider must be provided' }
      );
    });
  });

  describe('Token Provider Integration', () => {
    test('should handle concurrent token operations', async () => {
      const factory1 = mock.fn(async () => mockServer1);
      const factory2 = mock.fn(async () => mockServer2);

      // Concurrent operations
      tokenProvider.addToken('concurrent1', factory1);
      tokenProvider.addToken('concurrent2', factory2);
      tokenProvider.removeToken('token1');
      tokenProvider.updateToken('token2', factory1);

      // Verify final state
      strictEqual(tokenProvider.getTokenCount(), 3);
      ok(tokenProvider.hasToken('concurrent1'));
      ok(tokenProvider.hasToken('concurrent2'));
      ok(tokenProvider.hasToken('token2'));
      strictEqual(tokenProvider.hasToken('token1'), false);
    });

    test('should handle server creation with different tokens simultaneously', async () => {
      const authInfo1: AuthInfo = { token: 'token1', clientId: 'client1', scopes: [] };
      const authInfo2: AuthInfo = { token: 'token2', clientId: 'client2', scopes: [] };

      // Create servers concurrently
      const [server1, server2] = await Promise.all([
        tokenProvider.createServerForToken('token1', authInfo1),
        tokenProvider.createServerForToken('token2', authInfo2)
      ]);

      strictEqual(server1, mockServer1);
      strictEqual(server2, mockServer2);
      strictEqual(mockServerFactory1.mock.callCount(), 1);
      strictEqual(mockServerFactory2.mock.callCount(), 1);
    });

    test('should maintain server isolation between tokens', async () => {
      const authInfo1: AuthInfo = { token: 'token1', clientId: 'client1', scopes: [] };
      const authInfo2: AuthInfo = { token: 'token2', clientId: 'client2', scopes: [] };

      const server1 = await tokenProvider.createServerForToken('token1', authInfo1);
      const server2 = await tokenProvider.createServerForToken('token2', authInfo2);

      // Servers should be different instances
      ok(server1 !== server2);
      strictEqual(server1.name, 'test-server-1');
      strictEqual(server2.name, 'test-server-2');
    });
  });

  describe('Error Handling', () => {
    test('should handle factory that throws error', async () => {
      const errorFactory = mock.fn(async () => {
        throw new Error('Factory error');
      });

      tokenProvider.addToken('error-token', errorFactory);

      const authInfo: AuthInfo = {
        token: 'error-token',
        clientId: 'client-error',
        scopes: []
      };

      await throws(
        () => tokenProvider.createServerForToken('error-token', authInfo),
        { message: 'Factory error' }
      );
    });

    test('should handle factory that returns null', async () => {
      const nullFactory = mock.fn(async () => null as any);

      tokenProvider.addToken('null-token', nullFactory);

      const authInfo: AuthInfo = {
        token: 'null-token',
        clientId: 'client-null',
        scopes: []
      };

      // Should complete without error (null is technically valid)
      const result = await tokenProvider.createServerForToken('null-token', authInfo);
      strictEqual(result, null);
    });
  });

  describe('Memory Management', () => {
    test('should clean up cached servers when token removed', async () => {
      const authInfo: AuthInfo = { token: 'token1', clientId: 'client1', scopes: [] };
      
      // Create server (gets cached)
      await tokenProvider.createServerForToken('token1', authInfo);
      strictEqual(tokenProvider.getStats().activeServers, 1);

      // Remove token should cleanup cached server
      tokenProvider.removeToken('token1');
      strictEqual(tokenProvider.getStats().activeServers, 0);
    });

    test('should clean up cached servers when token updated', async () => {
      const authInfo: AuthInfo = { token: 'token1', clientId: 'client1', scopes: [] };
      
      // Create server (gets cached)
      await tokenProvider.createServerForToken('token1', authInfo);
      strictEqual(tokenProvider.getStats().activeServers, 1);

      // Update token should cleanup old cached server
      tokenProvider.updateToken('token1', mockServerFactory2);
      strictEqual(tokenProvider.getStats().activeServers, 0);
    });

    test('should clean up all servers when cleared', async () => {
      const authInfo1: AuthInfo = { token: 'token1', clientId: 'client1', scopes: [] };
      const authInfo2: AuthInfo = { token: 'token2', clientId: 'client2', scopes: [] };
      
      // Create multiple servers
      await tokenProvider.createServerForToken('token1', authInfo1);
      await tokenProvider.createServerForToken('token2', authInfo2);
      strictEqual(tokenProvider.getStats().activeServers, 2);

      // Clear all should cleanup everything
      tokenProvider.clearAllTokens();
      strictEqual(tokenProvider.getStats().activeServers, 0);
      strictEqual(tokenProvider.getStats().registeredTokens, 0);
    });
  });
});