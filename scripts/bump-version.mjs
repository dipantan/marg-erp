import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const packageJsonPath = path.join(rootDir, 'package.json')

try {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const currentVersion = pkg.version || '0.1.0'

  const parts = currentVersion.split('.').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid semver version in package.json: ${currentVersion}`)
  }

  let [major, minor, patch] = parts
  const bumpType = process.argv[2] || 'patch'

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

  const newVersion = `${major}.${minor}.${patch}`
  pkg.version = newVersion

  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  console.log(`\x1b[32m✔ Version bumped: v${currentVersion} ➔ v${newVersion}\x1b[0m`)
} catch (err) {
  console.error('\x1b[31m✖ Failed to bump version:\x1b[0m', err.message)
  process.exit(1)
}
