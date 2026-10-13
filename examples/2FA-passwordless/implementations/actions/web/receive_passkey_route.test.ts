import assert from "node:assert/strict";
import { implementation } from "./receive_passkey_route.ts";

const values = {
  passkey_credential: "passkey-credential-2fa-001",
  whatsapp_number: "+5515999999999",
  login_result: "authenticated"
};
const context = { values, completedActions: ["login.validate_passkey"] };
const input = { passkey: values.passkey_credential, chat_number: values.whatsapp_number };

assert.equal(implementation.id, "web.receive_passkey_route");
assert.equal(implementation.actor, "GatewayPlane");
assert.deepEqual(implementation.inputKeys, ["passkey", "chat_number"]);
assert.deepEqual(implementation.outputKeys, ["validated"]);
assert.deepEqual(implementation.dependsOn, ["login.validate_passkey"]);
assert.deepEqual(implementation.execute(input, context), { validated: "authenticated" });

assert.throws(() => implementation.execute({ chat_number: input.chat_number }, context), /missing input passkey/);
assert.throws(() => implementation.execute({ ...input, extra: true }, context), /undeclared input extra/);
assert.throws(() => implementation.execute(input, { values, completedActions: [] }), /unmet dependency login.validate_passkey/);
assert.throws(() => implementation.execute({ ...input, passkey: "unlisted-credential" }, context), /does not match the declared credential/);
assert.throws(() => implementation.execute(input, { values: { ...values, login_result: "pending" }, completedActions: context.completedActions }), /did not produce the declared authenticated outcome/);

console.log(JSON.stringify({ ok: true, action: implementation.id, cases: 6 }));
