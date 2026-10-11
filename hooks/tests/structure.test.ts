import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const HOOKS_DIR = path.join(import.meta.dirname, '..')
const rules = fs.readdirSync(path.join(HOOKS_DIR, 'rules')).map((file) => path.basename(file, '.ts'))
const hooksJson = fs.readFileSync(path.join(HOOKS_DIR, 'hooks.json'), 'utf8')
const wired = [...hooksJson.matchAll(/rules\/([\w-]+)\.ts/g)].map((match) => match[1])

test('toda regra tem hook dedicado no hooks.json', () => {
  assert.deepStrictEqual(rules.filter((rule) => !wired.includes(rule)), [])
})

test('todo hook do hooks.json aponta para uma regra que existe', () => {
  assert.deepStrictEqual(wired.filter((rule) => !rules.includes(rule)), [])
})

test('cada regra aparece uma vez só no hooks.json', () => {
  assert.strictEqual(new Set(wired).size, wired.length)
})

test('toda regra tem teste próprio', () => {
  const missing = rules.filter((rule) => !fs.existsSync(path.join(import.meta.dirname, `${rule}.test.ts`)))
  assert.deepStrictEqual(missing, [])
})

const SKILLS_DIR = path.join(HOOKS_DIR, '..', 'skills')
const PUBLIC_SKILLS = ['docker', 'create', 'tune']
const skills = fs.readdirSync(SKILLS_DIR)
const skillText = (skill: string) => fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8')

test('só o hub, o create e o tune aparecem no menu de /; as sub-skills são privadas', () => {
  const hidden = skills.filter((skill) => /^user-invocable: false$/m.test(skillText(skill))).sort()
  assert.deepStrictEqual(hidden, skills.filter((skill) => !PUBLIC_SKILLS.includes(skill)).sort())
})

test('o hub lista exatamente as sub-skills privadas', () => {
  const listed = [...skillText('docker').matchAll(/^\| `docker:([\w-]+)`/gm)].map((match) => match[1]).sort()
  assert.deepStrictEqual(listed, skills.filter((skill) => !PUBLIC_SKILLS.includes(skill)).sort())
})

test('toda referência docker:<skill> nas skills aponta para uma skill que existe', () => {
  const referenced = new Set(skills.flatMap((skill) => [...skillText(skill).matchAll(/`\/?docker:([\w-]+)/g)].map((match) => match[1])))
  assert.deepStrictEqual([...referenced].filter((skill) => !skills.includes(skill)), [])
})
