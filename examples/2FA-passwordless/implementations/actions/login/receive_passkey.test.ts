import assert from "node:assert/strict";
import { implementation } from "./receive_passkey.ts";

const values = { passkey_credential: "passkey-credential-2fa-001" };
const context = { values, completedActions: ["login.send_magic_link"] };
const input = { passkey: values.passkey_credential };

assert.equal(implementation.id, "login.receive_passkey");
assert.equal(implementation.actor, "UserLoginIntent");
assert.deepEqual(implementation.inputKeys, ["passkey"]);
assert.deepEqual(implementation.outputKeys, ["received"]);
assert.deepEqual(implementation.dependsOn, ["login.send_magic_link"]);
assert.deepEqual(implementation.execute(input, context), { received: true });

assert.throws(() => implementation.execute({}, context), /missing input passkey/);
assert.throws(() => implementation.execute({ ...input, unexpected: true }, context), /undeclared input unexpected/);
assert.throws(() => implementation.execute(input, { values, completedActions: [] }), /unmet dependency login.send_magic_link/);
assert.throws(() => implementation.execute({ passkey: "" }, context), /passkey must be a non-empty string/);
assert.throws(() => implementation.execute({ passkey: "other-credential" }, context), /does not match the declared credential/);

console.log(JSON.stringify({ ok: true, action: implementation.id, cases: 6 }));
