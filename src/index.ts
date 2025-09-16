import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { FastifyMcpServer } from './server.ts';
import type { FastifyMcpServerOptions } from './types.ts';

// Re-export the bearer token provider types
export type { BearerTokenProvider } from './bearer-provider.ts';
export { TokenBasedServerProvider } from './bearer-provider.ts';

// Export main configuration types
export type { FastifyMcpServerOptions, AuthorizationOptions } from './types.ts';

// Export the main server class for advanced users
export { FastifyMcpServer } from './server.ts';

// Export session manager for advanced users who need session control
export { SessionManager } from './session-manager.ts';

// Export per-bearer server functionality - the key new feature
export {
  createPerBearerMcpServer,
  PerBearerMcpServer,
  type PerBearerMcpServerOptions,
  type ServerFactory,
  type ServerWithMetadata,
  type ServerInfo,
  type SessionInfo,
  type ToolCallInfo,
  type ServerRegistrationInfo,
  type ServerRemovalInfo,
  type ServerUpdateInfo,
  type PerBearerMcpServerEvents
} from './per-bearer-mcp-server.ts';

// Export error classes for error handling
export {
  InvalidRequestError,
  SessionNotFoundError,
  setMcpErrorHandler
} from './errors.ts';

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * Decorator for accessing the MCP server instance.
     */
    mcp: FastifyMcpServer;
  }
}

const kFastifyMcp = Symbol('fastifyMcp');

/**
 * Fastify plugin for handling Model Context Protocol (MCP) streamable HTTP requests.
 */
const FastifyMcp: FastifyPluginAsync<FastifyMcpServerOptions> = async (app, options) => {
  const mcp = new FastifyMcpServer(app, options);

  // Decorate the Fastify instance with the MCP server for external access
  app.decorate(kFastifyMcp, mcp);
};

/**
 * Get the `FastifyMcpStreamableHttp` decorator from the Fastify instance.
 */
export function getMcpDecorator (app: FastifyInstance) {
  return app.getDecorator<FastifyMcpServer>(kFastifyMcp);
}

export default fp(FastifyMcp, {
  name: 'fastify-mcp-server',
  fastify: '5.x'
});
