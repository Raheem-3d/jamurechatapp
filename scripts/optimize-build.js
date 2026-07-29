#!/usr/bin/env node

/**
 * Optimization script to reduce Electron app bundle size
 * Removes unnecessary files and dev dependencies before building
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const NODE_MODULES = path.join(ROOT_DIR, 'node_modules');

console.log('🔧 Starting Electron app size optimization...\n');

// Directories and files to completely remove from node_modules
// CRITICAL: Only remove what's truly not needed at runtime or for final build
const REMOVE_ENTIRELY = [
  // Build tools NOT needed for electron-builder
  'esbuild',
  '@esbuild',
  'webpack',
  'terser',
  'rollup',
  
  // Dev dependencies
  '@types',
  'typescript',
  'tslint',
  'prettier',
  'eslint',
  '@typescript-eslint',
  
  // Installer tools (only after final exe is created - DON'T remove during build)
  // '7zip-bin',  -- KEEP: needed by electron-builder
  // 'app-builder-bin',  -- KEEP: needed by electron-builder
  // 'electron-builder-bin',  -- KEEP: needed by electron-builder
  'electron-winstaller',
  
  // Test frameworks (never used in prod)
  'vitest',
  'jest',
  '@testing-library',
  'chai',
  'mocha',
  'ava',
  'tap',
  
  // Documentation tools
  'docusaurus',
  'storybook',
  'typedoc',
];

// Files/patterns to remove from kept modules
const REMOVE_PATTERNS = [
  '**/test',
  '**/tests',
  '**/spec',
  '**/specs',
  '**/example',
  '**/examples',
  '**/demo',
  '**/docs',
  '**/.github',
  '**/.gitignore',
  '**/.npmignore',
  '**/.babelrc',
  '**/.eslintrc*',
  '**/*.md',
  '**/*.markdown',
  '**/README*',
  '**/CHANGELOG*',
  '**/LICENSE*',
  '**/HISTORY*',
  '**/AUTHORS*',
  '**/CONTRIBUTORS*',
  '**/.editorconfig',
  '**/.prettierrc',
  '**/rollup.config.js',
  '**/webpack.config.js',
  '**/jest.config.js',
  '**/tsconfig.json',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/*.map',
  '**/*.d.ts.map',
  '**/dist',
  '**/build',
];

function removeFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
      return true;
    }
  } catch (e) {
    console.error(`Failed to remove ${filePath}: ${e.message}`);
  }
  return false;
}

function getDirectorySize(dirPath) {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        size += getDirectorySize(fullPath);
      } else {
        size += fs.statSync(fullPath).size;
      }
    }
  } catch (e) {
    // ignore
  }
  return size;
}

// Step 1: Remove entirely unnecessary modules
console.log('📦 Removing unnecessary modules...');
let removed = 0;
for (const module of REMOVE_ENTIRELY) {
  const modulePath = path.join(NODE_MODULES, module);
  if (fs.existsSync(modulePath)) {
    removeFile(modulePath);
    removed++;
    console.log(`  ✓ Removed ${module}`);
  }
}
console.log(`\n✅ Removed ${removed} unnecessary modules\n`);

// Step 2: Clean up test/doc files from remaining modules
console.log('🧹 Cleaning up test files and documentation...');
let cleaned = 0;
const nodeModuleContents = fs.readdirSync(NODE_MODULES);
const glob = require('glob');

for (const moduleName of nodeModuleContents) {
  if (moduleName.startsWith('.')) continue;
  
  const modulePath = path.join(NODE_MODULES, moduleName);
  const stat = fs.statSync(modulePath);
  if (!stat.isDirectory()) continue;

  for (const pattern of REMOVE_PATTERNS) {
    try {
      const matches = glob.sync(pattern, {
        cwd: modulePath,
        absolute: true,
        nodir: false,
        ignore: '**/node_modules/**'
      });
      
      for (const match of matches) {
        if (removeFile(match)) {
          cleaned++;
        }
      }
    } catch (e) {
      // ignore glob errors
    }
  }
}
console.log(`✅ Cleaned up ${cleaned} files\n`);

// Step 3: Purge optional dependencies that might have been installed
console.log('🗑️  Pruning optional dependencies...');
try {
  execSync('npm prune --production', { cwd: ROOT_DIR, stdio: 'inherit' });
  console.log('✅ Pruned dev dependencies\n');
} catch (e) {
  console.warn('⚠️  npm prune failed, continuing...\n');
}

// Step 4: Summary
console.log('📊 Size summary before build:');
const sizesBefore = {
  'node_modules': getDirectorySize(NODE_MODULES),
  '.next': fs.existsSync(path.join(ROOT_DIR, '.next')) ? getDirectorySize(path.join(ROOT_DIR, '.next')) : 0,
};

Object.entries(sizesBefore).forEach(([name, bytes]) => {
  const mb = (bytes / (1024 * 1024)).toFixed(2);
  console.log(`  ${name}: ${mb} MB`);
});

