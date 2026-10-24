#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const packageJsonPath = path.join(rootDir, 'package.json')

function run(cmd, desc) {
  console.log(`\n\x1b[36m▶ ${desc || cmd}\x1b[0m`)
  try {
    execSync(cmd, { stdio: 'inherit', cwd: rootDir })
  } catch {
    console.error(`\x1b[31m✖ Command failed: ${cmd}\x1b[0m\n`)
    process.exit(1)
  }
}

function bumpVersion(currentVersion, bumpType = 'patch') {
  if (['patch', 'minor', 'major'].includes(bumpType)) {
    const parts = currentVersion.split('.').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) {
      throw new Error(`Invalid semver version in package.json: ${currentVersion}`)
    }
    let [major, minor, patch] = parts
    if (bumpType === 'major') {
      major += 1
      minor = 0
      patch = 0
    } else if (bumpType === 'minor') {
      minor += 1
      patch = 0
    } else {
      patch += 1
    }
    return `${major}.${minor}.${patch}`
  }

  // Explicit version provided (e.g., 0.2.0)
  if (/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(bumpType)) {
    return bumpType
  }

  throw new Error(`Invalid bump type or version "${bumpType}". Use "patch", "minor", "major", or a semver like "0.2.0".`)
}

console.log('\x1b[35m========================================\x1b[0m')
console.log('\x1b[35m   Marg ERP - Push & Release Pipeline   \x1b[0m')
console.log('\x1b[35m========================================\x1b[0m')

// 1. Run local verification checks before touching any code or git tags
run('pnpm run typecheck', '1/5 Checking TypeScript types')
run('pnpm test', '2/5 Running unit tests')
run('pnpm exec eslint --quiet .', '3/5 Running ESLint check')

// 2. Read current package.json and determine new version
const pkgRaw = fs.readFileSync(packageJsonPath, 'utf8')
const pkg = JSON.parse(pkgRaw)
const currentVersion = pkg.version || '0.1.0'
const bumpArg = process.argv[2] || 'patch'
const newVersion = bumpVersion(currentVersion, bumpArg)
const newTag = `v${newVersion}`

console.log(`\n\x1b[32m✔ Version bump: v${currentVersion} ➔ ${newTag}\x1b[0m`)

pkg.version = newVersion
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n')

// 3. Git commit, tag, and push
run('git add .', '4/5 Staging changes and package.json')

try {
  execSync(`git commit -m "release: ${newTag}"`, { stdio: 'inherit', cwd: rootDir })
} catch {
  console.log('No new code changes to commit, proceeding with tag...')
}

run(`git tag -a ${newTag} -m "Release ${newTag}"`, `Tagging ${newTag}`)
run('git push origin HEAD --tags', '5/5 Pushing branch and tags to GitHub')

console.log('\n\x1b[32m============================================================\x1b[0m')
console.log(`\x1b[32m  ✔ ${newTag} pushed successfully to GitHub!               \x1b[0m`)
console.log('\x1b[32m============================================================\x1b[0m')
console.log('\x1b[33mGitHub Actions is now building and releasing the Windows installer:\x1b[0m')
console.log('  → Actions:  https://github.com/dipantan/marg-erp/actions')
console.log(`  → Releases: https://github.com/dipantan/marg-erp/releases/tag/${newTag}`)
console.log('\x1b[32mClient apps will automatically receive the update once built.\x1b[0m\n')
