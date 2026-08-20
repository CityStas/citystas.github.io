// Генератор страниц из content/products.json
// Запускается на Vercel при деплое
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(__dirname, 'content', 'products.json');

function loadProducts() {
  return JSON.parse(readFileSync(CONTENT, 'utf-8'));
}

function makeCard(p, avitoDefault) {
  const avito = p.avito_url || avitoDefault;
  const btnText = p.button_text || 'Купить';
  let priceHtml = '';
  if (p.price) {
    priceHtml = `\t<span class="price"><span class="woocommerce-Price-amount amount"><bdi>${p.price}<span class="woocommerce-Price-currencySymbol">₽</span></bdi></span></span>\n`;
  }
  return `<li class="product type-product status-publish first instock product_cat-catalog has-post-thumbnail shipping-taxable product-type-external">
\t<a href="/product/${p.id}/" class="woocommerce-LoopProduct-link woocommerce-loop-product__link"><div class="loop-image-wrap botiga-add-to-cart-button-layout3"><img loading="lazy" width="420" height="420" src="${p.image}" class="attachment-woocommerce_thumbnail size-woocommerce_thumbnail" alt="${p.title}" decoding="async"><div class="loop-button-wrap button-layout3 button-width-auto"><a data-avito-url="${avito}" title="${btnText}" href="${avito}" aria-describedby="woocommerce_loop_add_to_cart_link_describedby_${p.id}" data-quantity="1" class="button product_type_external botiga-avito-btn" data-product_id="${p.id}" data-product_sku="" aria-label="${btnText}" rel="nofollow">${btnText}</a>\t<span id="woocommerce_loop_add_to_cart_link_describedby_${p.id}" class="screen-reader-text">
\t\t\t</span>
</div></div></a><h2 class="woocommerce-loop-product__title"><a class="botiga-wc-loop-product__title" href="/product/${p.id}/">${p.title}</a></h2>
${priceHtml}<div class="loop-button-wrap button-layout3 button-width-auto"></div></li>`;
}

function updateCatalog(html, products, avitoDefault) {
  const cards = products.filter(p => !p.out_of_stock).map(p => makeCard(p, avitoDefault)).join('\n');
  const pattern = /(<ul class="products columns-4">).*?(<\/ul>)/s;
  return html.replace(pattern, (m, open, close) => open + '\n' + cards + '\n' + close);
}

function updateAvitoLinks(html, avitoDefault) {
  return html.replace('https://www.avito.ru/brands/d2104a75df3bf5aa5763eb08943f9f6c/', avitoDefault);
}

function main() {
  const data = loadProducts();
  const products = data.products;
  const avitoDefault = data.settings.avito_url;

  const shopPath = join(__dirname, 'shop', 'index.html');
  if (existsSync(shopPath)) {
    let html = readFileSync(shopPath, 'utf-8');
    html = updateCatalog(html, products, avitoDefault);
    writeFileSync(shopPath, html);
    console.log('Каталог обновлён');
  }

  for (const p of products) {
    const prodPath = join(__dirname, 'product', p.id, 'index.html');
    if (existsSync(prodPath)) {
      let html = readFileSync(prodPath, 'utf-8');
      html = updateAvitoLinks(html, avitoDefault);
      writeFileSync(prodPath, html);
      console.log(`Обновлён товар: ${p.id}`);
    }
  }

  console.log('Готово.');
}

main();