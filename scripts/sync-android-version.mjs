import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const packageJsonPath = join(process.cwd(), 'package.json');
const variablesGradlePath = join(process.cwd(), 'android', 'variables.gradle');

try {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version; // e.g., "1.0.0"

  // Split version into major, minor, patch
  const [major, minor, patch] = version.split('.').map(Number);

  // Calculate versionCode: major * 10000 + minor * 100 + patch
  // This gives us a monotonic integer that increases with semantic versioning.
  // 1.0.0 -> 10000
  // 1.2.3 -> 10203
  const versionCode = (major * 10000) + (minor * 100) + patch;

  console.log(`Syncing version to Android: versionName="${version}", versionCode=${versionCode}`);

  let gradleContent = readFileSync(variablesGradlePath, 'utf8');

  // Update or add versionName and versionCode in variables.gradle
  if (gradleContent.includes('versionName =')) {
    gradleContent = gradleContent.replace(/versionName\s*=\s*['"].*?['"]/, `versionName = '${version}'`);
  } else {
    gradleContent = gradleContent.replace(/ext\s*{/, `ext {\n    versionName = '${version}'`);
  }

  if (gradleContent.includes('versionCode =')) {
    gradleContent = gradleContent.replace(/versionCode\s*=\s*\d+/, `versionCode = ${versionCode}`);
  } else {
    gradleContent = gradleContent.replace(/ext\s*{/, `ext {\n    versionCode = ${versionCode}`);
  }

  writeFileSync(variablesGradlePath, gradleContent);
  console.log('Successfully updated android/variables.gradle');

} catch (error) {
  console.error('Error syncing version:', error.message);
  process.exit(1);
}
