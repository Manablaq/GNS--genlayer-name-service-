import test from 'node:test'
import assert from 'node:assert/strict'
import { displayName, pageOffset, resolvedAddressChanged, safeExternalUrl, validateName } from '../../lib/domain.ts'
import { addRecentSearch, parseRecentSearches } from '../../lib/recent.ts'

test('name normalization and display mirror contract rules',()=>{assert.deepEqual(validateName(' Alice.GEN '),{valid:true,canonical:'alice',display:'alice.gen'});assert.equal(displayName('ALICE'),'alice.gen');assert.equal(validateName('-alice').valid,false);assert.equal(validateName('alice--bob').valid,false);assert.equal(validateName('admin').reserved,true)})
test('recent search storage rejects malformed data and deduplicates',()=>{assert.deepEqual(parseRecentSearches('{bad'),[]);assert.deepEqual(parseRecentSearches('["alice","-bad",4,"bob.gen"]'),['alice','bob.gen']);assert.deepEqual(addRecentSearch(['alice','bob'],'bob'),['bob','alice'])})
test('external URL validation rejects unsafe schemes and credentials',()=>{assert.equal(safeExternalUrl('javascript:alert(1)'),null);assert.equal(safeExternalUrl('https://user:pass@example.com'),null);assert.equal(safeExternalUrl('https://example.com/a'),'https://example.com/a')})
test('direct-send revalidation detects case-insensitive address changes',()=>{const a='0x'+'1'.repeat(40);assert.equal(resolvedAddressChanged(a,a.toUpperCase().replace('0X','0x')),false);assert.equal(resolvedAddressChanged(a,'0x'+'2'.repeat(40)),true)})
test('owner pagination produces bounded offsets',()=>{assert.equal(pageOffset(1,12),0);assert.equal(pageOffset(3,12),24);assert.equal(pageOffset(2,100),50)})
test('reduced-motion CSS is present and disables reveal transforms',async()=>{const css=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../../app/globals.css',import.meta.url),'utf8'));assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/\.reveal\{opacity:1;transform:none\}/)})
