import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking project for potential build issues...');

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const awsVersion = packageJson.dependencies['aws-sdk'];
console.log(`✓ AWS SDK version: ${awsVersion}`);

const viteConfig = fs.readFileSync('./vite.config.ts', 'utf8');
if (!viteConfig.includes('global: ')) {
  console.warn('⚠️ Vite config is missing global definition');
} else {
  console.log('✓ Vite config has global definition');
}

if (!viteConfig.includes('manualChunks')) {
  console.warn('⚠️ Vite config is missing manualChunks optimization');
} else {
  console.log('✓ Vite config has manual chunks optimization');
}

const indexHtml = fs.readFileSync('./index.html', 'utf8');
if (!indexHtml.includes('window.global = window')) {
  console.warn('⚠️ index.html is missing global polyfill');
} else {
  console.log('✓ index.html has global polyfill');
}

let foundAsyncIssue = false;
const srcDir = './src';

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const asyncEffectRegex = /useEffect\(\s*async\s*\(\)\s*=>/g;
  
  if (asyncEffectRegex.test(content)) {
    console.warn(`⚠️ Found direct async function in useEffect in: ${filePath}`);
    foundAsyncIssue = true;
  }
  
  const promiseInJsxRegex = /{.*await.*}/g;
  if (promiseInJsxRegex.test(content)) {
    console.warn(`⚠️ Possible Promise in JSX in: ${filePath}`);
    foundAsyncIssue = true;
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (stat.isFile() && (filePath.endsWith('.tsx') || filePath.endsWith('.ts'))) {
      checkFile(filePath);
    }
  });
}

walkDir(srcDir);

if (!foundAsyncIssue) {
  console.log('✓ No direct async functions in useEffect hooks');
}

console.log('✅ Pre-build checks completed');
console.log('You can now run: npm run build');
