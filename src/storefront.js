import { backendReady, createOrder, loadProducts } from "./backend.js";
import { CATEGORIES, CATEGORY_LABELS, DEFAULT_PRODUCTS, TRANSLATIONS, formatPrice, productBadge, productDescription, productName } from "./data.js";

const state = {
  locale: localStorage.getItem("quadro-language") === "sk" ? "sk" : "uk",
  products: DEFAULT_PRODUCTS,
  category: "all",
  cart: new Map(),
};

const artColors = { burger: "#edc85f", combo: "#d9f044", pizza: "#ef9b62", sides: "#f2d884", drinks: "#9dd8dc" };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const tr = (key) => TRANSLATIONS[state.locale][key] || key;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function hydrateCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("quadro-cart") || "[]");
    saved.forEach(({ id, quantity }) => state.cart.set(id, Math.max(1, Math.min(20, Number(quantity) || 1))));
  } catch { state.cart.clear(); }
}

function saveCart() {
  localStorage.setItem("quadro-cart", JSON.stringify([...state.cart].map(([id, quantity]) => ({ id, quantity }))));
}

function applyTranslations() {
  document.documentElement.lang = state.locale;
  $$('[data-i18n]').forEach((node) => { const key = node.dataset.i18n; if (tr(key)) node.textContent = tr(key); });
  $$('[data-i18n-html]').forEach((node) => { const key = node.dataset.i18nHtml; if (tr(key)) node.innerHTML = tr(key); });
  $$('.lang-btn').forEach((button) => button.classList.toggle("active", button.dataset.lang === state.locale));
  renderCategories();
  renderProducts();
  renderCart();
}

function renderCategories() {
  $("#category-tabs").innerHTML = CATEGORIES.map((category) => `<button class="category-tab ${state.category === category ? "active" : ""}" data-category="${category}">${CATEGORY_LABELS[state.locale][category]}</button>`).join("");
}

function renderProducts() {
  const products = state.products.filter((product) => product.active !== false && (state.category === "all" || product.category === state.category));
  $("#product-grid").innerHTML = products.map((product) => {
    const badge = productBadge(product, state.locale);
    return `<article class="product-card">
      <div class="product-art" style="--art:${artColors[product.category] || "#e8d7bd"}">
        ${badge ? `<span class="product-badge">${escapeHtml(badge)}</span>` : ""}<span class="product-emoji">${escapeHtml(product.emoji || "🍽️")}</span>
      </div>
      <div class="product-body"><span class="product-category">${CATEGORY_LABELS[state.locale][product.category] || product.category}</span><h3>${escapeHtml(productName(product, state.locale))}</h3><p>${escapeHtml(productDescription(product, state.locale))}</p>
        <div class="product-bottom"><strong class="product-price">${formatPrice(product.price_cents)}</strong><button class="add-button" data-add="${escapeHtml(product.id)}" aria-label="${escapeHtml(tr("added"))}">＋</button></div>
      </div>
    </article>`;
  }).join("");
}

function cartRows() {
  return [...state.cart].map(([id, quantity]) => ({ product: state.products.find((item) => item.id === id), quantity })).filter((row) => row.product);
}

function subtotal() { return cartRows().reduce((sum, row) => sum + row.product.price_cents * row.quantity, 0); }

function deliveryCost() {
  const delivery = document.querySelector('input[name="fulfillment"]:checked')?.value !== "pickup";
  return delivery && subtotal() < 3000 ? 190 : 0;
}

function renderCart() {
  const rows = cartRows();
  const count = rows.reduce((sum, row) => sum + row.quantity, 0);
  $("#cart-count").textContent = count;
  $("#cart-items").innerHTML = rows.map(({ product, quantity }) => `<article class="cart-item">
    <div class="cart-item-art" style="--art:${artColors[product.category] || "#e8d7bd"}">${escapeHtml(product.emoji || "🍽️")}</div>
    <div><h4>${escapeHtml(productName(product, state.locale))}</h4><span class="cart-item-price">${formatPrice(product.price_cents)}</span><div class="quantity"><button data-quantity="${escapeHtml(product.id)}" data-change="-1">−</button><b>${quantity}</b><button data-quantity="${escapeHtml(product.id)}" data-change="1">＋</button></div></div>
    <button class="remove-item" data-remove="${escapeHtml(product.id)}" aria-label="Remove">×</button>
  </article>`).join("");
  $("#empty-cart").classList.toggle("visible", !rows.length);
  $("#checkout-form").classList.toggle("hidden", !rows.length);
  const fee = deliveryCost();
  $("#subtotal").textContent = formatPrice(subtotal());
  $("#delivery-fee").textContent = fee ? formatPrice(fee) : tr("free");
  $("#grand-total").textContent = formatPrice(subtotal() + fee);
}

