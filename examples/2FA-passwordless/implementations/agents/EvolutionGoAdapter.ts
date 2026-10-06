export const implementation = {
  kind: "agent" as const,
  id: "EvolutionGoAdapter",
  role: "WhatsApp existence and message transport",
  actionIds: ["gateway.check_whatsapp_exists","login.send_magic_link","chatbot.send_magic_link"],
  dispatch(actionId: string) {
    if (!this.actionIds.includes(actionId)) throw new Error("EvolutionGoAdapter: undeclared action " + actionId);
    return { actor: "EvolutionGoAdapter", action_id: actionId };
  }
} as const;
