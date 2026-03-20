/**
 * Moralis MCP Server wrapper.
 *
 * The upstream @moralisweb3/api-mcp-server uses `serverSetup()` which is async
 * and returns a `Server` instance. Our embedded loader expects a synchronous
 * factory returning an object with connect(). We pre-initialize the server
 * at import time and return it from the factory.
 *
 * The server auto-discovers all Moralis API endpoints from their OpenAPI spec
 * and exposes them as MCP tools (~80+ tools covering EVM + Solana).
 */

let _serverPromise: Promise<unknown> | null = null

async function getServer(): Promise<unknown> {
  if (!_serverPromise) {
    // Dynamic import to avoid loading at module parse time
    const { serverSetup } = await import('@moralisweb3/api-mcp-server/dist/server.js') as {
      serverSetup: () => Promise<unknown>
    }
    _serverPromise = serverSetup()
  }
  return _serverPromise
}

/**
 * Create the Moralis MCP server.
 * Returns a pre-initialized Server instance (compatible with InMemoryTransport).
 *
 * NOTE: This is async unlike other plugin factories. The embedded-skill-loader
 * handles this via the async ensureEmbeddedServer() path.
 */
export async function createMoralisServer(): Promise<unknown> {
  return getServer()
}
