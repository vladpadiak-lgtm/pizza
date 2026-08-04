import { backendReady, loadAdminProducts, loadOrders, loginAdmin, logoutAdmin, publishCatalog, updateOrderStatus, validateSession } from "./backend.js";
import { CATEGORY_LABELS, CATEGORIES, TRANSLATIONS, formatPrice } from "./data.js";

const state = { locale: localStorage.getItem("quadro-language") === "sk" ? "sk" : "uk", products: [], orders: [], authenticated: false };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const tr = (key) => TRANSLATIONS[state.locale][key] || key;

function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

function applyTranslations() {
  document.documentElement.lang = state.locale;
  $$('[data-i18n]').forEach((node) => { if (tr(node.dataset.i18n)) node.textContent = tr(node.dataset.i18n); });
  $$('.lang-btn').forEach((button) => button.classList.toggle("active", button.dataset.lang === state.locale));
  if (state.authenticated) { renderProducts(); renderOrders(); }
}

function setLocale(locale) {
  state.locale = locale === "sk" ? "sk" : "uk";
  localStorage.setItem("quadro-language", state.locale);
  applyTranslations();
}

function showLogin() {
  $("#setup-panel").classList.add("hidden");
  $("#login-panel").classList.remove("hidden");
  $("#dashboard").classList.add("hidden");
  $("#logout-button").classList.add("hidden");
}

function showSetup() {
  $("#setup-panel").classList.remove("hidden");
  $("#login-panel").classList.add("hidden");
  $("#dashboard").classList.add("hidden");
}

async function showDashboard() {
  state.authenticated = true;
  $("#setup-panel").classList.add("hidden");
  $("#login-panel").classList.add("hidden");
  $("#dashboard").classList.remove("hidden");
  $("#logout-button").classList.remove("hidden");
  await Promise.all([refreshProducts(), refreshOrders()]);
}

async function refreshProducts() {
  state.products = (await loadAdminProducts()).map((item) => ({ ...item }));
  renderProducts();
}

async function refreshOrders() {
  state.orders = await loadOrders();
  renderOrders();
  $("#new-orders-count").textContent = state.orders.filter((order) => order.status === "new").length;
}

function categoryOptions(selected) {
  return CATEGORIES.filter((category) => category !== "all").map((category) => `<option value="${category}" ${selected === category ? "selected" : ""}>${CATEGORY_LABELS[state.locale][category]}</option>`).join("");
}

function renderProducts() {
  $("#admin-products").innerHTML = state.products.map((product, index) => `<article class="admin-product" data-index="${index}">
    <label><span>Emoji</span><input class="emoji-input" data-field="emoji" maxlength="8" value="${escapeHtml(product.emoji || "🍽️")}" /></label>
    <label class="name-field"><span>${tr("productNameUk")}</span><input data-field="name_uk" maxlength="80" value="${escapeHtml(product.name_uk)}" /></label>
    <label class="name-field"><span>${tr("productNameSk")}</span><input data-field="name_sk" maxlength="80" value="${escapeHtml(product.name_sk)}" /></label>
    <label class="description-field"><span>${tr("description")} UA</span><input data-field="description_uk" maxlength="280" value="${escapeHtml(product.description_uk)}" /></label>
    <label class="description-field"><span>${tr("description")} SK</span><input data-field="description_sk" maxlength="280" value="${escapeHtml(product.description_sk)}" /></label>
    <label class="category-field"><span>${tr("category")}</span><select data-field="category">${categoryOptions(product.category)}</select></label>
    <label class="price-field"><span>${tr("price")}</span><input data-field="price" type="number" min="0" max="999" step="0.10" value="${(product.price_cents / 100).toFixed(2)}" /></label>
    <label class="active-toggle" title="${tr("active")}"><span>${tr("active")}</span><input data-field="active" type="checkbox" ${product.active ? "checked" : ""} /></label>
    <button class="delete-product" data-delete-index="${index}" aria-label="Delete">×</button>
  </article>`).join("");
}

function statusOptions(selected) {
  const statuses = ["new", "confirmed", "preparing", "ready", "delivered", "cancelled"];
  return statuses.map((status) => `<option value="${status}" ${selected === status ? "selected" : ""}>${tr(`status${status[0].toUpperCase()}${status.slice(1)}`)}</option>`).join("");
}

