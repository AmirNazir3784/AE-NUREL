// Step 5 (S5-36): small LOCAL common-password screen for sign-up and
// password change. Pure and offline — no network, no node_modules needed.
// The screen is wired into the Better Auth before-hook by the coordinator
// at merge time (see server/membership/password-policy.mjs); these tests
// pin the helper itself.
import {it} from 'node:test';
import assert from 'node:assert/strict';
import {COMMON_PASSWORDS, isCommonPassword, passwordPolicyMessage} from '../server/membership/password-policy.mjs';

it('rejects well-known common passwords, case-insensitively',()=>{
 for(const weak of ['password1234','Password1234','PASSWORD123456','qwerty123456','123456789012','letmein123456','welcome12345','admin12345678','aenural123456','aenuralpassword']){
  assert.equal(passwordPolicyMessage(weak),'Choose a less common password. This one is widely used and easy to guess.',weak);
  assert.equal(isCommonPassword(weak),true,weak);
 }
});
it('rejects repeated characters, repeated units and long runs/rows',()=>{
 assert.match(passwordPolicyMessage('aaaaaaaaaaaaaaaa'),/Repeating the same characters/);
 assert.match(passwordPolicyMessage('abcabcabcabc'),/Repeating the same characters/);
 assert.match(passwordPolicyMessage('121212121212'),/Repeating the same characters/);
 assert.match(passwordPolicyMessage('xyzabcdefgh1'),/in order/);
 assert.match(passwordPolicyMessage('9876543210ab'),/in order/);
 assert.match(passwordPolicyMessage('qwertyuiop12'),/keyboard/);
 assert.match(passwordPolicyMessage('asdfghjkl123'),/keyboard/);
});
it('accepts strong, non-patterned passwords',()=>{
 for(const strong of ['Correct-Horse-Battery-Staple-9','Tr0ub4dor&3xQ!','k7#mQ2!zLp9@w','aB3$fG7!kL2@q','winter-RAIN-42-mango']){
  assert.equal(passwordPolicyMessage(strong),null,strong);
  assert.equal(isCommonPassword(strong),false,strong);
 }
});
it('leaves short and non-string input to Better Auth length validation',()=>{
 for(const value of [undefined,null,42,'','short','password123']){
  assert.equal(passwordPolicyMessage(value),null,String(value));
  assert.equal(isCommonPassword(value),false,String(value));
 }
});
it('keeps the blocklist inside its lane (every entry passes the 12-char minimum)',()=>{
 assert.ok(COMMON_PASSWORDS.length >= 30);
 for(const entry of COMMON_PASSWORDS) assert.ok(entry.length >= 12,entry);
 assert.equal(new Set(COMMON_PASSWORDS.map(e=>e.toLowerCase())).size,COMMON_PASSWORDS.length);
});
