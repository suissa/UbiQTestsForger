export const implementation = {
  kind: "action" as const,
  id: "chatbot.receive_message",
  actor: "ChatbotService",
  inputKeys: ["chat_number","message"],
  outputKeys: ["received"],
  dependsOn: [],
  execute(input: Record<string, unknown>) {
    for (const key of ["chat_number","message"]) {
      if (!Object.hasOwn(input, key)) throw new Error("chatbot.receive_message: missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!["chat_number","message"].includes(key)) throw new Error("chatbot.receive_message: undeclared input " + key);
    }
    return { action_id: "chatbot.receive_message", actor: "ChatbotService", output_keys: ["received"] };
  }
};
export type chatbotReceive_messageImplementation = typeof implementation;
