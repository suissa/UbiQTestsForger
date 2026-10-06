export const implementation = {
  kind: "action" as const,
  id: "gateway.validate_chat_number",
  actor: "GatewayPlane",
  inputKeys: ["chat_number"],
  outputKeys: ["valid","normalized"],
  dependsOn: ["gateway.receive_whatsapp_number"],
  execute(input: Record<string, unknown>) {
    for (const key of ["chat_number"]) {
      if (!Object.hasOwn(input, key)) throw new Error("gateway.validate_chat_number: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["chat_number"].includes(key)) throw new Error("gateway.validate_chat_number: undeclared input " + key);
    }
    return { action_id: "gateway.validate_chat_number", actor: "GatewayPlane", output_keys: ["valid","normalized"] };
  }
};
export type gatewayValidate_chat_numberImplementation = typeof implementation;
