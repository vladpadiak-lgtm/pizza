import { backendReady, createOrder, loadProducts } from "./backend.js";
import { CATEGORIES, CATEGORY_LABELS, DEFAULT_PRODUCTS, TRANSLATIONS, formatPrice, productBadge, productDescription, productName } from "./data.js";
import { CUSTOMIZER_TEXT, getProductCustomizer, getProductMedia, localizedLabel } from "./customizations.js";

const state = {
  locale: localStorage.getItem("quadro-language") === "sk" ? "sk" : "uk",
  products: DEFAULT_PRODUCTS,
  category: "all",
  cart: [],
  customizerProductId: null,
  editingLineId: null,
};

const artColors = { burger: "#edc85f", combo: "#d9f044", pizza: "#ef9b62", sides: "#f2d884", drinks: "#9dd8dc" };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const tr = (key) => CUSTOMIZER_TEXT[state.locale]?.[key] || TRANSLATIONS[state.locale]?.[key] || key;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function newLineId() {
  return globalThis.crypto?.randomUUID?.() || `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function hydrateCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("quadro-cart") || "[]");
    if (!Array.isArray(saved)) return;
    state.cart = saved.slice(0, 40).map((item) => ({
      lineId: String(item.lineId || newLineId()),
      productId: String(item.productId || item.id || ""),
      quantity: Math.max(1, Math.min(20, Number(item.quantity) || 1)),
      selections: Array.isArray(item.selections) ? item.selections.slice(0, 30) : [],
      itemNote: String(item.itemNote || "").slice(0, 280),
    })).filter((item) => item.productId);
  } catch { state.cart = []; }
}

function saveCart() {
  localStorage.setItem("quadro-cart", JSON.stringify(state.cart));
}

function mediaStyle(product) {
  const media = getProductMedia(product);
  return media ? `--photo:url('${media.sheet}');--photo-x:${media.x};--photo-y:${media.y};` : `--art:${artColors[product.category] || "#e8d7bd"};`;
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
    const hasPhoto = Boolean(getProductMedia(product));
    return `<article class="product-card" data-customize="${escapeHtml(product.id)}" role="button" tabindex="0" aria-label="${escapeHtml(`${tr("customize")} ${productName(product, state.locale)}`)}">
      <div class="product-art ${hasPhoto ? "has-photo" : ""}" style="${mediaStyle(product)}">
        ${badge ? `<span class="product-badge">${escapeHtml(badge)}</span>` : ""}${hasPhoto ? "" : `<span class="product-emoji">${escapeHtml(product.emoji || "🍽️")}</span>`}
        <span class="customizable-chip">✦ ${escapeHtml(tr("customizable"))}</span>
      </div>
      <div class="product-body"><span class="product-category">${CATEGORY_LABELS[state.locale][product.category] || product.category}</span><h3>${escapeHtml(productName(product, state.locale))}</h3><p>${escapeHtml(productDescription(product, state.locale))}</p>
        <div class="product-bottom"><strong class="product-price">${formatPrice(product.price_cents)}</strong><button class="add-button" data-customize="${escapeHtml(product.id)}" aria-label="${escapeHtml(tr("customize"))}">＋</button></div>
      </div>
    </article>`;
  }).join("");
}

function cartRows() {
  return state.cart.map((line) => ({ ...line, product: state.products.find((item) => item.id === line.productId) })).filter((row) => row.product);
}

function lineExtras(line) {
  return (line.selections || []).reduce((sum, selection) => sum + Math.max(0, Number(selection.price_cents) || 0), 0);
}

function lineUnitPrice(line) {
  return Number(line.product.price_cents) + lineExtras(line);
}

function subtotal() { return cartRows().reduce((sum, row) => sum + lineUnitPrice(row) * row.quantity, 0); }

function deliveryCost() {
  const delivery = document.querySelector('input[name="fulfillment"]:checked')?.value !== "pickup";
  return delivery && subtotal() < 3000 ? 190 : 0;
}

function selectionLabel(selection) { return selection[`label_${state.locale}`] || selection.label_uk || ""; }

function lineSummary(line) {
  const parts = (line.selections || []).map(selectionLabel).filter(Boolean);
  if (line.itemNote) parts.push(`“${line.itemNote}”`);
  return parts.length ? parts.join(" · ") : tr("noChanges");
}

function renderCart() {
  const rows = cartRows();
  const count = rows.reduce((sum, row) => sum + row.quantity, 0);
  $("#cart-count").textContent = count;
  $("#cart-items").innerHTML = rows.map((line) => {
    const hasPhoto = Boolean(getProductMedia(line.product));
    return `<article class="cart-item">
      <div class="cart-item-art ${hasPhoto ? "has-photo" : ""}" style="${mediaStyle(line.product)}">${hasPhoto ? "" : escapeHtml(line.product.emoji || "🍽️")}</div>
      <div><h4>${escapeHtml(productName(line.product, state.locale))}</h4><span class="cart-item-price">${formatPrice(lineUnitPrice(line))}</span><p class="cart-item-custom">${escapeHtml(lineSummary(line))}</p><button class="edit-item" data-edit-line="${escapeHtml(line.lineId)}">✎ ${escapeHtml(tr("edit"))}</button><div class="quantity"><button data-line-quantity="${escapeHtml(line.lineId)}" data-change="-1">−</button><b>${line.quantity}</b><button data-line-quantity="${escapeHtml(line.lineId)}" data-change="1">＋</button></div></div>
      <button class="remove-item" data-remove-line="${escapeHtml(line.lineId)}" aria-label="Remove">×</button>
    </article>`;
  }).join("");
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

function renderOption(group, item, selectedCodes) {
  const isIncluded = group.type === "included";
  const isRadio = group.type === "radio";
  const removalCode = `remove-${item.id}`;
  const selected = isIncluded ? !selectedCodes.has(removalCode) : selectedCodes.size ? selectedCodes.has(item.id) : Boolean(item.checked);
  const price = item.price_cents ? `<small>+${formatPrice(item.price_cents)}</small>` : "";
  return `<label class="choice-card ${isIncluded ? "included-choice" : ""}">
    <input data-option data-group-mode="${escapeHtml(group.type)}" type="${isRadio ? "radio" : "checkbox"}" name="option-${escapeHtml(group.id)}" value="${escapeHtml(item.id)}" data-label-uk="${escapeHtml(item.label.uk)}" data-label-sk="${escapeHtml(item.label.sk)}" data-price="${Number(item.price_cents) || 0}" ${selected ? "checked" : ""} />
    <span><b>${escapeHtml(localizedLabel(item, state.locale))}</b>${price}<i>✓</i></span>
  </label>`;
}

function renderCustomizerGroups(product, selectedCodes) {
  return getProductCustomizer(product).filter((group) => group.options?.length).map((group) => `<fieldset class="customizer-group" data-summary-always="${group.summaryAlways ? "true" : "false"}">
    <legend>${escapeHtml(tr(group.titleKey))}</legend>${group.hintKey ? `<p>${escapeHtml(tr(group.hintKey))}</p>` : ""}
    <div class="choice-grid">${group.options.map((item) => renderOption(group, item, selectedCodes)).join("")}</div>
  </fieldset>`).join("");
}

function openCustomizer(productId, lineId = null) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  closeCart();
  state.customizerProductId = product.id;
  state.editingLineId = lineId;
  const line = lineId ? state.cart.find((item) => item.lineId === lineId) : null;
  const selectedCodes = new Set((line?.selections || []).map((item) => item.code));
  const media = getProductMedia(product);
  $("#customizer-photo").className = `customizer-photo ${media ? "has-photo" : ""}`;
  $("#customizer-photo").setAttribute("style", mediaStyle(product));
  $("#customizer-photo").innerHTML = media ? "" : escapeHtml(product.emoji || "🍽️");
  $("#customizer-category").textContent = CATEGORY_LABELS[state.locale][product.category] || product.category;
  $("#customizer-title").textContent = productName(product, state.locale);
  $("#customizer-description").textContent = productDescription(product, state.locale);
  $("#customizer-hint").textContent = tr("customizeHint");
  $("#customizer-groups").innerHTML = renderCustomizerGroups(product, selectedCodes);
  $("#customizer-note-label").textContent = tr("itemNote");
  $("#customizer-note").placeholder = tr("itemNotePlaceholder");
  $("#customizer-note").value = line?.itemNote || "";
  $("#customizer-quantity-label").textContent = tr("quantity");
  $("#customizer-quantity").value = line?.quantity || 1;
  $("#customizer-submit-label").textContent = line ? tr("updateCart") : tr("addToCart");
  updateCustomizerPrice();
  $("#customizer-dialog").showModal();
  document.body.classList.add("modal-open");
}

function closeCustomizer() {
  if ($("#customizer-dialog").open) $("#customizer-dialog").close();
}

function collectSelections() {
  const selections = [];
  $$("#customizer-form [data-option]").forEach((input) => {
    const mode = input.dataset.groupMode;
    const fieldset = input.closest("fieldset");
    if (mode === "included" && !input.checked) {
      selections.push({ code: `remove-${input.value}`, label_uk: `Без ${input.dataset.labelUk}`, label_sk: `Bez ${input.dataset.labelSk}`, price_cents: 0 });
    } else if (mode !== "included" && input.checked) {
      const summaryAlways = fieldset?.dataset.summaryAlways === "true";
      const price = Math.max(0, Number(input.dataset.price) || 0);
      if (summaryAlways || price > 0 || input.type === "checkbox") selections.push({ code: input.value, label_uk: input.dataset.labelUk, label_sk: input.dataset.labelSk, price_cents: price });
    }
  });
  return selections;
}

function updateCustomizerPrice() {
  const product = state.products.find((item) => item.id === state.customizerProductId);
  if (!product) return;
  const quantity = Math.max(1, Math.min(20, Number($("#customizer-quantity").value) || 1));
  const extras = collectSelections().reduce((sum, item) => sum + item.price_cents, 0);
  $("#customizer-total").textContent = formatPrice((Number(product.price_cents) + extras) * quantity);
}

function changeLineQuantity(lineId, delta) {
  const line = state.cart.find((item) => item.lineId === lineId);
  if (!line) return;
  line.quantity += delta;
  if (line.quantity <= 0) state.cart = state.cart.filter((item) => item.lineId !== lineId);
  else line.quantity = Math.min(20, line.quantity);
  saveCart(); renderCart();
}

function setLocale(locale) {
  state.locale = locale === "sk" ? "sk" : "uk";
  localStorage.setItem("quadro-language", state.locale);
  applyTranslations();
}

function saveCustomizedItem(event) {
  event.preventDefault();
  const product = state.products.find((item) => item.id === state.customizerProductId);
  if (!product) return;
  const quantity = Math.max(1, Math.min(20, Number($("#customizer-quantity").value) || 1));
  const line = {
    lineId: state.editingLineId || newLineId(),
    productId: product.id,
    quantity,
    selections: collectSelections(),
    itemNote: $("#customizer-note").value.trim().slice(0, 280),
  };
  if (state.editingLineId) {
    const index = state.cart.findIndex((item) => item.lineId === state.editingLineId);
    if (index >= 0) state.cart[index] = line; else state.cart.push(line);
  } else state.cart.push(line);
  saveCart(); renderCart(); closeCustomizer(); openCart();
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
      items: cartRows().map((line) => ({ productId: line.product.id, quantity: line.quantity, customizations: line.selections, itemNote: line.itemNote })),
    });
    state.cart = []; saveCart(); renderCart(); closeCart(); event.currentTarget.reset();
    $("#success-text").textContent = tr("orderSuccess").replace("{code}", result.orderCode);
    $("#success-dialog").showModal();
  } catch (error) {
    status.textContent = error.message === "BACKEND_NOT_CONFIGURED" ? tr("backendPending") : tr("orderError");
  } finally { submit.disabled = false; }
}

document.addEventListener("click", (event) => {
  const lang = event.target.closest("[data-lang]"); if (lang) setLocale(lang.dataset.lang);
  const category = event.target.closest("[data-category]"); if (category) { state.category = category.dataset.category; renderCategories(); renderProducts(); return; }
  const edit = event.target.closest("[data-edit-line]"); if (edit) { const line = state.cart.find((item) => item.lineId === edit.dataset.editLine); if (line) openCustomizer(line.productId, line.lineId); return; }
  const customize = event.target.closest("[data-customize]"); if (customize) { openCustomizer(customize.dataset.customize); return; }
  const quantity = event.target.closest("[data-line-quantity]"); if (quantity) changeLineQuantity(quantity.dataset.lineQuantity, Number(quantity.dataset.change));
  const remove = event.target.closest("[data-remove-line]"); if (remove) { state.cart = state.cart.filter((item) => item.lineId !== remove.dataset.removeLine); saveCart(); renderCart(); }
  const customizerQuantity = event.target.closest("[data-customizer-quantity]");
  if (customizerQuantity) { const input = $("#customizer-quantity"); input.value = Math.max(1, Math.min(20, Number(input.value) + Number(customizerQuantity.dataset.customizerQuantity))); updateCustomizerPrice(); }
});

document.addEventListener("keydown", (event) => {
  const card = event.target.closest?.(".product-card[data-customize]");
  if (card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openCustomizer(card.dataset.customize); }
  if (event.key === "Escape" && !$("#customizer-dialog").open) closeCart();
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
$("#customizer-close").addEventListener("click", closeCustomizer);
$("#customizer-form").addEventListener("submit", saveCustomizedItem);
$("#customizer-form").addEventListener("input", updateCustomizerPrice);
$("#customizer-dialog").addEventListener("click", (event) => { if (event.target === event.currentTarget) closeCustomizer(); });
$("#customizer-dialog").addEventListener("close", () => { document.body.classList.remove("modal-open"); state.customizerProductId = null; state.editingLineId = null; });

hydrateCart();
applyTranslations();
loadProducts().then((products) => { if (products?.length) { state.products = products; renderProducts(); renderCart(); } }).catch(() => {});
