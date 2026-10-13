import assert from "node:assert/strict";
import { implementation } from "./validate_passkey.ts";

const values = {
  passkey_credential: "passkey-credential-2fa-001",
  session_id: "sess_2fa_001",
  login_result: "authenticated"
};
const context = { values, completedActions: ["login.receive_passkey"] };
const input = { passkey: values.passkey_credential, session_id: values.session_id };

assert.equal(implementation.id, "login.validate_passkey");
assert.equal(implementation.actor, "UserLoginIntent");
assert.deepEqual(implementation.inputKeys, ["passkey", "session_id"]);
assert.deepEqual(implementation.outputKeys, ["authenticated"]);
assert.deepEqual(implementation.dependsOn, ["login.receive_passkey"]);
assert.deepEqual(implementation.execute(input, context), { authenticated: "authenticated" });

assert.throws(() => implementation.execute({ passkey: input.passkey }, context), /missing input session_id/);
assert.throws(() => implementation.execute({ ...input, unexpected: true }, context), /undeclared input unexpected/);
assert.throws(() => implementation.execute(input, { values, completedActions: [] }), /unmet dependency login.receive_passkey/);
assert.throws(() => implementation.execute({ ...input, passkey: "unknown-credential" }, context), /does not match the declared credential/);
assert.throws(() => implementation.execute({ ...input, session_id: "sess_other" }, context), /does not match the declared session/);
assert.throws(() => implementation.execute(input, { values: { ...values, login_result: "pending" }, completedActions: context.completedActions }), /declared result is not authenticated/);

console.log(JSON.stringify({ ok: true, action: implementation.id, cases: 7 }));
