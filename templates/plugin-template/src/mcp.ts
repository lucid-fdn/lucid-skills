import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function createServer(): McpServer {
  const server = new McpServer({ name: 'lucid-PLUGIN_NAME', version: '1.0.0' })

  server.tool('example_tool', 'Example tool description', {}, async () => {
    return { content: [{ type: 'text', text: 'Hello from PLUGIN_NAME' }] }
  })

  return server
}
