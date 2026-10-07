import {createServer, type IncomingMessage, type ServerResponse} from "node:http";
import {createHash} from "node:crypto";
import {loadScenario} from "./scenario.ts";
import {loadRuntimeConfig, adapterFor, validateRuntimeConfig} from "./runtime-config.ts";
import {verifyTrajectory} from "./engine.ts";
import {scenarioTrajectory} from "./trajectory.ts";
import {EvidenceCollector} from "./evidence.ts";
import {HttpRuntimeAdapter, WebSocketRuntimeAdapter} from "./runtime.ts";
import {RUNTIME_CONFORMANCE_CASES, validateRuntimeConformanceMatrix} from "./runtime-conformance.ts";

const root = "examples/2FA-passwordless";
const scenario = await loadScenario(root);
const declaredTrajectory = scenarioTrajectory(scenario);
const runtimeActionIds = declaredTrajectory.nodes.flatMap(node => node.kind === "hope" && node.target.includes(".") ? [node.target] : []);
const action = scenario.actions[0];

const httpServer = createServer(async (request: IncomingMessage, response: ServerResponse) => {
  if (request.method !== "POST") {
    response.writeHead(405, {"content-type": "application/json"});
    response.end(JSON.stringify({error: "method_not_allowed"}));
    return;
  }
  const path = request.url ?? "/";
  const body: Buffer[] = [];
  for await (const chunk of request) body.push(Buffer.from(chunk));
  if (path === "/timeout") {
    await new Promise(resolve => setTimeout(resolve, 200));
    response.writeHead(200, {"content-type": "application/json"});
    response.end(JSON.stringify({runtime: "timeout-fixture"}));
    return;
  }
  const status = path === "/status-500" ? 500 : 200;
  response.writeHead(status, {"content-type": "application/json"});
  response.end(JSON.stringify({action_id: path.slice(1), received: body.length > 0, runtime: "local-http-fixture"}));
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
  const path = request.url ?? "/";
  if (path === "/close-before-open") {
    socket.end();
    return;
  }
  const key = request.headers["sec-websocket-key"];
  if (typeof key !== "string") {
    socket.destroy();
    return;
  }
  const accept = createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: "+accept+"\r\n\r\n");
  let pending = Buffer.alloc(0);
  socket.on("data", chunk => {
    pending = Buffer.concat([pending, Buffer.from(chunk)]);
    const frame = decodeWebSocketFrame(pending);
    if (!frame) return;
    pending = pending.subarray(frame.consumed);
    if (path === "/close-before-receive") {
      setTimeout(() => socket.end(), 10);
      return;
    }
    const input = frame.text ?? "";
    const messages = path === "/multi" ? [1, 2] : [1];
    for (const index of messages) {
      socket.write(websocketFrame(JSON.stringify({runtime: "local-websocket-fixture", index, received: input.length > 0})));
    }
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
if (!httpAddress || typeof httpAddress === "string" || !websocketAddress || typeof websocketAddress === "string") throw new Error("runtime fixtures did not expose TCP ports");

process.env.UBIQ_RUNTIME_BASE_URL = "http://127.0.0.1:"+httpAddress.port;

const expectFailure = async (label:string, result:Promise<{ok:boolean;error?:string;evidence:readonly {kind:string;source:string}[]}>) => {
  const value = await result;
  if (value.ok) throw new Error(label+" unexpectedly succeeded");
  if (!value.error) throw new Error(label+" failed without explicit error");
  if (!value.evidence.some(e => e.kind === "error")) throw new Error(label+" missing error evidence");
  return value;
};

try {
  const matrixErrors = validateRuntimeConformanceMatrix();
  if (matrixErrors.length) throw new Error(matrixErrors.join("\n"));
  const config = await loadRuntimeConfig(root+"/runtime/runtime.example.json");
  const configErrors = validateRuntimeConfig(config, runtimeActionIds);
  if (configErrors.length) throw new Error(configErrors.join("\n"));

  const trajectory = await verifyTrajectory(scenario, actionId => adapterFor(actionId, config));
  const failed = trajectory.runtime.results.filter(run => !run.ok);
  const httpEvidence = trajectory.runtime.evidence.filter(event => event.kind === "event" && event.source === "http");
  if (!trajectory.match.matched) throw new Error("trajectory mismatch: "+trajectory.match.diagnostics.join("; "));
  if (trajectory.negative.some(check => !check.passed)) throw new Error("negative trajectory verification failed");
  if (failed.length) throw new Error(failed.map(run => run.actionId+": "+(run.error ?? "runtime failure")).join("\n"));
  if (httpEvidence.length !== trajectory.runtime.results.length) throw new Error("HTTP evidence count mismatch");

  const http = new HttpRuntimeAdapter({defaultTimeoutMs: 100});
  const statusFailure = await expectFailure("HTTP unexpected status", http.execute(action, {values: scenario.values, state: {}}, new EvidenceCollector()));
  const statusBinding = {protocol:"http" as const, method:"POST" as const, url:"http://127.0.0.1:"+httpAddress.port+"/status-500", expect_status:[200], timeout_ms:100};
  const statusContext = {values:scenario.values, state:{} as Record<string,unknown>};
  const statusResult = await new HttpRuntimeAdapter({bindings:{[action.id]:statusBinding}}).execute(action,statusContext,new EvidenceCollector());
  if (statusResult.ok || !statusFailure.error) throw new Error("HTTP status conformance setup failed");
  const timeoutContext = {values:scenario.values, state:{} as Record<string,unknown>};
  const timeoutResult = await new HttpRuntimeAdapter({bindings:{[action.id]:{protocol:"http",method:"POST",url:"http://127.0.0.1:"+httpAddress.port+"/timeout",timeout_ms:25}}}).execute(action,timeoutContext,new EvidenceCollector());
  if (timeoutResult.ok || !timeoutResult.error?.includes("timeout")) throw new Error("HTTP timeout conformance failed");
  if (Object.keys(timeoutContext.state).length !== 0) throw new Error("timed-out HTTP action mutated state");
  const missingBinding = await expectFailure("missing runtime binding", http.execute(action,{values:scenario.values,state:{}},new EvidenceCollector()));
  if (!missingBinding.error?.includes("missing HTTP runtime binding")) throw new Error("missing binding did not fail closed");
  if (Object.keys(statusResult.output).length !== 0) throw new Error("failed HTTP action produced output");
  if (Object.keys(timeoutResult.output).length !== 0) throw new Error("timed-out HTTP action produced output");
  if (Object.keys(statusContext.state).length !== 0) throw new Error("failed HTTP status mutated state");

  const wsBase = "ws://127.0.0.1:"+websocketAddress.port;
  const multiCollector = new EvidenceCollector();
  const multiResult = await new WebSocketRuntimeAdapter({bindings:{[action.id]:{protocol:"websocket",url:wsBase+"/multi",timeout_ms:500,receive:{timeout_ms:500,messages:2}}}}).execute(action,{values:scenario.values,state:{}},multiCollector);
  if (!multiResult.ok || !Array.isArray(multiResult.output.messages) || multiResult.output.messages.length !== 2) throw new Error("WebSocket multi-message conformance failed");
  if (multiResult.evidence.filter(e => e.kind === "event" && e.source === "websocket").length !== 4) throw new Error("WebSocket multi-message evidence mismatch");

  const closeResult = await expectFailure("WebSocket close before receive", new WebSocketRuntimeAdapter({bindings:{[action.id]:{protocol:"websocket",url:wsBase+"/close-before-receive",timeout_ms:500,receive:{timeout_ms:500,messages:1}}}}).execute(action,{values:scenario.values,state:{}},new EvidenceCollector()));
  if (!closeResult.error?.includes("closed before receiving")) throw new Error("WebSocket close-before-receive did not fail closed");

  const closeOpenResult = await expectFailure("WebSocket close before open", new WebSocketRuntimeAdapter({bindings:{[action.id]:{protocol:"websocket",url:wsBase+"/close-before-open",timeout_ms:500,receive:{timeout_ms:500,messages:1}}}}).execute(action,{values:scenario.values,state:{}},new EvidenceCollector()));
  if (!closeOpenResult.error?.includes("closed before open") && !closeOpenResult.error?.includes("WebSocket transport error")) throw new Error("WebSocket close-before-open did not fail closed");

  const transportResult = await expectFailure("WebSocket transport failure", new WebSocketRuntimeAdapter({bindings:{[action.id]:{protocol:"websocket",url:"ws://127.0.0.1:1",timeout_ms:250,receive:{timeout_ms:250,messages:1}}}}).execute(action,{values:scenario.values,state:{}},new EvidenceCollector()));
  if (!transportResult.error) throw new Error("WebSocket transport failure missing error");

  console.log(JSON.stringify({ok:true,scenario:scenario.id,conformance:{cases:RUNTIME_CONFORMANCE_CASES.length,http:["success","unexpected_status","timeout","missing_binding","fail_closed_state"],websocket:["success","multi_message","close_before_receive","close_before_open","transport_error"]},trajectory:{actions:trajectory.runtime.results.length,matched:trajectory.match.matched},negative_checks:trajectory.negative.length},null,2));
} finally {
  await Promise.all([new Promise<void>(resolve=>httpServer.close(()=>resolve())),new Promise<void>(resolve=>websocketServer.close(()=>resolve()))]);
}
