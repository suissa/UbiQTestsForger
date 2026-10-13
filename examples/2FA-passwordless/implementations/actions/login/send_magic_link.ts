export interface LoginSendMagicLinkContext {
  values: Record<string, unknown>;
  completedActions: readonly string[];
}

const actionId = "login.send_magic_link";
const actorId = "UserLoginIntent";
const inputKeys = ["chat_number", "magic_link"] as const;
const outputKeys = ["sent"] as const;
const dependsOn = ["login.create_magic_link"] as const;

export const implementation = {
  kind: "action" as const,
  id: actionId,
  actor: actorId,
  inputKeys,
  outputKeys,
  dependsOn,
  execute(input: Record<string, unknown>, context: LoginSendMagicLinkContext) {
    for (const key of inputKeys) {
      if (!Object.hasOwn(input, key)) throw new Error(actionId + ": missing input " + key);
    }
    for (const key of Object.keys(input)) {
      if (!(inputKeys as readonly string[]).includes(key)) throw new Error(actionId + ": undeclared input " + key);
    }
    for (const dependency of dependsOn) {
      if (!context.completedActions.includes(dependency)) throw new Error(actionId + ": unmet dependency " + dependency);
    }

    if (typeof input.chat_number !== "string" || input.chat_number.length === 0)
      throw new Error(actionId + ": chat_number must be a non-empty string");
    if (input.chat_number !== context.values.whatsapp_number)
      throw new Error(actionId + ": chat_number does not match the declared WhatsApp number");
    if (typeof input.magic_link !== "string" || input.magic_link.length === 0)
      throw new Error(actionId + ": magic_link must be a non-empty string");
    if (input.magic_link !== context.values.magic_link)
      throw new Error(actionId + ": magic_link does not match the declared link");
    let parsedLink: URL;
    try {
      parsedLink = new URL(input.magic_link);
    } catch {
      throw new Error(actionId + ": magic_link must be a valid URL");
    }
    if (parsedLink.protocol !== "https:" || parsedLink.username || parsedLink.password)
      throw new Error(actionId + ": magic_link must use HTTPS and contain no URL credentials");

    return { sent: true };
  }
};

export type loginSend_magic_linkImplementation = typeof implementation;
