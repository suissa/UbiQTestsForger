export const implementation = {
  kind: "action" as const,
  id: "gateway.receive_whatsapp_number",
  actor: "GatewayPlane",
  inputKeys: ["whatsapp_number"],
  outputKeys: ["received"],
  dependsOn: [],
  execute(input: Record<string, unknown>) {
    for (const key of ["whatsapp_number"]) {
      if (!Object.hasOwn(input, key)) throw new Error("gateway.receive_whatsapp_number: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["whatsapp_number"].includes(key)) throw new Error("gateway.receive_whatsapp_number: undeclared input " + key);
    }
    return { action_id: "gateway.receive_whatsapp_number", actor: "GatewayPlane", output_keys: ["received"] };
  }
};
export type gatewayReceive_whatsapp_numberImplementation = typeof implementation;
