import fs from 'fs/promises';
import path from 'path';
import babel from '@babel/core';
import prettier from 'prettier';

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
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      if (filePath.endsWith('.d.ts')) return;

      const code = await fs.readFile(filePath, 'utf-8');
      try {
        const result = await babel.transformAsync(code, {
          filename: filePath,
          plugins: [
            ['@babel/plugin-transform-typescript', { isTSX: true, allExtensions: true }]
          ],
          sourceType: 'module'
        });
        
        const formatted = await prettier.format(result.code, {
          parser: 'babel',
          singleQuote: true,
          trailingComma: 'es5'
        });

        const newExt = filePath.endsWith('.tsx') ? '.jsx' : '.js';
        const newPath = filePath.replace(/\.tsx?$/, newExt);
        
        await fs.writeFile(newPath, formatted);
        await fs.unlink(filePath);
        console.log(`Converted: ${filePath}`);
      } catch (err) {
        console.error(`Error in ${filePath}:`, err);
      }
    }
  });

  // Also convert config files at root
  const rootConfigs = ['vite.config.ts', 'tailwind.config.ts', 'vitest.config.ts', 'playwright.config.ts', 'playwright-fixture.ts'];
  for (const config of rootConfigs) {
    try {
      const code = await fs.readFile(config, 'utf-8');
      const result = await babel.transformAsync(code, {
        filename: config,
        plugins: [['@babel/plugin-transform-typescript', { isTSX: true, allExtensions: true }]],
        sourceType: 'module'
      });
      const formatted = await prettier.format(result.code, { parser: 'babel', singleQuote: true, trailingComma: 'es5' });
      const newPath = config.replace(/\.tsx?$/, '.js');
      await fs.writeFile(newPath, formatted);
      await fs.unlink(config);
      console.log(`Converted root config: ${config}`);
    } catch(err) {
      console.error(`Could not convert root config ${config} (might not exist):`, err);    
    }
  }
}
run();
