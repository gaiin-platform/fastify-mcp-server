import { strictEqual, deepStrictEqual, ok } from 'node:assert';
import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import { EventEmitter } from 'node:events';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { PerBearerMcpServer } from '../src/per-bearer-mcp-server.ts';

describe('Server Lifecycle Events', () => {
  let server: PerBearerMcpServer;
  let eventSpy: {
    started: any[];
    stopped: any[];
    tokenAdded: any[];
    tokenRemoved: any[];
    tokenUpdated: any[];
    serverRegistered: any[];
    serverRemoved: any[];
    serverUpdated: any[];
  };

  beforeEach(() => {
    server = new PerBearerMcpServer({ 
      port: 0, // Use dynamic port for testing
      logging: false 
    });

    // Setup event spies
    eventSpy = {
      started: [],
      stopped: [],
      tokenAdded: [],
      tokenRemoved: [],
      tokenUpdated: [],
      serverRegistered: [],
      serverRemoved: [],
      serverUpdated: []
    };

    // Capture all events
    server.on('started', (info) => eventSpy.started.push(info));
    server.on('stopped', () => eventSpy.stopped.push({}));
    server.on('tokenAdded', (token) => eventSpy.tokenAdded.push(token));
    server.on('tokenRemoved', (token) => eventSpy.tokenRemoved.push(token));
    server.on('tokenUpdated', (token) => eventSpy.tokenUpdated.push(token));
    server.on('serverRegistered', (info) => eventSpy.serverRegistered.push(info));
    server.on('serverRemoved', (info) => eventSpy.serverRemoved.push(info));
    server.on('serverUpdated', (info) => eventSpy.serverUpdated.push(info));
  });

  afterEach(async () => {
    if (server.isRunning()) {
      await server.stop();
    }
    mock.restoreAll();
  });

  describe('Token Events', () => {
    test('should emit tokenAdded event when adding token', () => {
      const mockFactory = () => new McpServer({ name: 'test', version: '1.0.0' });
      
      server.addToken('test-token', mockFactory);
      
      strictEqual(eventSpy.tokenAdded.length, 1);
      strictEqual(eventSpy.tokenAdded[0], 'test-token');
    });

    test('should emit tokenRemoved event when removing token', () => {
      const mockFactory = () => new McpServer({ name: 'test', version: '1.0.0' });
      
      server.addToken('test-token', mockFactory);
      server.removeToken('test-token');
      
      strictEqual(eventSpy.tokenRemoved.length, 1);
      strictEqual(eventSpy.tokenRemoved[0], 'test-token');
    });

    test('should emit tokenUpdated event when updating token', () => {
      const mockFactory1 = () => new McpServer({ name: 'test1', version: '1.0.0' });
      const mockFactory2 = () => new McpServer({ name: 'test2', version: '2.0.0' });
      
      server.addToken('test-token', mockFactory1);
      server.updateToken('test-token', mockFactory2);
      
      strictEqual(eventSpy.tokenUpdated.length, 1);
      strictEqual(eventSpy.tokenUpdated[0], 'test-token');
    });

    test('should not emit tokenRemoved for non-existent token', () => {
      server.removeToken('nonexistent');
      
      strictEqual(eventSpy.tokenRemoved.length, 0);
    });

    test('should not emit tokenUpdated for non-existent token', () => {
      const mockFactory = () => new McpServer({ name: 'test', version: '1.0.0' });
      
      server.updateToken('nonexistent', mockFactory);
      
      strictEqual(eventSpy.tokenUpdated.length, 0);
    });
  });

  describe('Server Registration Events', () => {
    test('should emit serverRegistered event when server is created', async () => {
      const mockFactory = mock.fn(() => new McpServer({ name: 'math-server', version: '2.1.0' }));
      
      server.addToken('math-token', mockFactory);
      
      // Trigger server creation by simulating session creation
      // Note: This would normally happen through MCP requests
      // For testing, we need to access the internal token provider
      const authInfo = await (server as any).tokenProvider.verifyAccessToken('math-token');
      await (server as any).tokenProvider.createServerForToken('math-token', authInfo);
      
      strictEqual(eventSpy.serverRegistered.length, 1);
      
      const registrationEvent = eventSpy.serverRegistered[0];
      strictEqual(registrationEvent.token, 'math-token');
      strictEqual(registrationEvent.serverName, 'math-server');
      strictEqual(registrationEvent.serverVersion, '2.1.0');
      ok(registrationEvent.registeredAt instanceof Date);
    });

    test('should emit serverRemoved event with session info', () => {
      const mockFactory = () => new McpServer({ name: 'test-server', version: '1.0.0' });
      
      server.addToken('test-token', mockFactory);
      
      // Simulate having active sessions
      (server as any).activeSessions.set('session1', {
        sessionId: 'session1',
        token: 'test-token',
        serverName: 'test-server',
        createdAt: new Date()
      });
      
      server.removeToken('test-token');
      
      strictEqual(eventSpy.serverRemoved.length, 1);
      
      const removalEvent = eventSpy.serverRemoved[0];
      strictEqual(removalEvent.token, 'test-token');
      strictEqual(removalEvent.hadActiveSessions, true);
      ok(removalEvent.removedAt instanceof Date);
    });

    test('should emit serverUpdated event with old and new server info', async () => {
      const oldFactory = () => new McpServer({ name: 'old-server', version: '1.0.0' });
      const newFactory = mock.fn(() => new McpServer({ name: 'new-server', version: '2.0.0' }));
      
      server.addToken('update-token', oldFactory);
      server.updateToken('update-token', newFactory);
      
      // Trigger server creation to emit the serverUpdated event
      const authInfo = await (server as any).tokenProvider.verifyAccessToken('update-token');
      await (server as any).tokenProvider.createServerForToken('update-token', authInfo);
      
      strictEqual(eventSpy.serverUpdated.length, 1);
      
      const updateEvent = eventSpy.serverUpdated[0];
      strictEqual(updateEvent.token, 'update-token');
      strictEqual(updateEvent.newServerName, 'new-server');
      ok(updateEvent.updatedAt instanceof Date);
    });
  });

  describe('Server Lifecycle', () => {
    test('should emit started event when server starts', async () => {
      await server.start();
      
      strictEqual(eventSpy.started.length, 1);
      
      const startEvent = eventSpy.started[0];
      ok(startEvent.url.includes('127.0.0.1'));
      strictEqual(typeof startEvent.port, 'number');
      ok(startEvent.port > 0); // Dynamic port should be assigned
      strictEqual(startEvent.host, '127.0.0.1');
      strictEqual(startEvent.endpoint, '/mcp');
    });

    test('should emit stopped event when server stops', async () => {
      await server.start();
      await server.stop();
      
      strictEqual(eventSpy.stopped.length, 1);
    });

    test('should provide accurate server info after start', async () => {
      const info = await server.start();
      const serverInfo = server.getServerInfo();
      
      ok(serverInfo);
      deepStrictEqual(serverInfo, info);
      strictEqual(server.isRunning(), true);
    });

    test('should clear server info after stop', async () => {
      await server.start();
      await server.stop();
      
      strictEqual(server.getServerInfo(), null);
      strictEqual(server.isRunning(), false);
    });

    test('should throw error when starting already running server', async () => {
      await server.start();
      
      await throws(
        () => server.start(),
        { message: 'Server is already running' }
      );
    });

    test('should throw error when stopping non-running server', async () => {
      await throws(
        () => server.stop(),
        { message: 'Server is not running' }
      );
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should track token statistics accurately', () => {
      const factory1 = () => new McpServer({ name: 'server1', version: '1.0.0' });
      const factory2 = () => new McpServer({ name: 'server2', version: '1.0.0' });
      
      // Add tokens
      server.addToken('token1', factory1);
      server.addToken('token2', factory2);
      
      let stats = server.getStats();
      strictEqual(stats.registeredTokens, 2);
      strictEqual(stats.activeServers, 0);
      deepStrictEqual(stats.tokens, ['token1', 'token2']);
      
      // Remove one token
      server.removeToken('token1');
      
      stats = server.getStats();
      strictEqual(stats.registeredTokens, 1);
      deepStrictEqual(stats.tokens, ['token2']);
    });

    test('should track active sessions', () => {
      // Simulate active sessions
      (server as any).activeSessions.set('session1', {
        sessionId: 'session1',
        token: 'token1',
        serverName: 'server1',
        createdAt: new Date()
      });
      
      (server as any).activeSessions.set('session2', {
        sessionId: 'session2',
        token: 'token2',
        serverName: 'server2',
        createdAt: new Date()
      });
      
      const stats = server.getStats();
      strictEqual(stats.activeSessions, 2);
      
      const sessions = server.getActiveSessions();
      strictEqual(sessions.length, 2);
      strictEqual(sessions[0].sessionId, 'session1');
      strictEqual(sessions[1].sessionId, 'session2');
    });

    test('should provide accurate token existence checks', () => {
      const factory = () => new McpServer({ name: 'test', version: '1.0.0' });
      
      strictEqual(server.hasToken('nonexistent'), false);
      
      server.addToken('test-token', factory);
      strictEqual(server.hasToken('test-token'), true);
      
      server.removeToken('test-token');
      strictEqual(server.hasToken('test-token'), false);
    });

    test('should return empty arrays for new server', () => {
      deepStrictEqual(server.getTokens(), []);
      deepStrictEqual(server.getActiveSessions(), []);
      
      const stats = server.getStats();
      strictEqual(stats.registeredTokens, 0);
      strictEqual(stats.activeServers, 0);
      strictEqual(stats.activeSessions, 0);
    });
  });

  describe('Method Chaining', () => {
    test('should support fluent interface for token operations', () => {
      const factory1 = () => new McpServer({ name: 'server1', version: '1.0.0' });
      const factory2 = () => new McpServer({ name: 'server2', version: '1.0.0' });
      const factory3 = () => new McpServer({ name: 'server3', version: '1.0.0' });
      
      const result = server
        .addToken('token1', factory1)
        .addToken('token2', factory2)
        .addToken('token3', factory3);
      
      // Should return the same server instance for chaining
      strictEqual(result, server);
      
      // All tokens should be added
      strictEqual(server.getTokens().length, 3);
      deepStrictEqual(server.getTokens(), ['token1', 'token2', 'token3']);
    });

    test('should support chained operations', () => {
      const factory1 = () => new McpServer({ name: 'server1', version: '1.0.0' });
      const factory2 = () => new McpServer({ name: 'server2', version: '1.0.0' });
      const factory3 = () => new McpServer({ name: 'server3', version: '1.0.0' });
      
      server
        .addToken('token1', factory1)
        .addToken('token2', factory2)
        .updateToken('token1', factory3)
        .removeToken('token2');
      
      // Should have token1 (updated) but not token2 (removed)
      strictEqual(server.hasToken('token1'), true);
      strictEqual(server.hasToken('token2'), false);
      strictEqual(server.getTokens().length, 1);
      
      // Should have fired appropriate events
      strictEqual(eventSpy.tokenAdded.length, 2);
      strictEqual(eventSpy.tokenUpdated.length, 1);
      strictEqual(eventSpy.tokenRemoved.length, 1);
    });
  });

  describe('Configuration and Options', () => {
    test('should use default options when not specified', () => {
      const defaultServer = new PerBearerMcpServer();
      
      // Check that defaults are applied
      // Note: These are internal, but we can test the behavior
      strictEqual(defaultServer.isRunning(), false);
      deepStrictEqual(defaultServer.getTokens(), []);
    });

    test('should respect custom configuration', () => {
      const customServer = new PerBearerMcpServer({
        port: 8080,
        host: '0.0.0.0',
        endpoint: '/custom-mcp',
        logging: true
      });
      
      strictEqual(customServer.isRunning(), false);
      deepStrictEqual(customServer.getTokens(), []);
      // Port and host would be tested when server starts
    });

    test('should handle empty constructor', () => {
      const emptyServer = new PerBearerMcpServer();
      
      strictEqual(emptyServer.isRunning(), false);
      strictEqual(emptyServer.getServerInfo(), null);
      deepStrictEqual(emptyServer.getTokens(), []);
    });
  });

  describe('Event Timing and Order', () => {
    test('should emit events in correct order for token addition', async () => {
      const mockFactory = mock.fn(() => new McpServer({ name: 'test-server', version: '1.0.0' }));
      
      server.addToken('test-token', mockFactory);
      
      // Should emit tokenAdded immediately
      strictEqual(eventSpy.tokenAdded.length, 1);
      strictEqual(eventSpy.tokenAdded[0], 'test-token');
      
      // serverRegistered should be emitted when server is actually created
      strictEqual(eventSpy.serverRegistered.length, 0);
      
      // Simulate server creation
      const authInfo = await (server as any).tokenProvider.verifyAccessToken('test-token');
      await (server as any).tokenProvider.createServerForToken('test-token', authInfo);
      
      strictEqual(eventSpy.serverRegistered.length, 1);
      strictEqual(eventSpy.serverRegistered[0].token, 'test-token');
    });

    test('should emit events in correct order for token removal', () => {
      const mockFactory = () => new McpServer({ name: 'test-server', version: '1.0.0' });
      
      server.addToken('test-token', mockFactory);
      
      // Clear previous events
      eventSpy.tokenAdded = [];
      eventSpy.serverRegistered = [];
      
      server.removeToken('test-token');
      
      // Should emit both token and server removal events
      strictEqual(eventSpy.tokenRemoved.length, 1);
      strictEqual(eventSpy.serverRemoved.length, 1);
      
      strictEqual(eventSpy.tokenRemoved[0], 'test-token');
      strictEqual(eventSpy.serverRemoved[0].token, 'test-token');
    });

    test('should emit events in correct order for token update', async () => {
      const oldFactory = () => new McpServer({ name: 'old-server', version: '1.0.0' });
      const newFactory = mock.fn(() => new McpServer({ name: 'new-server', version: '2.0.0' }));
      
      server.addToken('test-token', oldFactory);
      
      // Clear previous events
      eventSpy.tokenAdded = [];
      eventSpy.serverRegistered = [];
      
      server.updateToken('test-token', newFactory);
      
      // Should emit tokenUpdated immediately
      strictEqual(eventSpy.tokenUpdated.length, 1);
      strictEqual(eventSpy.tokenUpdated[0], 'test-token');
      
      // serverUpdated should be emitted when new server is created
      const authInfo = await (server as any).tokenProvider.verifyAccessToken('test-token');
      await (server as any).tokenProvider.createServerForToken('test-token', authInfo);
      
      strictEqual(eventSpy.serverUpdated.length, 1);
      strictEqual(eventSpy.serverUpdated[0].token, 'test-token');
      strictEqual(eventSpy.serverUpdated[0].newServerName, 'new-server');
    });
  });

  describe('Event Data Validation', () => {
    test('should provide complete serverRegistered event data', async () => {
      const mockFactory = () => new McpServer({ name: 'analytics-server', version: '3.2.1' });
      
      server.addToken('analytics-token', mockFactory);
      
      // Trigger server creation
      const authInfo = await (server as any).tokenProvider.verifyAccessToken('analytics-token');
      await (server as any).tokenProvider.createServerForToken('analytics-token', authInfo);
      
      strictEqual(eventSpy.serverRegistered.length, 1);
      
      const event = eventSpy.serverRegistered[0];
      strictEqual(event.token, 'analytics-token');
      strictEqual(event.serverName, 'analytics-server');
      strictEqual(event.serverVersion, '3.2.1');
      ok(event.registeredAt instanceof Date);
      ok(Date.now() - event.registeredAt.getTime() < 1000); // Recent timestamp
    });

    test('should provide complete serverRemoved event data', () => {
      const mockFactory = () => new McpServer({ name: 'removed-server', version: '1.0.0' });
      
      server.addToken('remove-token', mockFactory);
      
      // Simulate having no active sessions
      server.removeToken('remove-token');
      
      strictEqual(eventSpy.serverRemoved.length, 1);
      
      const event = eventSpy.serverRemoved[0];
      strictEqual(event.token, 'remove-token');
      strictEqual(event.hadActiveSessions, false);
      ok(event.removedAt instanceof Date);
      ok(Date.now() - event.removedAt.getTime() < 1000); // Recent timestamp
    });

    test('should provide complete serverUpdated event data', async () => {
      const oldFactory = () => new McpServer({ name: 'weather-server', version: '1.0.0' });
      const newFactory = () => new McpServer({ name: 'weather-pro-server', version: '2.0.0' });
      
      server.addToken('weather-token', oldFactory);
      server.updateToken('weather-token', newFactory);
      
      // Trigger server creation to get the update event
      const authInfo = await (server as any).tokenProvider.verifyAccessToken('weather-token');
      await (server as any).tokenProvider.createServerForToken('weather-token', authInfo);
      
      strictEqual(eventSpy.serverUpdated.length, 1);
      
      const event = eventSpy.serverUpdated[0];
      strictEqual(event.token, 'weather-token');
      strictEqual(event.newServerName, 'weather-pro-server');
      ok(event.updatedAt instanceof Date);
      ok(Date.now() - event.updatedAt.getTime() < 1000); // Recent timestamp
    });
  });

  describe('Edge Cases', () => {
    test('should handle server factory that returns server without name', async () => {
      const mockFactory = () => new McpServer({ name: '', version: '1.0.0' });
      
      server.addToken('unnamed-token', mockFactory);
      
      const authInfo = await (server as any).tokenProvider.verifyAccessToken('unnamed-token');
      await (server as any).tokenProvider.createServerForToken('unnamed-token', authInfo);
      
      strictEqual(eventSpy.serverRegistered.length, 1);
      strictEqual(eventSpy.serverRegistered[0].serverName, 'unnamed-server'); // Default fallback
    });

    test('should handle server factory that returns server without version', async () => {
      const mockFactory = () => new McpServer({ name: 'test-server', version: '' });
      
      server.addToken('versionless-token', mockFactory);
      
      const authInfo = await (server as any).tokenProvider.verifyAccessToken('versionless-token');
      await (server as any).tokenProvider.createServerForToken('versionless-token', authInfo);
      
      strictEqual(eventSpy.serverRegistered.length, 1);
      strictEqual(eventSpy.serverRegistered[0].serverVersion, '1.0.0'); // Default fallback
    });
  });
});