import fs from 'fs/promises';
import path from 'path';

async function walk(dir, call) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      await walk(path.join(dir, file.name), call);
    } else {
      await call(path.join(dir, file.name));
    }
  }
}

async function run() {
  await walk('./src', async (filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      let code = await fs.readFile(filePath, 'utf-8');
      const originalCode = code;

      // replace .tsx with .jsx in imports
      code = code.replace(/from\s+['"]([^'"]+)\.tsx['"]/g, 'from \'$1.jsx\'');
      code = code.replace(/import\s+['"]([^'"]+)\.tsx['"]/g, 'import \'$1.jsx\'');
      
      // replace .ts with .js in imports
      code = code.replace(/from\s+['"]([^'"]+)\.ts['"]/g, 'from \'$1.js\'');
      code = code.replace(/import\s+['"]([^'"]+)\.ts['"]/g, 'import \'$1.js\'');
      
      if (code !== originalCode) {
        await fs.writeFile(filePath, code);
        console.log(`Updated imports in: ${filePath}`);
      }
    }
  });
}
run();
