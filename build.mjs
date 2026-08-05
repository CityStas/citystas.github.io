// Build-скрипт для Vercel: копирует сайт в папку public и запускает generate.mjs
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const __dirname = process.cwd();

// Очищаем и создаём папку public
fs.rmSync(path.join(__dirname, 'public'), { recursive: true, force: true });
fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });

// Копируем всё, кроме служебных папок
const skip = new Set(['public', '.git', 'node_modules', 'back', '.git-credentials', 'build.mjs', 'restore-notice.mjs']);

for (const entry of fs.readdirSync(__dirname)) {
  if (!skip.has(entry)) {
    fs.cpSync(path.join(__dirname, entry), path.join(__dirname, 'public', entry), { recursive: true });
  }
}

// Запускаем генератор (он обрабатывает скопированные файлы)
execSync('node generate.mjs', { stdio: 'inherit', cwd: path.join(__dirname, 'public') });

console.log('✅ Build завершён: сайт скопирован в public/');