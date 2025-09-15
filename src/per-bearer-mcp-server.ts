import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { EventEmitter } from 'node:events';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import closeWithGrace from 'close-with-grace';

import FastifyMcpStreamableHttp, { getMcpDecorator, TokenBasedServerProvider } from './index.ts';

export type ServerFactory = () => Promise<Server> | Server;

export interface PerBearerMcpServerOptions {
  /** Port to bind to. Use 0 for dynamic port selection */
  port?: number;
  /** Host to bind to (default: 127.0.0.1) */
  host?: string;
  /** MCP endpoint path (default: /mcp) */
  endpoint?: string;
  /** Enable request logging (default: false) */
  logging?: boolean;
  /** OAuth2 configuration (optional) */
  oauth2?: {
    issuer: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    registrationEndpoint: string;
  };
}

export interface ServerInfo {
  url: string;
  port: number;
  host: string;
  endpoint: string;
}

export interface SessionInfo {
  sessionId: string;
  token: string;
  serverName: string;
  createdAt: Date;
}

export interface ToolCallInfo {
  sessionId: string;
  token: string;
  toolName: string;
  arguments: Record<string, unknown>;
  calledAt: Date;
}

export interface ServerRegistrationInfo {
  token: string;
  serverName: string;
  serverVersion: string;
  registeredAt: Date;
}

export interface ServerRemovalInfo {
  token: string;
  serverName: string;
  removedAt: Date;
  hadActiveSessions: boolean;
}

export interface ServerUpdateInfo {
  token: string;
  oldServerName: string;
  newServerName: string;
  updatedAt: Date;
}

/**
 * Events emitted by the PerBearerMcpServer
 */
export interface PerBearerMcpServerEvents {
  /** Server has started and is listening */
  started: [ServerInfo];
  /** Server has stopped */
  stopped: [];
  /** New session created */
  sessionCreated: [SessionInfo];
  /** Session destroyed */
  sessionDestroyed: [SessionInfo];
  /** Tool was called */
  toolCalled: [ToolCallInfo];
  /** Token was added (basic event) */
  tokenAdded: [string];
  /** Token was removed (basic event) */
  tokenRemoved: [string];
  /** Token was updated (basic event) */
  tokenUpdated: [string];
  /** MCP Server registered for a token (detailed event) */
  serverRegistered: [ServerRegistrationInfo];
  /** MCP Server removed for a token (detailed event) */
  serverRemoved: [ServerRemovalInfo];
  /** MCP Server updated for a token (detailed event) */
  serverUpdated: [ServerUpdateInfo];
  /** Transport error occurred */
  transportError: [string, Error];
}

/**
 * Simple, ergonomic interface for per-bearer token MCP servers
 */
export class PerBearerMcpServer extends EventEmitter<PerBearerMcpServerEvents> {
  private app?: FastifyInstance;
  private tokenProvider: TokenBasedServerProvider;
  private options: PerBearerMcpServerOptions;
  private serverInfo?: ServerInfo;
  private activeSessions = new Map<string, SessionInfo>();

  constructor(options: PerBearerMcpServerOptions = {}) {
    super();
    this.options = {
      port: 0, // Dynamic port by default
      host: '127.0.0.1',
      endpoint: '/mcp',
      logging: false,
      ...options
    };
    this.tokenProvider = new TokenBasedServerProvider();
    this.setupGracefulShutdown();
  }

  /**
   * Add a bearer token with its associated server factory
   */
  addToken(token: string, serverFactory: ServerFactory): this {
    const wrappedFactory = async () => {
      const server = await serverFactory();
      
      // Emit detailed server registration event
      // Extract server info safely
      const serverInfo = (server as any).serverInfo || {};
      this.emit('serverRegistered', {
        token,
        serverName: serverInfo.name || 'unnamed-server',
        serverVersion: serverInfo.version || '1.0.0',
        registeredAt: new Date()
      });
      
      return server;
    };
    
    this.tokenProvider.addToken(token, wrappedFactory);
    this.emit('tokenAdded', token);
    return this;
  }

  /**
   * Remove a bearer token
   */
  removeToken(token: string): this {
    // Check if there are active sessions for this token before removal
    const sessionsForToken = Array.from(this.activeSessions.values())
      .filter(session => session.token === token);
    
    const removed = this.tokenProvider.removeToken(token);
    if (removed) {
      // Emit detailed server removal event
      this.emit('serverRemoved', {
        token,
        serverName: 'unknown-server', // TODO: Track server names
        removedAt: new Date(),
        hadActiveSessions: sessionsForToken.length > 0
      });
      
      this.emit('tokenRemoved', token);
    }
    return this;
  }

