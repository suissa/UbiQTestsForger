import assert from "node:assert/strict";
import { implementation } from "./send_magic_link.ts";

const values = {
  whatsapp_number: "+5515999999999",
  magic_link: "https://auth.example.test/m/ML-2FA-001"
};
const context = { values, completedActions: ["login.create_magic_link"] };
const input = { chat_number: values.whatsapp_number, magic_link: values.magic_link };

assert.equal(implementation.id, "login.send_magic_link");
assert.equal(implementation.actor, "UserLoginIntent");
assert.deepEqual(implementation.inputKeys, ["chat_number", "magic_link"]);
assert.deepEqual(implementation.outputKeys, ["sent"]);
assert.deepEqual(implementation.dependsOn, ["login.create_magic_link"]);
assert.deepEqual(implementation.execute(input, context), { sent: true });

assert.throws(() => implementation.execute({ chat_number: input.chat_number }, context), /missing input magic_link/);
assert.throws(() => implementation.execute({ ...input, extra: true }, context), /undeclared input extra/);
assert.throws(() => implementation.execute(input, { values, completedActions: [] }), /unmet dependency login.create_magic_link/);
assert.throws(() => implementation.execute({ ...input, chat_number: "+5515888888888" }, context), /does not match the declared WhatsApp number/);
assert.throws(() => implementation.execute({ ...input, magic_link: "https://evil.example/link" }, context), /does not match the declared link/);
assert.throws(() => implementation.execute({ ...input, magic_link: "http://auth.example.test/m/ML-2FA-001" }, context), /does not match the declared link/);
assert.throws(() => implementation.execute({ ...input, magic_link: "not-a-url" }, { values: { ...values, magic_link: "not-a-url" }, completedActions: context.completedActions }), /must be a valid URL/);

console.log(JSON.stringify({ ok: true, action: implementation.id, cases: 8 }));
