# Per-Bearer Token MCP Server Configuration

This feature enables you to configure different MCP server instances based on bearer tokens. Each bearer token can be associated with a different set of tools and capabilities.

## How It Works

1. **Bearer Token Provider**: Implement the `BearerTokenProvider` interface or use the `TokenBasedServerProvider` class
2. **Per-Token Servers**: Each valid bearer token gets its own MCP server instance with specific tools
3. **Session Management**: Sessions are automatically created with the appropriate server based on the bearer token

## Example Usage

```typescript
import FastifyMcpStreamableHttp, { TokenBasedServerProvider } from 'fastify-mcp-server';
import { createBasicMathServer } from './tools/basic-tools.js';
import { createAdminServer } from './tools/admin-tools.js';
import { createDataAnalysisServer } from './tools/data-tools.js';

// Create a token-based server provider
const bearerTokenProvider = new TokenBasedServerProvider({
  'basic-user-token': createBasicMathServer,
  'admin-token': createAdminServer,
  'analyst-token': createDataAnalysisServer
});

// Register with Fastify
await app.register(FastifyMcpStreamableHttp, {
  endpoint: '/mcp',
  authorization: {
    bearerTokenProvider,
    oauth2: {
      // OAuth2 configuration (optional)
    }
  }
});
```

## Bearer Token Provider Interface

```typescript
interface BearerTokenProvider {
  verifyAccessToken(token: string): Promise<AuthInfo>;
  createServerForToken(token: string, authInfo: AuthInfo): Promise<Server>;
}
```

## Demo

The `demo/per-bearer-example/` directory contains a complete example with:

- **Basic Math Server** (`basic-user-token`): Simple arithmetic tools (add, multiply)
- **Admin Server** (`admin-token`): System administration tools (system info, memory usage, restart service)
- **Data Analysis Server** (`analyst-token`): Statistical tools (mean, median, outliers)

### Running the Demo

1. Install dependencies: `npm install`
2. Start the server: `npm run demo:per-bearer`
3. Test with different tokens: `npm run demo:test-client`

### Manual Testing

```bash
# Test with basic user token
curl -H "Authorization: Bearer basic-user-token" -H "Content-Type: application/json" -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "test", "version": "1.0.0"}
  }
}' http://127.0.0.1:9081/mcp
```

## Benefits

1. **Security**: Different clients get access to different tool sets based on authentication
2. **Isolation**: Each token gets its own server instance, preventing cross-client interference
3. **Flexibility**: Easy to add new token types and associated tool sets
4. **Scalability**: Sessions are managed per-token, allowing for better resource management

## Migration from Single Server

If you're currently using a single server configuration:

```typescript
// Before (single server)
await app.register(FastifyMcpStreamableHttp, {
  server: myMcpServer,
  endpoint: '/mcp'
});

// After (per-bearer token)
const bearerTokenProvider = new TokenBasedServerProvider({
  'my-token': async () => myMcpServer
});

await app.register(FastifyMcpStreamableHttp, {
  endpoint: '/mcp',
  authorization: {
    bearerTokenProvider
  }
});
```

The single server approach is still supported by providing the `server` option without `bearerTokenProvider`.