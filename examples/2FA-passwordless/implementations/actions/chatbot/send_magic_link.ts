export const implementation = {
  kind: "action" as const,
  id: "chatbot.send_magic_link",
  actor: "ChatbotService",
  inputKeys: ["chat_number","magic_link"],
  outputKeys: ["sent"],
  dependsOn: ["chatbot.create_magic_link"],
  execute(input: Record<string, unknown>) {
    for (const key of ["chat_number","magic_link"]) {
      if (!Object.hasOwn(input, key)) throw new Error("chatbot.send_magic_link: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["chat_number","magic_link"].includes(key)) throw new Error("chatbot.send_magic_link: undeclared input " + key);
    }
    return { action_id: "chatbot.send_magic_link", actor: "ChatbotService", output_keys: ["sent"] };
  }
};
export type chatbotSend_magic_linkImplementation = typeof implementation;
