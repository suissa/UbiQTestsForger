export const implementation = {
  kind: "action" as const,
  id: "chatbot.check_active_session",
  actor: "ChatbotService",
  inputKeys: ["chat_number"],
  outputKeys: ["active"],
  dependsOn: ["chatbot.receive_message"],
  execute(input: Record<string, unknown>) {
    for (const key of ["chat_number"]) {
      if (!Object.hasOwn(input, key)) throw new Error("chatbot.check_active_session: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["chat_number"].includes(key)) throw new Error("chatbot.check_active_session: undeclared input " + key);
    }
    return { action_id: "chatbot.check_active_session", actor: "ChatbotService", output_keys: ["active"] };
  }
};
export type chatbotCheck_active_sessionImplementation = typeof implementation;
