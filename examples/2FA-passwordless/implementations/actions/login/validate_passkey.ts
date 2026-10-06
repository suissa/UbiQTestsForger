export const implementation = {
  kind: "action" as const,
  id: "login.validate_passkey",
  actor: "UserLoginIntent",
  inputKeys: ["passkey","session_id"],
  outputKeys: ["authenticated"],
  dependsOn: ["login.receive_passkey"],
  execute(input: Record<string, unknown>) {
    for (const key of ["passkey","session_id"]) {
      if (!Object.hasOwn(input, key)) throw new Error("login.validate_passkey: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["passkey","session_id"].includes(key)) throw new Error("login.validate_passkey: undeclared input " + key);
    }
    return { action_id: "login.validate_passkey", actor: "UserLoginIntent", output_keys: ["authenticated"] };
  }
};
export type loginValidate_passkeyImplementation = typeof implementation;
