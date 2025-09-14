import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

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
 * Simple implementation that maps tokens to server factories
 */
export class TokenBasedServerProvider implements BearerTokenProvider {
  private tokenToServerFactory: Map<string, () => Promise<Server>>;
  
  constructor(tokenMappings: Record<string, () => Promise<Server>>) {
    this.tokenToServerFactory = new Map(Object.entries(tokenMappings));
  }
  
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    if (!this.tokenToServerFactory.has(token)) {
      throw new Error('Invalid token');
    }
    
    return {
      token,
      clientId: `client-${token}`,
      scopes: []
    };
  }
  
  async createServerForToken(token: string, authInfo: AuthInfo): Promise<Server> {
    const factory = this.tokenToServerFactory.get(token);
    if (!factory) {
      throw new Error('No server factory found for token');
    }
    
    return factory();
  }
}