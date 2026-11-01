#!/usr/bin/env node
/* eslint-disable @typescript-eslint/explicit-function-return-type */

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
  if (bumpType === 'current') {
    return currentVersion
  }

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

  if (/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(bumpType)) {
    return bumpType
  }

  throw new Error(
    `Invalid bump type or version "${bumpType}". Use "patch", "minor", "major", or a semver like "0.2.0".`
  )
}

console.log('\x1b[35m====================================================\x1b[0m')
console.log('\x1b[35m   Marg ERP - Local Build & Direct Release Pipeline \x1b[0m')
console.log('\x1b[35m====================================================\x1b[0m')

// 1. Run local verification checks before touching any code or git tags
run('npm run typecheck', '1/6 Verifying TypeScript types')
run('npm test', '2/6 Running unit tests')

// 2. Read current package.json and determine new version
const pkgRaw = fs.readFileSync(packageJsonPath, 'utf8')
const pkg = JSON.parse(pkgRaw)
const currentVersion = pkg.version || '0.1.0'
const bumpArg = process.argv[2] || 'patch'
const newVersion = bumpVersion(currentVersion, bumpArg)
const newTag = `v${newVersion}`

console.log(`\n\x1b[32m✔ Version bump: v${currentVersion} ➔ ${newTag}\x1b[0m`)

pkg.version = newVersion
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')

// 3. Build electron app & Windows installer locally
run('npm run build', '3/6 Compiling Vite & Electron application')
run('npx electron-builder --win', '4/6 Building Windows installer (.exe, blockmap, latest.yml)')

// 4. Git commit, tag, and push code
run('git add .', '5/6 Staging changes and package.json')

try {
  execSync(`git commit -m "release: ${newTag}"`, { stdio: 'inherit', cwd: rootDir })
} catch {
  console.log('No new code changes to commit, proceeding with tag...')
}

run(`git tag -a ${newTag} -m "Release ${newTag}"`, `Tagging ${newTag}`)
run('git push origin HEAD --tags', 'Pushing branch and tags to GitHub')

// 5. Upload release assets directly to GitHub using local gh CLI
const setupExe = path.join(rootDir, 'dist', `marg-erp-${newVersion}-setup.exe`)
const blockmap = path.join(rootDir, 'dist', `marg-erp-${newVersion}-setup.exe.blockmap`)
const latestYml = path.join(rootDir, 'dist', 'latest.yml')

const filesToUpload = [setupExe, blockmap, latestYml].filter((f) => fs.existsSync(f))

console.log('\n\x1b[36m▶ 6/6 Uploading release binaries directly to GitHub Releases...\x1b[0m')
const uploadArgs = filesToUpload.map((f) => `"${f}"`).join(' ')

let releaseExists = false
try {
  execSync(`gh release view ${newTag}`, { stdio: 'pipe', cwd: rootDir })
  releaseExists = true
} catch {
  releaseExists = false
}

if (releaseExists) {
  run(`gh release upload ${newTag} ${uploadArgs} --clobber`, `Uploading to existing release ${newTag}`)
} else {
  run(
    `gh release create ${newTag} ${uploadArgs} --title "Marg ERP ${newTag}" --notes "Direct local release ${newTag}"`,
    `Creating GitHub Release ${newTag}`
  )
}

console.log('\n\x1b[32m============================================================\x1b[0m')
console.log(`\x1b[32m  ✔ ${newTag} successfully built locally & published!        \x1b[0m`)
console.log('\x1b[32m============================================================\x1b[0m')
console.log(`  → Releases: https://github.com/dipantan/marg-erp/releases/tag/${newTag}`)
console.log('\x1b[32mClient apps will now receive this update directly.\x1b[0m\n')
