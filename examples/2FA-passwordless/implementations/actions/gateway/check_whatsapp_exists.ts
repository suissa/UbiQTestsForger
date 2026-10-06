export const implementation = {
  kind: "action" as const,
  id: "gateway.check_whatsapp_exists",
  actor: "GatewayPlane",
  inputKeys: ["chat_number"],
  outputKeys: ["exists"],
  dependsOn: ["gateway.validate_chat_number"],
  execute(input: Record<string, unknown>) {
    for (const key of ["chat_number"]) {
      if (!Object.hasOwn(input, key)) throw new Error("gateway.check_whatsapp_exists: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["chat_number"].includes(key)) throw new Error("gateway.check_whatsapp_exists: undeclared input " + key);
    }
    return { action_id: "gateway.check_whatsapp_exists", actor: "GatewayPlane", output_keys: ["exists"] };
  }
};
export type gatewayCheck_whatsapp_existsImplementation = typeof implementation;
