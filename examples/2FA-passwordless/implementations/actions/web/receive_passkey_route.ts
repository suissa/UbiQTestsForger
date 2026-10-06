export const implementation = {
  kind: "action" as const,
  id: "web.receive_passkey_route",
  actor: "GatewayPlane",
  inputKeys: ["passkey","chat_number"],
  outputKeys: ["validated"],
  dependsOn: ["login.validate_passkey"],
  execute(input: Record<string, unknown>) {
    for (const key of ["passkey","chat_number"]) {
      if (!Object.hasOwn(input, key)) throw new Error("web.receive_passkey_route: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["passkey","chat_number"].includes(key)) throw new Error("web.receive_passkey_route: undeclared input " + key);
    }
    return { action_id: "web.receive_passkey_route", actor: "GatewayPlane", output_keys: ["validated"] };
  }
};
export type webReceive_passkey_routeImplementation = typeof implementation;
