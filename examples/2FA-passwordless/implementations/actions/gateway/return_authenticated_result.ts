export interface GatewayReturnAuthenticatedResultContext {
  values: Record<string, unknown>;
  completedActions: readonly string[];
}

const actionId = "gateway.return_authenticated_result";
const actorId = "GatewayPlane";
const inputKeys = ["session_id", "result"] as const;
const outputKeys = ["web", "whatsapp"] as const;
const dependsOn = ["web.receive_passkey_route"] as const;

export const implementation = {
  kind: "action" as const,
  id: actionId,
  actor: actorId,
  inputKeys,
  outputKeys,
  dependsOn,
  execute(input: Record<string, unknown>, context: GatewayReturnAuthenticatedResultContext) {
    for (const key of inputKeys) {
      if (!Object.hasOwn(input, key)) throw new Error(actionId + ": missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!(inputKeys as readonly string[]).includes(key)) throw new Error(actionId + ": undeclared input " + key);
    }
    for (const dependency of dependsOn) {
      if (!context.completedActions.includes(dependency)) throw new Error(actionId + ": unmet dependency " + dependency);
    }

    if (typeof input.session_id !== "string" || input.session_id.length === 0)
      throw new Error(actionId + ": session_id must be a non-empty string");
    if (input.session_id !== context.values.session_id)
      throw new Error(actionId + ": session_id does not match the declared session");
    if (input.result !== context.values.login_result || input.result !== "authenticated")
      throw new Error(actionId + ": result is not the declared authenticated outcome");

    const web = context.values.web_message;
    const whatsapp = context.values.whatsapp_message;
    if (typeof web !== "string" || web.length === 0 || typeof whatsapp !== "string" || whatsapp.length === 0)
      throw new Error(actionId + ": missing declared channel message");

    return { web, whatsapp };
  }
};

export type gatewayReturn_authenticated_resultImplementation = typeof implementation;
