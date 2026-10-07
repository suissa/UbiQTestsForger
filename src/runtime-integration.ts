import {createServer, type IncomingMessage, type ServerResponse} from "node:http";
import {loadScenario} from "./scenario.ts";
import {loadRuntimeConfig, adapterFor, validateRuntimeConfig} from "./runtime-config.ts";
import {verifyTrajectory} from "./engine.ts";

const root = "examples/2FA-passwordless";
const scenario = await loadScenario(root);

const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
  if (request.method !== "POST") {
    response.writeHead(405, {"content-type": "application/json"});
    response.end(JSON.stringify({error: "method_not_allowed"}));
    return;
  }

  const actionId = request.url?.slice(1) ?? "";
  const body: Buffer[] = [];
  for await (const chunk of request) body.push(Buffer.from(chunk));

  response.writeHead(200, {"content-type": "application/json"});
  response.end(JSON.stringify({
    action_id: actionId,
    received: body.length > 0,
    runtime: "local-http-fixture"
  }));
});

await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => resolve());
});

const address = server.address();
if (!address || typeof address === "string") throw new Error("fixture server did not expose a TCP port");

process.env.UBIQ_RUNTIME_BASE_URL = `http://127.0.0.1:${address.port}`;

try {
  const config = await loadRuntimeConfig(`${root}/runtime/runtime.example.json`);
  const configErrors = validateRuntimeConfig(config, scenario.actions.map(action => action.id));
  if (configErrors.length) throw new Error(configErrors.join("\n"));

  const result = await verifyTrajectory(scenario, actionId => adapterFor(actionId, config));
  const failed = result.runtime.results.filter(run => !run.ok);
  const httpEvidence = result.runtime.evidence.filter(event => event.kind === "event" && event.source === "http");
  const expectedHttpActions = result.runtime.results.length;

  if (!result.match.matched) throw new Error(`trajectory mismatch: ${result.match.diagnostics.join("; ")}`);
  if (result.negative.some(check => !check.passed)) throw new Error("negative trajectory verification failed");
  if (failed.length) throw new Error(failed.map(run => `${run.actionId}: ${run.error ?? "runtime failure"}`).join("\n"));
  if (httpEvidence.length !== expectedHttpActions) {
    throw new Error(`expected HTTP evidence for ${expectedHttpActions} actions, observed ${httpEvidence.length}`);
  }

  console.log(JSON.stringify({
    ok: true,
    scenario: scenario.id,
    transport: "http",
    actions: result.runtime.results.length,
    matched: result.match.matched,
    negative_checks: result.negative.length,
    http_events: httpEvidence.length
  }, null, 2));
} finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
}
