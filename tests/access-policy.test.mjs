import assert from 'node:assert/strict';
import test from 'node:test';
import {effectivePlan,moduleAccess} from '../lib/access-policy.mjs';
import {modules} from '../lib/modules.js';
test('zero-credit Telegram member is FREE even with active promotional PRO window',()=>{
 assert.equal(effectivePlan({plan:'FREE',credits:0,promo_pro_until:'2099-01-01T00:00:00Z'},Date.parse('2026-11-18T00:00:00Z')),'FREE');
});
test('admin with credits retains promotional PRO and access',()=>{
 assert.equal(effectivePlan({plan:'FREE',credits:1000,promo_pro_until:'2099-01-01T00:00:00Z'},Date.parse('2026-11-18T00:00:00Z')),'PRO');
 for(const m of modules)assert.equal(moduleAccess({moduleId:m.id,enabled:true,credits:1000,isAdmin:true}),'available');
});
test('zero-credit member sees all modules but cannot execute any',()=>{
 assert.equal(modules.length,19);
 for(const m of modules)assert.notEqual(moduleAccess({moduleId:m.id,enabled:true,credits:0,isAdmin:false}),'available');
});
test('only administrators can use admin modules',()=>{
 for(const id of ['users','telegram','settings'])assert.equal(moduleAccess({moduleId:id,enabled:true,credits:1000,isAdmin:false}),'admin_only');
});
test('module OFF overrides admin privilege',()=>{
 assert.equal(moduleAccess({moduleId:'extractor',enabled:false,credits:1000,isAdmin:true}),'off');
});
test('funded members can access enabled non-admin modules',()=>{
 for(const m of modules.filter(x=>!['users','telegram','settings'].includes(x.id)))assert.equal(moduleAccess({moduleId:m.id,enabled:true,credits:1000,isAdmin:false}),'available');
});
test('zero-credit member is offered a recharge path',()=>{
 assert.equal(moduleAccess({moduleId:'extractor',enabled:true,credits:0,isAdmin:false}),'no_credits');
});
