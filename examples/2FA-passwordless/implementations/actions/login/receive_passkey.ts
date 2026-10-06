export const implementation = {
  kind: "action" as const,
  id: "login.receive_passkey",
  actor: "UserLoginIntent",
  inputKeys: ["passkey"],
  outputKeys: ["received"],
  dependsOn: ["login.send_magic_link"],
  execute(input: Record<string, unknown>) {
    for (const key of ["passkey"]) {
      if (!Object.hasOwn(input, key)) throw new Error("login.receive_passkey: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["passkey"].includes(key)) throw new Error("login.receive_passkey: undeclared input " + key);
    }
    return { action_id: "login.receive_passkey", actor: "UserLoginIntent", output_keys: ["received"] };
  }
};
export type loginReceive_passkeyImplementation = typeof implementation;
