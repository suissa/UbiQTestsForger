export interface LoginValidatePasskeyContext {
  values: Record<string, unknown>;
  completedActions: readonly string[];
}

const actionId = "login.validate_passkey";
const actorId = "UserLoginIntent";
const inputKeys = ["passkey", "session_id"] as const;
const outputKeys = ["authenticated"] as const;
const dependsOn = ["login.receive_passkey"] as const;

export const implementation = {
  kind: "action" as const,
  id: actionId,
  actor: actorId,
  inputKeys,
  outputKeys,
  dependsOn,
  execute(input: Record<string, unknown>, context: LoginValidatePasskeyContext) {
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
    if (typeof input.session_id !== "string" || input.session_id.length === 0)
      throw new Error(actionId + ": session_id must be a non-empty string");
    if (input.session_id !== context.values.session_id)
      throw new Error(actionId + ": session_id does not match the declared session");
    if (context.values.login_result !== "authenticated")
      throw new Error(actionId + ": declared result is not authenticated");

    return { authenticated: context.values.login_result };
  }
};

export type loginValidate_passkeyImplementation = typeof implementation;
