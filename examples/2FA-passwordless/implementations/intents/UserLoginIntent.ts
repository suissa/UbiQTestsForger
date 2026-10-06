export const implementation = {
  kind: "intent" as const,
  id: "UserLoginIntent",
  scenario: "2FA-passwordless",
  entryActor: "UserLoginIntent",
  channels: ["web", "whatsapp"] as const,
  actionIds: ["gateway.receive_whatsapp_number","gateway.validate_chat_number","gateway.check_whatsapp_exists","login.create_magic_link","login.send_magic_link","login.receive_passkey","login.validate_passkey","gateway.send_result_user_gateway","user_gateway.adapt_web_result","user_gateway.adapt_whatsapp_result","chatbot.receive_message","chatbot.check_active_session","chatbot.create_magic_link","chatbot.send_magic_link","web.receive_passkey_route","gateway.return_authenticated_result"],
  terminal: { authenticated: "authenticated" as const },
  forbidden: [
    "authenticate_without_passkey_validation",
    "authenticate_unvalidated_whatsapp_number",
    "skip_declared_dependency",
    "contradict_channel_result"
  ]
} as const;
