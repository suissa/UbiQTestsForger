export const implementation = {
  kind: "agent" as const,
  id: "UserGatewayAgent",
  role: "adapts authentication result to user channels",
  actionIds: ["user_gateway.adapt_web_result","user_gateway.adapt_whatsapp_result"],
  dispatch(actionId: string) {
    if (!this.actionIds.includes(actionId)) throw new Error("UserGatewayAgent: undeclared action " + actionId);
    return { actor: "UserGatewayAgent", action_id: actionId };
  }
} as const;
