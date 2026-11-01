#!/usr/bin/env node
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const releaseNotesPath = path.join(rootDir, 'RELEASE_NOTES.md')
const changelogPath = path.join(rootDir, 'CHANGELOG.md')

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

// 1. Read Release Notes from RELEASE_NOTES.md if available
let fileNotes = ''
if (fs.existsSync(releaseNotesPath)) {
  const content = fs.readFileSync(releaseNotesPath, 'utf8').trim()
  // Filter out guidance placeholder header if unchanged
  const filtered = content
    .split('\n')
    .filter((line) => {
      const l = line.trim().toLowerCase()
      return !l.startsWith('# what\'s new') && !l.includes('write your release notes here')
    })
    .join('\n')
    .trim()

  if (filtered && filtered !== '-') {
    fileNotes = filtered
  }
}

// 2. Parse optional command line argument for bump type (e.g. `yarn release minor`)
const rawArgs = process.argv.slice(2)
let bumpArg = 'patch'
let cliNotes = ''

if (rawArgs.length > 0) {
  const first = rawArgs[0].toLowerCase()
  if (['patch', 'minor', 'major', 'current'].includes(first)) {
    bumpArg = first
    cliNotes = rawArgs.slice(1).join(' ').trim()
  } else {
    cliNotes = rawArgs.join(' ').trim()
  }
}

const activeNotes = fileNotes || cliNotes

console.log('\x1b[35m====================================================\x1b[0m')
console.log('\x1b[35m   Marg ERP - Local Build & Direct Release Pipeline \x1b[0m')
console.log('\x1b[35m====================================================\x1b[0m')

// Verification checks
run('npm run typecheck', '1/6 Verifying TypeScript types')
run('npm test', '2/6 Running unit tests')

// Read current package.json and determine new version
const pkgRaw = fs.readFileSync(packageJsonPath, 'utf8')
const pkg = JSON.parse(pkgRaw)
const currentVersion = pkg.version || '0.1.0'
const newVersion = bumpVersion(currentVersion, bumpArg)
const newTag = `v${newVersion}`

console.log(`\n\x1b[32m✔ Version bump: v${currentVersion} ➔ ${newTag}\x1b[0m`)
if (fileNotes) {
  console.log(`\x1b[33m📝 Using release notes from RELEASE_NOTES.md\x1b[0m`)
} else if (cliNotes) {
  console.log(`\x1b[33m📝 Using release notes from command line argument\x1b[0m`)
}

pkg.version = newVersion
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')

// Build electron app & Windows installer locally
run('npm run build', '3/6 Compiling Vite & Electron application')
run('npx electron-builder --win', '4/6 Building Windows installer (.exe, blockmap, latest.yml)')

// Git commit, tag, and push code
run('git add .', '5/6 Staging changes, package.json and RELEASE_NOTES.md')

const firstLine = activeNotes ? activeNotes.split('\n')[0].replace(/^[-*#\s]+/, '').trim() : ''
const commitMsg = firstLine
  ? `release: ${newTag} - ${firstLine.replace(/"/g, "'")}`
  : `release: ${newTag}`

try {
  execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit', cwd: rootDir })
} catch {
  console.log('No new code changes to commit, proceeding with tag...')
}

run(`git tag -a ${newTag} -m "Release ${newTag}"`, `Tagging ${newTag}`)
run('git push origin HEAD --tags', 'Pushing branch and tags to GitHub')

// Prepare Markdown Release Notes for GitHub
let releaseNotesContent = `## What's New in ${newTag}\n\n`
if (activeNotes) {
  const lines = activeNotes.split('\n').map((l) => l.trim()).filter(Boolean)
  const bullets = lines.map((l) => (l.startsWith('-') || l.startsWith('*') ? l : `- ${l}`)).join('\n')
  releaseNotesContent += `${bullets}\n\n`
} else {
  try {
    const recentCommits = execSync(`git log v${currentVersion}..HEAD --oneline --no-merges`, { cwd: rootDir })
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean)
      .slice(0, 8)
      .map((c) => `- ${c.replace(/^[a-f0-9]+ /, '')}`)
      .join('\n')
    releaseNotesContent += recentCommits ? `${recentCommits}\n\n` : `- Maintenance, performance, and UI updates.\n\n`
  } catch {
    releaseNotesContent += `- Maintenance, performance, and UI updates.\n\n`
  }
}

releaseNotesContent += `### System Compatibility\n- **Operating System**: Windows 10 / 11 (64-bit)\n- **Database Engine**: Local SQLite 3 WAL Engine\n- **Package Format**: Standalone Offline NSIS Setup\n`

const tempNotesFile = path.join(rootDir, 'dist', 'release-notes.md')
fs.writeFileSync(tempNotesFile, releaseNotesContent, 'utf8')

// Archive to CHANGELOG.md
try {
  const dateStr = new Date().toISOString().split('T')[0]
  const changelogEntry = `\n## [${newTag}] - ${dateStr}\n\n${activeNotes || 'Maintenance updates.'}\n`
  if (fs.existsSync(changelogPath)) {
    const oldChangelog = fs.readFileSync(changelogPath, 'utf8')
    fs.writeFileSync(changelogPath, changelogEntry + '\n' + oldChangelog, 'utf8')
  } else {
    fs.writeFileSync(changelogPath, `# Marg ERP Changelog\n${changelogEntry}`, 'utf8')
  }
} catch (e) {
  console.warn('Could not update CHANGELOG.md:', e.message)
}

// Reset RELEASE_NOTES.md template for next release
const nextTemplate = `# What's New in this Release\n\nWrite your release notes here before running \`yarn release\`:\n- \n`
fs.writeFileSync(releaseNotesPath, nextTemplate, 'utf8')

// Upload release assets directly to GitHub using local gh CLI
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
  run(
    `gh release upload ${newTag} ${uploadArgs} --clobber`,
    `Uploading assets to existing release ${newTag}`
  )
} else {
  run(
    `gh release create ${newTag} ${uploadArgs} --title "Marg ERP ${newTag}" --notes-file "${tempNotesFile}"`,
    `Creating GitHub Release ${newTag}`
  )
}

console.log('\n\x1b[32m============================================================\x1b[0m')
console.log(`\x1b[32m  ✔ ${newTag} successfully built locally & published!        \x1b[0m`)
console.log('\x1b[32m============================================================\x1b[0m')
console.log(`  → Releases: https://github.com/dipantan/marg-erp/releases/tag/${newTag}`)
console.log('\x1b[32mClient apps will now receive this update directly.\x1b[0m\n')
