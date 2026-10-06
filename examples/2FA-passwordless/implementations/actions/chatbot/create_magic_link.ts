export const implementation = {
  kind: "action" as const,
  id: "chatbot.create_magic_link",
  actor: "ChatbotService",
  inputKeys: ["chat_number"],
  outputKeys: ["magic_link"],
  dependsOn: ["chatbot.check_active_session"],
  execute(input: Record<string, unknown>) {
    for (const key of ["chat_number"]) {
      if (!Object.hasOwn(input, key)) throw new Error("chatbot.create_magic_link: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["chat_number"].includes(key)) throw new Error("chatbot.create_magic_link: undeclared input " + key);
    }
    return { action_id: "chatbot.create_magic_link", actor: "ChatbotService", output_keys: ["magic_link"] };
  }
};
export type chatbotCreate_magic_linkImplementation = typeof implementation;