  /**
   * Update an existing token's server factory
   */
  updateToken(token: string, serverFactory: ServerFactory): this {
    const wrappedFactory = async () => {
      const server = await serverFactory();
      
      // Emit detailed server update event
      const serverInfo = (server as any).serverInfo || {};
      this.emit('serverUpdated', {
        token,
        oldServerName: 'unknown-old-server', // TODO: Track previous server name
        newServerName: serverInfo.name || 'unnamed-server',
        updatedAt: new Date()
      });
      
      return server;
    };
    
    const updated = this.tokenProvider.updateToken(token, wrappedFactory);
    if (updated) {
      this.emit('tokenUpdated', token);
    }
    return this;
  }

  /**
   * Check if a token exists
   */
  hasToken(token: string): boolean {
    return this.tokenProvider.hasToken(token);
  }

  /**
   * Get all registered tokens
   */
  getTokens(): string[] {
    return this.tokenProvider.getRegisteredTokens();
  }

  /**
   * Get token management statistics
   */
  getStats() {
    return {
      ...this.tokenProvider.getStats(),
      activeSessions: this.activeSessions.size,
      sessions: Array.from(this.activeSessions.values())
    };
  }

  /**
   * Start the server
   */
  async start(): Promise<ServerInfo> {
    if (this.app) {
      throw new Error('Server is already running');
    }

    // Create Fastify app
    this.app = Fastify({
      logger: this.options.logging ? {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        }
      } : false
    });

    // Register MCP plugin
    await this.app.register(FastifyMcpStreamableHttp, {
      endpoint: this.options.endpoint,
      authorization: {
        bearerTokenProvider: this.tokenProvider,
        bearerMiddlewareOptions: {
          verifier: this.tokenProvider
        },
        ...(this.options.oauth2 && {
          oauth2: {
            authorizationServerOAuthMetadata: {
              issuer: this.options.oauth2.issuer,
              authorization_endpoint: this.options.oauth2.authorizationEndpoint,
              token_endpoint: this.options.oauth2.tokenEndpoint,
              registration_endpoint: this.options.oauth2.registrationEndpoint,
              response_types_supported: ['code']
            },
            protectedResourceOAuthMetadata: {
              resource: `${this.options.oauth2.issuer}/.well-known/oauth-protected-resource`
            }
          }
        })
      }
    });

    // Setup event listeners
    this.setupEventListeners();

    // Add server info endpoint
    this.app.get('/', async () => ({
      server: 'PerBearerMcpServer',
      status: 'running',
      ...this.getStats(),
      endpoints: {
        mcp: this.options.endpoint,
        info: '/'
      }
    }));

    // Start listening
    const address = await this.app.listen({
      host: this.options.host!,
      port: this.options.port!
    });

    // Parse the address to get actual port (important for dynamic ports)
    const url = new URL(address);
    this.serverInfo = {
      url: address,
      port: parseInt(url.port),
      host: this.options.host!,
      endpoint: this.options.endpoint!
    };

    this.emit('started', this.serverInfo);
    return this.serverInfo;
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.app) {
      throw new Error('Server is not running');
    }

    const mcpDecorator = getMcpDecorator(this.app);
    await mcpDecorator.shutdown();
    await this.app.close();
    
    this.app = undefined;
    this.serverInfo = undefined;
    this.activeSessions.clear();
    
    this.emit('stopped');
  }

  /**
   * Get server information (only available when running)
   */
  getServerInfo(): ServerInfo | null {
    return this.serverInfo || null;
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return !!this.app;
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): SessionInfo[] {
    return Array.from(this.activeSessions.values());
  }

  private setupEventListeners(): void {
    if (!this.app) return;

    const sessionManager = getMcpDecorator(this.app).getSessionManager();

    sessionManager.on('sessionCreated', (sessionId) => {
      // We need to extract token info from the session somehow
      // This would require enhancing the session manager to pass token info
      const sessionInfo: SessionInfo = {
        sessionId,
        token: 'unknown', // TODO: Extract from session
        serverName: 'unknown', // TODO: Extract from session
        createdAt: new Date()
      };
      
      this.activeSessions.set(sessionId, sessionInfo);
      this.emit('sessionCreated', sessionInfo);
    });

    sessionManager.on('sessionDestroyed', (sessionId) => {
      const sessionInfo = this.activeSessions.get(sessionId);
      if (sessionInfo) {
        this.activeSessions.delete(sessionId);
        this.emit('sessionDestroyed', sessionInfo);
      }
    });

    sessionManager.on('transportError', (sessionId, error) => {
      this.emit('transportError', sessionId, error);
    });
  }

  private setupGracefulShutdown(): void {
    closeWithGrace(async ({ signal, err }) => {
      if (err) {
        console.error('Server closing with error:', err);
      }
      
      if (this.isRunning()) {
        await this.stop();
      }
    });
  }
}

/**
 * Helper function to create server instances quickly
 */
export function createPerBearerMcpServer(options?: PerBearerMcpServerOptions): PerBearerMcpServer {
  return new PerBearerMcpServer(options);
}