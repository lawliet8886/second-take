/** One bounded real-provider diagnostic; never persist credentials or raw errors. */
import "dotenv/config";
import { loadConfig } from "../src/config/config.js";
import { VertexRouterClient } from "../src/vertex/router-client.js";
const config = loadConfig();
try {
  const result = await new VertexRouterClient(config.vertexProjectId, config.vertexLocation).route({
    requestId: "video-preflight", text: "I am worried about the project", locale: "en-US", deadlineMs: 10000,
  });
  console.log(JSON.stringify({ ok: true, latencyMs: result.latencyMs, retries: result.retries, usage: result.usage }));
} catch (error) {
  const message = String((error as Error).message);
  console.log(JSON.stringify({ ok: false, name: (error as Error).name,
    authentication: /invalid_grant|reauth|login|credential|UNAUTHENTICATED|401/i.test(message),
    quota: /429|quota|RESOURCE_EXHAUSTED/i.test(message),
    unavailableModel: /404|not found|NOT_FOUND/i.test(message),
    deadline: /deadline|timed out|timeout|abort/i.test(message),
    contract: /ROUTER_|JSON|schema/i.test(message),
  }));
  process.exitCode = 1;
}
