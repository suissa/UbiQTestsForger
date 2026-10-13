export interface WebReceivePasskeyRouteContext {
  values: Record<string, unknown>;
  completedActions: readonly string[];
}

const actionId = "web.receive_passkey_route";
const actorId = "GatewayPlane";
const inputKeys = ["passkey", "chat_number"] as const;
const outputKeys = ["validated"] as const;
const dependsOn = ["login.validate_passkey"] as const;

export const implementation = {
  kind: "action" as const,
  id: actionId,
  actor: actorId,
  inputKeys,
  outputKeys,
  dependsOn,
  execute(input: Record<string, unknown>, context: WebReceivePasskeyRouteContext) {
    for (const key of inputKeys) {
      if (!Object.hasOwn(input, key)) throw new Error(actionId + ": missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!(inputKeys as readonly string[]).includes(key)) throw new Error(actionId + ": undeclared input " + key);
    }
    for (const dependency of dependsOn) {
      if (!context.completedActions.includes(dependency)) throw new Error(actionId + ": unmet dependency " + dependency);
    }

    if (typeof input.passkey !== "string" || input.passkey.length === 0)
      throw new Error(actionId + ": passkey must be a non-empty string");
    if (input.passkey !== context.values.passkey_credential)
      throw new Error(actionId + ": passkey does not match the declared credential");
    if (typeof input.chat_number !== "string" || input.chat_number.length === 0)
      throw new Error(actionId + ": chat_number must be a non-empty string");
    if (input.chat_number !== context.values.whatsapp_number)
      throw new Error(actionId + ": chat_number does not match the declared WhatsApp number");
    if (context.values.login_result !== "authenticated")
      throw new Error(actionId + ": prerequisite did not produce the declared authenticated outcome");

    return { validated: context.values.login_result };
  }
};

export type webReceive_passkey_routeImplementation = typeof implementation;
