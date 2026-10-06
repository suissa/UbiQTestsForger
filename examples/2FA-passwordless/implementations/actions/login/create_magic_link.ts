export const implementation = {
  kind: "action" as const,
  id: "login.create_magic_link",
  actor: "UserLoginIntent",
  inputKeys: ["chat_number"],
  outputKeys: ["magic_link"],
  dependsOn: ["gateway.check_whatsapp_exists"],
  execute(input: Record<string, unknown>) {
    for (const key of ["chat_number"]) {
      if (!Object.hasOwn(input, key)) throw new Error("login.create_magic_link: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["chat_number"].includes(key)) throw new Error("login.create_magic_link: undeclared input " + key);
    }
    return { action_id: "login.create_magic_link", actor: "UserLoginIntent", output_keys: ["magic_link"] };
  }
};
export type loginCreate_magic_linkImplementation = typeof implementation;
