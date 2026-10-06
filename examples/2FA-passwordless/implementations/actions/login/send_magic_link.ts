export const implementation = {
  kind: "action" as const,
  id: "login.send_magic_link",
  actor: "UserLoginIntent",
  inputKeys: ["chat_number","magic_link"],
  outputKeys: ["sent"],
  dependsOn: ["login.create_magic_link"],
  execute(input: Record<string, unknown>) {
    for (const key of ["chat_number","magic_link"]) {
      if (!Object.hasOwn(input, key)) throw new Error("login.send_magic_link: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["chat_number","magic_link"].includes(key)) throw new Error("login.send_magic_link: undeclared input " + key);
    }
    return { action_id: "login.send_magic_link", actor: "UserLoginIntent", output_keys: ["sent"] };
  }
};
export type loginSend_magic_linkImplementation = typeof implementation;
