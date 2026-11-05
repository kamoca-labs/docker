import fs from 'node:fs'
import path from 'node:path'

const skillsDir = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..'), 'skills')
const visible = fs.readdirSync(skillsDir)
  .map((skill) => ({ skill, text: fs.readFileSync(path.join(skillsDir, skill, 'SKILL.md'), 'utf8') }))
  .filter(({ text }) => !/^disable-model-invocation: true$/m.test(text))
  .map(({ skill, text }) => ({ skill, characters: text.match(/^description: (.*)$/m)?.[1].length ?? 0 }))

for (const { skill, characters } of visible) console.log(`${String(characters).padStart(5)}  ${skill}`)
console.log(`${visible.length} skills visible to Claude, ${visible.reduce((sum, { characters }) => sum + characters, 0)} description characters`)
