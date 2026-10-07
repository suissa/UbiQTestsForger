import {createServer, type IncomingMessage, type ServerResponse} from "node:http";
import {createHash} from "node:crypto";
import {loadScenario} from "./scenario.ts";
import {loadRuntimeConfig, adapterFor, validateRuntimeConfig} from "./runtime-config.ts";
import {verifyTrajectory} from "./engine.ts";
import {scenarioTrajectory} from "./trajectory.ts";
import {EvidenceCollector} from "./evidence.ts";
import {WebSocketRuntimeAdapter} from "./runtime.ts";

const root = "examples/2FA-passwordless";
const scenario = await loadScenario(root);
const declaredTrajectory = scenarioTrajectory(scenario);
const runtimeActionIds = declaredTrajectory.nodes.flatMap(node => node.kind === "hope" && node.target.includes(".") ? [node.target] : []);

const httpServer = createServer(async (request: IncomingMessage, response: ServerResponse) => {
  if (request.method !== "POST") {
    response.writeHead(405, {"content-type": "application/json"});
    response.end(JSON.stringify({error: "method_not_allowed"}));
    return;
  }
  const actionId = request.url?.slice(1) ?? "";
  const body: Buffer[] = [];
  for await (const chunk of request) body.push(Buffer.from(chunk));
  response.writeHead(200, {"content-type": "application/json"});
  response.end(JSON.stringify({action_id: actionId, received: body.length > 0, runtime: "local-http-fixture"}));
});

function websocketFrame(text: string): Buffer {
  const payload = Buffer.from(text);
  if (payload.length < 126) return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
  if (payload.length <= 65535) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
    return Buffer.concat([header, payload]);
  }
  throw new Error("fixture WebSocket payload too large");
}

function decodeWebSocketFrame(buffer: Buffer): {text?: string; consumed: number} | undefined {
  if (buffer.length < 2) return undefined;
  const second = buffer[1];
  const masked = (second & 0x80) !== 0;
  let length = second & 0x7f;
  let offset = 2;
  if (length === 126) {
    if (buffer.length < 4) return undefined;
    length = buffer.readUInt16BE(2);
    offset = 4;
  } else if (length === 127) {
    throw new Error("fixture does not support 64-bit WebSocket payloads");
  }
  if (!masked || buffer.length < offset + 4 + length) return undefined;
  const key = buffer.subarray(offset, offset + 4);
  offset += 4;
  const payload = Buffer.from(buffer.subarray(offset, offset + length));
  for (let i = 0; i < payload.length; i++) payload[i] ^= key[i % 4];
  return {text: payload.toString("utf8"), consumed: offset + length};
}

const websocketServer = createServer();
websocketServer.on("upgrade", (request, socket) => {
  const key = request.headers["sec-websocket-key"];
  if (typeof key !== "string") {
    socket.destroy();
    return;
  }
  const accept = createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
    "Upgrade: websocket\r\n" +
    "Connection: Upgrade\r\n" +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  let pending = Buffer.alloc(0);
  socket.on("data", chunk => {
    pending = Buffer.concat([pending, Buffer.from(chunk)]);
    const frame = decodeWebSocketFrame(pending);
    if (!frame) return;
    pending = pending.subarray(frame.consumed);
    const input = frame.text ?? "";
    socket.write(websocketFrame(JSON.stringify({runtime: "local-websocket-fixture", received: input.length > 0})));
    setTimeout(() => socket.end(), 10);
  });
});

await Promise.all([
  new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", () => resolve());
  }),
  new Promise<void>((resolve, reject) => {
    websocketServer.once("error", reject);
    websocketServer.listen(0, "127.0.0.1", () => resolve());
  })
]);

const httpAddress = httpServer.address();
const websocketAddress = websocketServer.address();
if (!httpAddress || typeof httpAddress === "string" || !websocketAddress || typeof websocketAddress === "string") {
  throw new Error("runtime fixtures did not expose TCP ports");
}

process.env.UBIQ_RUNTIME_BASE_URL = `http://127.0.0.1:${httpAddress.port}`;

try {
  const config = await loadRuntimeConfig(`${root}/runtime/runtime.example.json`);
  const configErrors = validateRuntimeConfig(config, runtimeActionIds);
  if (configErrors.length) throw new Error(configErrors.join("\n"));

  const result = await verifyTrajectory(scenario, actionId => adapterFor(actionId, config));
  const failed = result.runtime.results.filter(run => !run.ok);
  const httpEvidence = result.runtime.evidence.filter(event => event.kind === "event" && event.source === "http");
  if (!result.match.matched) throw new Error(`trajectory mismatch: ${result.match.diagnostics.join("; ")}`);
  if (result.negative.some(check => !check.passed)) throw new Error("negative trajectory verification failed");
  if (failed.length) throw new Error(failed.map(run => `${run.actionId}: ${run.error ?? "runtime failure"}`).join("\n"));
  if (httpEvidence.length !== result.runtime.results.length) throw new Error(`expected HTTP evidence for ${result.runtime.results.length} actions, observed ${httpEvidence.length}`);

  const websocketAction = scenario.actions[0];
  const collector = new EvidenceCollector();
  const websocketAdapter = new WebSocketRuntimeAdapter({
    defaultTimeoutMs: 5000,
    bindings: {
      [websocketAction.id]: {
        protocol: "websocket",
        url: `ws://127.0.0.1:${websocketAddress.port}`,
        timeout_ms: 5000,
        receive: {timeout_ms: 5000, messages: 1}
      }
    }
  });
  const websocketResult = await websocketAdapter.execute(websocketAction, {values: scenario.values, state: {}}, collector);
  const websocketEvidence = websocketResult.evidence.filter(event => event.kind === "event" && event.source === "websocket");
  if (!websocketResult.ok) throw new Error(`WebSocket runtime failed: ${websocketResult.error ?? "unknown error"}`);
  if (websocketEvidence.length !== 3) throw new Error(`expected WebSocket open/send/receive evidence, observed ${websocketEvidence.length}`);

  console.log(JSON.stringify({
    ok: true,
    scenario: scenario.id,
    transports: {
      http: {actions: result.runtime.results.length, events: httpEvidence.length, matched: result.match.matched},
      websocket: {action: websocketResult.actionId, events: websocketEvidence.length}
    },
    negative_checks: result.negative.length
  }, null, 2));
} finally {
  await Promise.all([
    new Promise<void>(resolve => httpServer.close(() => resolve())),
    new Promise<void>(resolve => websocketServer.close(() => resolve()))
  ]);
}
