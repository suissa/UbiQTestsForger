export const implementation = {
  kind: "action" as const,
  id: "gateway.return_authenticated_result",
  actor: "GatewayPlane",
  inputKeys: ["session_id","result"],
  outputKeys: ["web","whatsapp"],
  dependsOn: ["web.receive_passkey_route"],
  execute(input: Record<string, unknown>) {
    for (const key of ["session_id","result"]) {
      if (!Object.hasOwn(input, key)) throw new Error("gateway.return_authenticated_result: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["session_id","result"].includes(key)) throw new Error("gateway.return_authenticated_result: undeclared input " + key);
    }
    return { action_id: "gateway.return_authenticated_result", actor: "GatewayPlane", output_keys: ["web","whatsapp"] };
  }
};
export type gatewayReturn_authenticated_resultImplementation = typeof implementation;
