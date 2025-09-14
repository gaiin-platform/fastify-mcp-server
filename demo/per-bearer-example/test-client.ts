#!/usr/bin/env node

/**
 * Simple test client to demonstrate per-bearer token MCP server functionality
 */

const SERVER_URL = 'http://127.0.0.1:9081/mcp';

const TOKENS = {
  'basic-user-token': 'Basic User (Math tools)',
  'admin-token': 'Admin User (System tools)', 
  'analyst-token': 'Data Analyst (Statistics tools)'
};

async function testMcpEndpoint(token: string, description: string) {
  console.log(`\n🧪 Testing ${description} with token: ${token}`);
  console.log('='.repeat(60));

  try {
    // Initialize session
    const initResponse = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      })
    });

    if (!initResponse.ok) {
      throw new Error(`HTTP ${initResponse.status}: ${initResponse.statusText}`);
    }

    const sessionId = initResponse.headers.get('mcp-session-id');
    if (!sessionId) {
      throw new Error('No session ID returned');
    }

    console.log(`✅ Session initialized: ${sessionId}`);

    // List available tools
    const toolsResponse = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });

    if (!toolsResponse.ok) {
      throw new Error(`HTTP ${toolsResponse.status}: ${toolsResponse.statusText}`);
    }

    const toolsData = await toolsResponse.json();
    console.log('📋 Available tools:');
    toolsData.result.tools.forEach((tool: any) => {
      console.log(`  • ${tool.name}: ${tool.description}`);
    });

    // Test a tool if available
    if (toolsData.result.tools.length > 0) {
      const firstTool = toolsData.result.tools[0];
      let testArgs: any = {};

      // Prepare test arguments based on tool
      switch (firstTool.name) {
        case 'add':
        case 'multiply':
          testArgs = { a: 5, b: 3 };
          break;
        case 'system_info':
        case 'memory_usage':
          testArgs = {};
          break;
        case 'calculate_mean':
        case 'calculate_median':
          testArgs = { numbers: [1, 2, 3, 4, 5] };
          break;
        case 'restart_service':
          testArgs = { service: 'nginx' };
          break;
        case 'find_outliers':
          testArgs = { numbers: [1, 2, 3, 4, 50], threshold: 2 };
          break;
        default:
          console.log(`⚠️  Don't know how to test tool: ${firstTool.name}`);
          return;
      }

      console.log(`\n🔧 Testing tool: ${firstTool.name}`);
      
      const toolResponse = await fetch(SERVER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'mcp-session-id': sessionId
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: firstTool.name,
            arguments: testArgs
          }
        })
      });

      if (!toolResponse.ok) {
        throw new Error(`HTTP ${toolResponse.status}: ${toolResponse.statusText}`);
      }

      const toolResult = await toolResponse.json();
      if (toolResult.result && toolResult.result.content) {
        console.log('📤 Tool output:', toolResult.result.content[0].text);
      }
    }

    // Clean up session
    await fetch(SERVER_URL, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'mcp-session-id': sessionId
      }
    });

    console.log('🗑️  Session cleaned up');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

async function main() {
  console.log('🏃 Starting Per-Bearer Token MCP Server Tests\n');
  
  // Test each token
  for (const [token, description] of Object.entries(TOKENS)) {
    await testMcpEndpoint(token, description);
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause between tests
  }

  console.log('\n✨ All tests completed!\n');
}

// Test with invalid token
async function testInvalidToken() {
  console.log('\n🚫 Testing with invalid token');
  console.log('='.repeat(60));

  try {
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      })
    });

    if (response.status === 401) {
      console.log('✅ Correctly rejected invalid token with 401');
    } else {
      console.log('❌ Expected 401 but got:', response.status);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => testInvalidToken())
    .catch(console.error);
}