import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {modules} from '../lib/modules.js';

const iconsSource=readFileSync(new URL('../lib/module-icons.js',import.meta.url),'utf8');
const memberSource=readFileSync(new URL('../app/member/page.js',import.meta.url),'utf8');
const adminSource=readFileSync(new URL('../app/admin/dashboard/page.js',import.meta.url),'utf8');

test('every registered module has an explicit semantic icon',()=>{
 const ids=[...iconsSource.matchAll(/^\s*([a-z][a-z0-9]*):[A-Z][A-Za-z0-9]+,?\s*$/gm)].map(m=>m[1]);
 assert.equal(ids.length,modules.length);
 assert.deepEqual([...new Set(ids)].sort(),modules.map(m=>m.id).sort());
});
test('tool icons are never the generic Settings icon',()=>{
 const mapping=Object.fromEntries([...iconsSource.matchAll(/^\s*([a-z][a-z0-9]*):([A-Z][A-Za-z0-9]+),?\s*$/gm)].map(m=>[m[1],m[2]]));
 for(const m of modules.filter(x=>['Ferramentas','Checkers legados'].includes(x.group))){
  assert.notEqual(mapping[m.id],'Settings',m.id);
  assert.notEqual(mapping[m.id],'Boxes',m.id);
 }
});
test('member and admin sidebars render icons from the same module mapping',()=>{
 assert.match(memberSource,/icon:iconForModule\(m\.id\)/);
 for(const m of modules.filter(x=>['Ferramentas','Checkers legados'].includes(x.group))){
  assert.ok(adminSource.includes("icon:iconForModule('"+m.id+"')"),'admin missing icon '+m.id);
 }
});
