import { describe, expect, it } from "vitest";
import { defineMcp, defineTool } from "@lovable.dev/mcp-js";
import { createTanStackMcpHandler } from "@lovable.dev/mcp-js/stacks/tanstack";
const mcp = defineMcp({
  name: "fixture",
  title: "Fixture MCP",
  instructions: "Local SDK compatibility check",
  version: "1.0.0",
  metrics: false,
  tools: [
    defineTool({
      name: "ping",
      title: "Ping",
      description: "Local compatibility fixture",
      inputSchema: {},
      handler: () => ({ content: [{ type: "text", text: "pong" }] }),
    }),
  ],
});
const handler = createTanStackMcpHandler(mcp);
async function rpc(method: string, params: Record<string, unknown> = {}) {
  const response = await handler({
    request: new Request("https://fixture.invalid/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  });
  expect(response.status).toBe(200);
  const text = await response.text();
  return JSON.parse(text.startsWith("event:") ? text.split("data: ")[1].trim() : text);
}
describe("MCP SDK compatibility through the app's TanStack adapter", () => {
  it("initializes the protocol and lists and executes a local tool without external services", async () => {
    const initialized = await rpc("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "fixture-client", version: "1" },
    });
    expect(initialized.result.serverInfo.name).toBe("fixture");
    expect((await rpc("tools/list")).result.tools[0].name).toBe("ping");
    expect(
      (await rpc("tools/call", { name: "ping", title: "Ping", arguments: {} })).result.content[0]
        .text,
    ).toBe("pong");
  });
});
