// Восстановление уведомления о скидке и полоски с политикой
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const BASE = process.cwd();

// Блок, который показывается внизу сайта: серая полоска (политика) над чёрным уведомлением (скидка)
const NOTICE_HTML = `
<div class="baza-privacy-bar" style="position:fixed; bottom:52px; left:0; right:0; background:#f0f0f0; text-align:center; padding:8px; z-index:9999; font-size:14px;">
    <a href="/politica" class="custom-privacy-link" style="color:#333; text-decoration:underline;">Политика конфиденциальности</a>
</div>
<p role="complementary" aria-label="Предупреждение магазина" class="woocommerce-store-notice demo_store baza-store-notice" data-notice-id="fddbbf4ee62f1f7f92c420d6985de4aa" style="position:fixed; bottom:0; left:0; right:0; background:#000; color:#fff; text-align:center; padding:14px; z-index:9999; font-size:16px; margin:0;">СКИДКА 7% ПРИ ЗАКАЗЕ ОТ 2х ДЕК! <a role="button" href="#" class="woocommerce-store-notice__dismiss-link" style="color:#fff; margin-left:12px; text-decoration:underline;">Отклонить</a></p>
`;

const NOTICE_JS = `
<script>
document.addEventListener('DOMContentLoaded', function() {
    var dismiss = document.querySelector('.baza-store-notice .woocommerce-store-notice__dismiss-link');
    if (dismiss) {
        dismiss.addEventListener('click', function(e) {
            e.preventDefault();
            var notice = document.querySelector('.baza-store-notice');
            var bar = document.querySelector('.baza-privacy-bar');
            if (notice) notice.style.display = 'none';
            if (bar) bar.style.display = 'none';
        });
    }
});
</script>
`;

function walk(dir) {
  const results = [];
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) {
      results.push(...walk(full));
    } else if (f.endsWith('.html') && !f.startsWith('admin')) {
      results.push(full);
    }
  }
  return results;
}

let changed = 0;
for (const file of walk(BASE)) {
  if (file.includes('admin') || file.includes('node_modules')) continue;
  let content = readFileSync(file, 'utf-8');

  // Только страницы, где было уведомление (класс woocommerce-demo-store)
  if (!content.includes('woocommerce-demo-store')) continue;

  // Добавляем блок после открывающего <body ...>
  if (!content.includes('baza-store-notice')) {
    content = content.replace(/(<body[^>]*>)/, '$1' + NOTICE_HTML);
  }

  // Добавляем JS перед </body>
  if (!content.includes('baza-store-notice .woocommerce-store-notice__dismiss-link')) {
    content = content.replace('</body>', NOTICE_JS + '\n</body>');
  }

  writeFileSync(file, content);
  changed++;
  console.log('Обработан:', file.replace(BASE, '.'));
}
console.log(`Готово. Обновлено файлов: ${changed}`);