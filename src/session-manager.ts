import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import type { BearerTokenProvider } from './bearer-provider.ts';

type SessionsEvents = {
  sessionCreated: [string];
  sessionDestroyed: [string];
  transportError: [string, Error];
};

type SessionInfo = {
  transport: StreamableHTTPServerTransport;
  server: Server;
};

/**
 * Manages MCP sessions with proper lifecycle handling
 */
export class SessionManager extends EventEmitter<SessionsEvents> {
  private sessions = new Map<string, SessionInfo>();
  private defaultServer?: Server;
  private bearerTokenProvider?: BearerTokenProvider;

  constructor (defaultServer?: Server, bearerTokenProvider?: BearerTokenProvider) {
    super({ captureRejections: true });
    this.defaultServer = defaultServer;
    this.bearerTokenProvider = bearerTokenProvider;

    if (!defaultServer && !bearerTokenProvider) {
      throw new Error('Either defaultServer or bearerTokenProvider must be provided');
    }
  }

  /**
   * Creates a new transport and session
   * @param token - Optional bearer token for per-token server creation
   */
  public async createSession (token?: string): Promise<StreamableHTTPServerTransport> {
    // Determine which server to use
    let server: Server;
    if (token && this.bearerTokenProvider) {
      // Create a server instance for this specific token
      const authInfo = await this.bearerTokenProvider.verifyAccessToken(token);
      server = await this.bearerTokenProvider.createServerForToken(token, authInfo);
    } else if (this.defaultServer) {
      server = this.defaultServer;
    } else {
      throw new Error('No server available for session creation');
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        this.sessions.set(sessionId, { transport, server });
        this.emit('sessionCreated', sessionId);
      }
    });

    // Handle transport closure | TODO: sdk seems to not handle this case
    /* c8 ignore next 4 */
    transport.onclose = () => {
      if (transport.sessionId) {
        this.destroySession(transport.sessionId);
      }
    };

    // Handle transport errors
    /* c8 ignore next 4 */
    transport.onerror = (error) => {
      if (transport.sessionId) {
        this.emit('transportError', transport.sessionId, error);
      }
    };

    await server.connect(transport);

    return transport;
  }

  /**
   * Retrieves an existing session by ID
   */
  public getSession (sessionId: string): StreamableHTTPServerTransport | undefined {
    const sessionInfo = this.sessions.get(sessionId);
    return sessionInfo?.transport;
  }

  /**
   * Retrieves the server instance for a session
   */
  public getServerForSession (sessionId: string): Server | undefined {
    const sessionInfo = this.sessions.get(sessionId);
    return sessionInfo?.server;
  }

  /**
   * Destroys a session and cleans up resources
   */
  public async destroySession (sessionId: string): Promise<boolean> {
    const sessionInfo = this.sessions.get(sessionId);
    if (!sessionInfo) {
      return false;
    }

    // Close the server connection if it's not the default server
    if (sessionInfo.server !== this.defaultServer) {
      try {
        await sessionInfo.server.close();
      } catch (error) {
        // Log error but don't prevent session cleanup
        console.warn(`Error closing server for session ${sessionId}:`, error);
      }
    }

    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      this.emit('sessionDestroyed', sessionId);
    }
    return deleted;
  }

  /**
   * Gets the current number of active sessions
   */
  public getSessionCount (): number {
    return this.sessions.size;
  }

  /**
   * Destroys all sessions
   */
  public async destroyAllSessions (): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(sessionIds.map((id) => this.destroySession(id)));
  }
}
