import assert from "node:assert/strict";
import { implementation } from "./return_authenticated_result.ts";

const values = {
  session_id: "sess_2fa_001",
  login_result: "authenticated",
  web_message: "Login realizado com sucesso usando a passkey vinculada a este WhatsApp.",
  whatsapp_message: "Você acabou de fazer login com a passkey deste WhatsApp."
};
const context = { values, completedActions: ["web.receive_passkey_route"] };
const input = { session_id: values.session_id, result: values.login_result };

assert.equal(implementation.id, "gateway.return_authenticated_result");
assert.equal(implementation.actor, "GatewayPlane");
assert.deepEqual(implementation.inputKeys, ["session_id", "result"]);
assert.deepEqual(implementation.outputKeys, ["web", "whatsapp"]);
assert.deepEqual(implementation.dependsOn, ["web.receive_passkey_route"]);

assert.deepEqual(implementation.execute(input, context), {
  web: values.web_message,
  whatsapp: values.whatsapp_message
});

assert.throws(() => implementation.execute({ result: input.result }, context), /missing input session_id/);
assert.throws(() => implementation.execute({ ...input, extra: true }, context), /undeclared input extra/);
assert.throws(() => implementation.execute(input, { values, completedActions: [] }), /unmet dependency web.receive_passkey_route/);
assert.throws(() => implementation.execute({ ...input, result: "pending" }, context), /not the declared authenticated outcome/);

console.log(JSON.stringify({ ok: true, action: implementation.id, cases: 5 }));
