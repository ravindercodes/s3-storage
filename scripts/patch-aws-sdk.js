import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function patchAWSSDK() {
  try {
    const awsSdkPath = path.join(rootDir, 'node_modules', 'aws-sdk');
    
    if (!fs.existsSync(awsSdkPath)) {
      console.error('AWS SDK not found in node_modules');
      return false;
    }
    
    const libPath = path.join(awsSdkPath, 'lib');
    if (!fs.existsSync(libPath)) {
      console.error('AWS SDK lib directory not found');
      return false;
    }
    
    console.log('Patching AWS SDK for browser compatibility...');
    
    const files = [
      path.join(libPath, 'browser.js'),
      path.join(libPath, 'browser_loader.js'),
      path.join(libPath, 'core.js'),
      path.join(libPath, 'credentials.js')
    ];
    
    files.forEach(file => {
      if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        
        if (!content.includes('Object.prototype.hasOwnProperty.call')) {
          content = content.replace(
            /(var AWS\s*=\s*\{\s*util:\s*\{\s*}\s*\};)/,
            '$1\n\n// Polyfill for Object.prototype.hasOwnProperty.call\nAWS.util.hasOwnProperty = function(obj, prop) {\n  return Object.prototype.hasOwnProperty.call(obj, prop);\n};'
          );
          fs.writeFileSync(file, content);
          console.log(`Patched ${file}`);
        } else {
          console.log(`File ${file} already patched`);
        }
      } else {
        console.log(`File ${file} not found, skipping`);
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error patching AWS SDK:', error);
    return false;
  }
}

const success = patchAWSSDK();
process.exit(success ? 0 : 1);