function renderOrders() {
  if (!state.orders.length) { $("#orders-list").innerHTML = `<p>${tr("noOrders")}</p>`; return; }
  $("#orders-list").innerHTML = state.orders.map((order) => {
    const items = (order.order_items || []).map((item) => `${item.quantity}× ${escapeHtml(item.product_name)}`).join("<br />");
    return `<article class="order-card"><div><strong>${escapeHtml(order.code)}</strong><small>${new Date(order.created_at).toLocaleString(state.locale === "uk" ? "uk-UA" : "sk-SK")}</small></div><div class="order-items-summary"><strong>${escapeHtml(order.customer_name)} · ${escapeHtml(order.phone)}</strong><small>${items}</small><small>${escapeHtml(order.fulfillment === "delivery" ? order.address : tr("pickupOption"))}</small></div><div class="order-total">${formatPrice(order.total_cents)}</div><select data-order-status="${escapeHtml(order.id)}">${statusOptions(order.status)}</select></article>`;
  }).join("");
}

function addProduct() {
  state.products.push({ id: crypto.randomUUID(), category: "burger", name_uk: tr("newProduct"), name_sk: "Nový produkt", description_uk: "", description_sk: "", price_cents: 0, emoji: "🍽️", badge_uk: "", badge_sk: "", active: true, sort_order: state.products.length * 10 + 10 });
  renderProducts();
  $("#admin-products").lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function publish() {
  const status = $("#publish-status");
  status.className = "form-status"; status.textContent = "…";
  const payload = state.products.map((product, index) => ({
    id: String(product.id), category: product.category, name_uk: String(product.name_uk || "").trim(), name_sk: String(product.name_sk || "").trim(),
    description_uk: String(product.description_uk || "").trim(), description_sk: String(product.description_sk || "").trim(),
    price_cents: Math.max(0, Number(product.price_cents) || 0), emoji: String(product.emoji || "🍽️").slice(0, 8), badge_uk: String(product.badge_uk || ""), badge_sk: String(product.badge_sk || ""), active: Boolean(product.active), sort_order: index * 10 + 10,
  }));
  if (payload.some((product) => !product.name_uk || !product.name_sk || product.price_cents < 0)) { status.textContent = tr("publishError"); return; }
  try { await publishCatalog(payload); status.className = "form-status success"; status.textContent = tr("publishSuccess"); await refreshProducts(); }
  catch { status.textContent = tr("publishError"); }
}

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const status = $("#login-status"); status.textContent = "…";
  const data = new FormData(event.currentTarget);
  try { await loginAdmin(String(data.get("email")), String(data.get("password"))); status.textContent = ""; await showDashboard(); }
  catch { status.textContent = tr("loginError"); }
});

$("#logout-button").addEventListener("click", async () => { await logoutAdmin(); state.authenticated = false; showLogin(); });
$("#add-product").addEventListener("click", addProduct);
$("#publish-button").addEventListener("click", publish);
$("#refresh-orders").addEventListener("click", refreshOrders);
document.addEventListener("click", (event) => {
  const lang = event.target.closest("[data-lang]"); if (lang) setLocale(lang.dataset.lang);
  const tab = event.target.closest("[data-admin-tab]");
  if (tab) { $$('[data-admin-tab]').forEach((button) => button.classList.toggle("active", button === tab)); $("#products-panel").classList.toggle("hidden", tab.dataset.adminTab !== "products"); $("#orders-panel").classList.toggle("hidden", tab.dataset.adminTab !== "orders"); }
  const remove = event.target.closest("[data-delete-index]"); if (remove) { state.products.splice(Number(remove.dataset.deleteIndex), 1); renderProducts(); }
});

$("#admin-products").addEventListener("input", (event) => {
  const row = event.target.closest("[data-index]"); const field = event.target.dataset.field; if (!row || !field) return;
  const product = state.products[Number(row.dataset.index)];
  if (field === "active") product.active = event.target.checked;
  else if (field === "price") product.price_cents = Math.round((Number(event.target.value) || 0) * 100);
  else product[field] = event.target.value;
});
$("#admin-products").addEventListener("change", (event) => {
  const row = event.target.closest("[data-index]"); const field = event.target.dataset.field; if (row && field === "category") state.products[Number(row.dataset.index)].category = event.target.value;
});
$("#orders-list").addEventListener("change", async (event) => {
  const id = event.target.dataset.orderStatus; if (!id) return;
  event.target.disabled = true; try { await updateOrderStatus(id, event.target.value); await refreshOrders(); } finally { event.target.disabled = false; }
});

applyTranslations();
if (!backendReady) showSetup(); else validateSession().then((result) => result ? showDashboard() : showLogin());
