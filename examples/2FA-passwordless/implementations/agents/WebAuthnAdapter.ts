export const implementation = {
  kind: "agent" as const,
  id: "WebAuthnAdapter",
  role: "passkey authentication",
  actionIds: ["login.receive_passkey","login.validate_passkey","web.receive_passkey_route"],
  dispatch(actionId: string) {
    if (!this.actionIds.includes(actionId)) throw new Error("WebAuthnAdapter: undeclared action " + actionId);
    return { actor: "WebAuthnAdapter", action_id: actionId };
  }
} as const;
