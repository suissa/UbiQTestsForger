export const implementation = {
  kind: "agent" as const,
  id: "UserLoginIntent",
  role: "executes passwordless login behavior",
  actionIds: ["login.create_magic_link","login.send_magic_link","login.receive_passkey","login.validate_passkey"],
  dispatch(actionId: string) {
    if (!this.actionIds.includes(actionId)) throw new Error("UserLoginIntent: undeclared action " + actionId);
    return { actor: "UserLoginIntent", action_id: actionId };
  }
} as const;
