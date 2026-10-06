export const implementation = {
  kind: "action" as const,
  id: "gateway.send_result_user_gateway",
  actor: "GatewayPlane",
  inputKeys: ["result"],
  outputKeys: ["delivered"],
  dependsOn: ["login.validate_passkey"],
  execute(input: Record<string, unknown>) {
    for (const key of ["result"]) {
      if (!Object.hasOwn(input, key)) throw new Error("gateway.send_result_user_gateway: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["result"].includes(key)) throw new Error("gateway.send_result_user_gateway: undeclared input " + key);
    }
    return { action_id: "gateway.send_result_user_gateway", actor: "GatewayPlane", output_keys: ["delivered"] };
  }
};
export type gatewaySend_result_user_gatewayImplementation = typeof implementation;
