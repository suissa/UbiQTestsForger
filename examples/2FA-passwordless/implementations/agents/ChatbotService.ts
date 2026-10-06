export const implementation = {
  kind: "agent" as const,
  id: "ChatbotService",
  role: "canonical inbound WhatsApp chatbot route",
  actionIds: ["chatbot.receive_message","chatbot.check_active_session","chatbot.create_magic_link","chatbot.send_magic_link"],
  dispatch(actionId: string) {
    if (!this.actionIds.includes(actionId)) throw new Error("ChatbotService: undeclared action " + actionId);
    return { actor: "ChatbotService", action_id: actionId };
  }
} as const;
