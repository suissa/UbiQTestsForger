export const implementation = {
  kind: "agent" as const,
  id: "GatewayPlane",
  role: "receives canonical requests and orchestrates",
  actionIds: ["gateway.receive_whatsapp_number","gateway.validate_chat_number","gateway.check_whatsapp_exists","gateway.send_result_user_gateway","web.receive_passkey_route","gateway.return_authenticated_result"],
  dispatch(actionId: string) {
    if (!this.actionIds.includes(actionId)) throw new Error("GatewayPlane: undeclared action " + actionId);
    return { actor: "GatewayPlane", action_id: actionId };
  }
} as const;
