export interface LoginReceivePasskeyContext {
  values: Record<string, unknown>;
  completedActions: readonly string[];
}

const actionId = "login.receive_passkey";
const actorId = "UserLoginIntent";
const inputKeys = ["passkey"] as const;
const outputKeys = ["received"] as const;
const dependsOn = ["login.send_magic_link"] as const;

export const implementation = {
  kind: "action" as const,
  id: actionId,
  actor: actorId,
  inputKeys,
  outputKeys,
  dependsOn,
  execute(input: Record<string, unknown>, context: LoginReceivePasskeyContext) {
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

    return { received: true };
  }
};

export type loginReceive_passkeyImplementation = typeof implementation;
