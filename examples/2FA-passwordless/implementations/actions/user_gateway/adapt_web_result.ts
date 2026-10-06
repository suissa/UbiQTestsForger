export const implementation = {
  kind: "action" as const,
  id: "user_gateway.adapt_web_result",
  actor: "UserGatewayAgent",
  inputKeys: ["result","message"],
  outputKeys: ["channel","message"],
  dependsOn: ["gateway.send_result_user_gateway"],
  execute(input: Record<string, unknown>) {
    for (const key of ["result","message"]) {
      if (!Object.hasOwn(input, key)) throw new Error("user_gateway.adapt_web_result: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["result","message"].includes(key)) throw new Error("user_gateway.adapt_web_result: undeclared input " + key);
    }
    return { action_id: "user_gateway.adapt_web_result", actor: "UserGatewayAgent", output_keys: ["channel","message"] };
  }
};
export type user_gatewayAdapt_web_resultImplementation = typeof implementation;
