import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const HOOKS_DIR = path.join(import.meta.dirname, '..')
const rules = fs.readdirSync(path.join(HOOKS_DIR, 'rules')).map((file) => path.basename(file, '.ts'))
const hooksJson = fs.readFileSync(path.join(HOOKS_DIR, 'hooks.json'), 'utf8')
const wired = [...hooksJson.matchAll(/rules\/([\w-]+)\.ts/g)].map((match) => match[1])

test('every rule has its own hook in hooks.json', () => {
  assert.deepStrictEqual(rules.filter((rule) => !wired.includes(rule)), [])
})

test('every hook in hooks.json points to a rule that exists', () => {
  assert.deepStrictEqual(wired.filter((rule) => !rules.includes(rule)), [])
})

test('every rule appears only once in hooks.json', () => {
  assert.strictEqual(new Set(wired).size, wired.length)
})

test('every rule has its own test', () => {
  const missing = rules.filter((rule) => !fs.existsSync(path.join(import.meta.dirname, `${rule}.test.ts`)))
  assert.deepStrictEqual(missing, [])
})

const SKILLS_DIR = path.join(HOOKS_DIR, '..', 'skills')
const PUBLIC_SKILLS = ['docker', 'create', 'tune', 'ci']
const skills = fs.readdirSync(SKILLS_DIR)
const skillText = (skill: string) => fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8')

test('only the hub, create, tune and ci appear in the / menu, and the sub-skills are private', () => {
  const hidden = skills.filter((skill) => /^user-invocable: false$/m.test(skillText(skill))).sort()
  assert.deepStrictEqual(hidden, skills.filter((skill) => !PUBLIC_SKILLS.includes(skill)).sort())
})

test('the hub lists exactly the private sub-skills', () => {
  const listed = [...skillText('docker').matchAll(/^\| `docker:([\w-]+)`/gm)].map((match) => match[1]).sort()
  assert.deepStrictEqual(listed, skills.filter((skill) => !PUBLIC_SKILLS.includes(skill)).sort())
})

test('every docker:<skill> reference in the skills points to a skill that exists', () => {
  const referenced = new Set(skills.flatMap((skill) => [...skillText(skill).matchAll(/`\/?docker:([\w-]+)/g)].map((match) => match[1])))
  assert.deepStrictEqual([...referenced].filter((skill) => !skills.includes(skill)), [])
})
