import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('availability search checks preserved moderation challenges', async () => {
  const source = await read('../../app/page.tsx')
  assert.match(source, /getChallenge\(\s*validation\.canonical,?\s*\)/)
  assert.match(source, /challengeValue\.action === "suspend"/)
  assert.match(source, /sourceBackedReview=/)
})

test('registration modal blocks unchanged suspended profiles', async () => {
  const source = await read('../../components/RegisterModal.tsx')
  assert.match(source, /profilesEqual\(normalized, challengedProfile\)/)
  assert.match(source, /title="Source-backed review"/)
  assert.match(source, /Sign remediation request/)
})

test('record page prevents suspended owner release', async () => {
  const source = await read('../../app/name/[name]/page.tsx')
  assert.match(source, /disabled=\{record\.status === "suspended"\}/)
  assert.match(source, /Reinstate before release; evidence cannot be erased/)
  assert.match(source, /A suspended record cannot use/)
})

test('challenge form mirrors the contract evidence-source boundary', async () => {
  const source = await read('../../app/name/[name]/page.tsx')
  assert.match(source, /safeEvidenceUrl\(sourceUrl\)/)
  assert.match(source, /public HTTPS source with a DNS hostname/)
})
