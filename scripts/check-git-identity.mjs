import { execFileSync } from 'node:child_process'

const expectedEmail = '216713165+RohitChintalapudi@users.noreply.github.com'
const expectedName = 'Rohit Chintalapudi'

function gitConfig(key) {
  try {
    return execFileSync('git', ['config', key], { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

const name = gitConfig('user.name')
const email = gitConfig('user.email')
const ok = name === expectedName && email === expectedEmail

if (ok) {
  console.log('Git identity is linked to GitHub; new commits will count toward contributions.')
  process.exit(0)
}

console.error('Git identity is not linked to the current GitHub account.')
console.error(`Expected: ${expectedName} <${expectedEmail}>`)
console.error(`Found:    ${name || '(unset)'} <${email || '(unset)'}`)
console.error('Run: git config user.name "Rohit Chintalapudi"')
console.error(`     git config user.email "${expectedEmail}"`)
process.exit(1)
