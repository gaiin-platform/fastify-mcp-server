import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Interface for a bearer token provider that validates tokens and provides server configuration
 */
export interface BearerTokenProvider {
  /**
   * Validates the bearer token and returns authentication information
   */
  verifyAccessToken(token: string): Promise<AuthInfo>;

  /**
   * Creates and configures an MCP server instance for the given bearer token
   */
  createServerForToken(token: string, authInfo: AuthInfo): Promise<Server>;
}

/**
 * Implementation that maps tokens to server factories with runtime management
 */
export class TokenBasedServerProvider implements BearerTokenProvider {
  private tokenToServerFactory: Map<string, () => Promise<Server>>;
  private activeServers: Map<string, Server> = new Map(); // Cache for created servers

  constructor (tokenMappings: Record<string, () => Promise<Server>> = {}) {
    this.tokenToServerFactory = new Map(Object.entries(tokenMappings));
  }

  /**
   * Add a new token binding at runtime
   */
  addToken (token: string, serverFactory: () => Promise<Server>): void {
    this.tokenToServerFactory.set(token, serverFactory);
    // Remove any cached server for this token to force recreation
    this.removeActiveServer(token);
  }

  /**
   * Remove a token binding at runtime
   */
  removeToken (token: string): boolean {
    const existed = this.tokenToServerFactory.delete(token);
    if (existed) {
      this.removeActiveServer(token);
    }
    return existed;
  }

  /**
   * Update an existing token's server factory
   */
  updateToken (token: string, serverFactory: () => Promise<Server>): boolean {
    if (!this.tokenToServerFactory.has(token)) {
      return false;
    }
    this.tokenToServerFactory.set(token, serverFactory);
    this.removeActiveServer(token);
    return true;
  }

  /**
   * Get all currently registered tokens
   */
  getRegisteredTokens (): string[] {
    return Array.from(this.tokenToServerFactory.keys());
  }

  /**
   * Check if a token is registered
   */
  hasToken (token: string): boolean {
    return this.tokenToServerFactory.has(token);
  }

  /**
   * Get count of registered tokens
   */
  getTokenCount (): number {
    return this.tokenToServerFactory.size;
  }

  /**
   * Remove all token bindings
   */
  clearAllTokens (): void {
    this.tokenToServerFactory.clear();
    this.cleanupAllActiveServers();
  }

  /**
   * Safely cleanup an active server for a token
   */
  private async removeActiveServer (token: string): Promise<void> {
    const server = this.activeServers.get(token);
    if (server) {
      try {
        await server.close();
      } catch (error) {
        console.warn(`Error closing server for token ${token}:`, error);
      }
      this.activeServers.delete(token);
    }
  }

  /**
   * Cleanup all active servers
   */
  private async cleanupAllActiveServers (): Promise<void> {
    const cleanupPromises = Array.from(this.activeServers.keys()).map((token) => this.removeActiveServer(token));
    await Promise.all(cleanupPromises);
  }

  async verifyAccessToken (token: string): Promise<AuthInfo> {
    if (!this.tokenToServerFactory.has(token)) {
      throw new Error('Invalid token');
    }

    return {
      token,
      clientId: `client-${token}`,
      scopes: []
    };
  }

  async createServerForToken (token: string, _authInfo: AuthInfo): Promise<Server> {
    // Check if we already have an active server for this token
    const existingServer = this.activeServers.get(token);
    if (existingServer) {
      return existingServer;
    }

    const factory = this.tokenToServerFactory.get(token);
    if (!factory) {
      throw new Error('No server factory found for token');
    }

    const server = await factory();
    this.activeServers.set(token, server);
    return server;
  }

  /**
   * Get management statistics
   */
  getStats (): {
    registeredTokens: number;
    activeServers: number;
    tokens: string[];
  } {
    return {
      registeredTokens: this.tokenToServerFactory.size,
      activeServers: this.activeServers.size,
      tokens: Array.from(this.tokenToServerFactory.keys())
    };
  }
}
