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

const ROOT = path.join(HOOKS_DIR, '..')
const SKILLS_DIR = path.join(ROOT, 'skills')
const ENTRY = ['ci', 'create', 'docker', 'tune']
const DESCRIPTION_LIMIT = 300
const skills = fs.readdirSync(SKILLS_DIR).sort()
const skillText = (skill: string) => fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8')
const REFERENCES_DIR = path.join(SKILLS_DIR, 'docker', 'references')
const references = fs.readdirSync(REFERENCES_DIR).map((file) => ({ file, name: path.basename(file, '.md'), text: fs.readFileSync(path.join(REFERENCES_DIR, file), 'utf8') }))

test('only the entry skills are visible to Claude', () => {
  const visible = skills.filter((skill) => !/^disable-model-invocation: true$/m.test(skillText(skill)))
  assert.deepStrictEqual(visible, ENTRY)
})

test('no skill uses user-invocable: false without disable-model-invocation: true', () => {
  const wrong = skills.filter((skill) => /^user-invocable: false$/m.test(skillText(skill)) && !/^disable-model-invocation: true$/m.test(skillText(skill)))
  assert.deepStrictEqual(wrong, [])
})

test('every description has 300 characters or fewer', () => {
  for (const skill of skills) {
    const description = skillText(skill).match(/^description: (.*)$/m)?.[1] ?? ''
    assert.ok(description.length > 0 && description.length <= DESCRIPTION_LIMIT, `${skill}: ${description.length}`)
    assert.doesNotMatch(description, /: /, `${skill}: a colon and a space break the YAML frontmatter`)
  }
})

test('the hub lists exactly the references', () => {
  const listed = [...skillText('docker').matchAll(/^\| `references\/([\w-]+)\.md`/gm)].map((match) => match[1]).sort()
  assert.deepStrictEqual(listed, references.map((reference) => reference.name).sort())
})

test('every reference is linked from a SKILL.md and links no other reference', () => {
  const skillFiles = skills.map(skillText).join('\n')
  for (const reference of references) {
    assert.ok(skillFiles.includes(`references/${reference.file}`), `${reference.file} is not linked`)
    assert.doesNotMatch(reference.text, /\]\([^)]*\.md/, `${reference.file} links another file`)
    assert.doesNotMatch(reference.text, /^---\n/, `${reference.file} has frontmatter`)
  }
})

test('every reference path in a SKILL.md points to a file that exists', () => {
  for (const skill of skills) {
    for (const [, link] of skillText(skill).matchAll(/`((?:\.\.\/docker\/)?references\/[\w-]+\.md)`/g)) {
      assert.ok(fs.existsSync(path.join(SKILLS_DIR, skill, link)), `${skill}: ${link}`)
    }
  }
})

test('a reference with more than 100 lines starts with a table of contents', () => {
  for (const reference of references.filter((item) => item.text.split('\n').length > 100)) {
    assert.match(reference.text.slice(0, 600), /^## Contents$/m, reference.file)
  }
})

test('every docker:<skill> name points to an entry skill', () => {
  const files = [...skills.map(skillText), ...references.map((reference) => reference.text), ...['README.md', 'USAGE.md', '.claude-plugin/plugin.json'].map((file) => fs.readFileSync(path.join(ROOT, file), 'utf8'))]
  const named = new Set(files.flatMap((text) => [...text.matchAll(/`\/?docker:([\w-]+)/g)].map((match) => match[1])))
  assert.deepStrictEqual([...named].filter((name) => !ENTRY.includes(name) && !rules.includes(name)), [])
})

test('no file names a moved skill as docker:<name>', () => {
  const files = [...skills.map(skillText), ...references.map((reference) => reference.text), ...['README.md', 'USAGE.md', '.claude-plugin/plugin.json', 'hooks/hooks.json'].map((file) => fs.readFileSync(path.join(ROOT, file), 'utf8')), ...rules.map((rule) => fs.readFileSync(path.join(HOOKS_DIR, 'rules', `${rule}.ts`), 'utf8'))]
  for (const { name } of references) {
    for (const text of files) assert.doesNotMatch(text, new RegExp(`docker:${name}\\b(?!-)`), name)
  }
})