function openCart() {
  document.body.classList.add("drawer-open");
  $("#cart-drawer").classList.add("open");
  $("#drawer-backdrop").classList.add("open");
  $("#cart-drawer").setAttribute("aria-hidden", "false");
}

function closeCart() {
  document.body.classList.remove("drawer-open");
  $("#cart-drawer").classList.remove("open");
  $("#drawer-backdrop").classList.remove("open");
  $("#cart-drawer").setAttribute("aria-hidden", "true");
}

function addItem(id) {
  if (!state.products.some((product) => product.id === id)) return;
  state.cart.set(id, Math.min(20, (state.cart.get(id) || 0) + 1));
  saveCart(); renderCart(); openCart();
}

function changeQuantity(id, delta) {
  const next = (state.cart.get(id) || 0) + delta;
  if (next <= 0) state.cart.delete(id); else state.cart.set(id, Math.min(20, next));
  saveCart(); renderCart();
}

function setLocale(locale) {
  state.locale = locale === "sk" ? "sk" : "uk";
  localStorage.setItem("quadro-language", state.locale);
  applyTranslations();
}

async function submitOrder(event) {
  event.preventDefault();
  const status = $("#order-status");
  status.className = "form-status";
  if (!backendReady) { status.textContent = tr("backendPending"); return; }
  const form = new FormData(event.currentTarget);
  const fulfillment = form.get("fulfillment");
  if (fulfillment === "delivery" && !String(form.get("address") || "").trim()) {
    event.currentTarget.address.focus(); return;
  }
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true; status.textContent = "…";
  try {
    const result = await createOrder({
      customerName: String(form.get("name") || "").trim(), phone: String(form.get("phone") || "").trim(), fulfillment,
      address: String(form.get("address") || "").trim(), note: String(form.get("note") || "").trim(), website: String(form.get("website") || ""), locale: state.locale,
      items: cartRows().map(({ product, quantity }) => ({ productId: product.id, quantity })),
    });
    state.cart.clear(); saveCart(); renderCart(); closeCart(); event.currentTarget.reset();
    $("#success-text").textContent = tr("orderSuccess").replace("{code}", result.orderCode);
    $("#success-dialog").showModal();
  } catch (error) {
    status.textContent = error.message === "BACKEND_NOT_CONFIGURED" ? tr("backendPending") : tr("orderError");
  } finally { submit.disabled = false; }
}

document.addEventListener("click", (event) => {
  const lang = event.target.closest("[data-lang]"); if (lang) setLocale(lang.dataset.lang);
  const category = event.target.closest("[data-category]"); if (category) { state.category = category.dataset.category; renderCategories(); renderProducts(); }
  const add = event.target.closest("[data-add]"); if (add) addItem(add.dataset.add);
  const quantity = event.target.closest("[data-quantity]"); if (quantity) changeQuantity(quantity.dataset.quantity, Number(quantity.dataset.change));
  const remove = event.target.closest("[data-remove]"); if (remove) { state.cart.delete(remove.dataset.remove); saveCart(); renderCart(); }
});

$("#cart-open").addEventListener("click", openCart);
$("#cart-close").addEventListener("click", closeCart);
$("#drawer-backdrop").addEventListener("click", closeCart);
$("#empty-continue").addEventListener("click", () => { closeCart(); $("#menu").scrollIntoView(); });
$("#checkout-form").addEventListener("submit", submitOrder);
$$('input[name="fulfillment"]').forEach((input) => input.addEventListener("change", () => {
  const needsAddress = input.form.fulfillment.value === "delivery";
  $(".address-field").classList.toggle("hidden", !needsAddress); input.form.address.required = needsAddress; renderCart();
}));
[$("#success-close"), $("#success-done")].forEach((button) => button.addEventListener("click", () => $("#success-dialog").close()));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeCart(); });

hydrateCart();
applyTranslations();
loadProducts().then((products) => { if (products?.length) { state.products = products; renderProducts(); renderCart(); } }).catch(() => {});
