import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "https://vladpadiak-lgtm.github.io";

function cors(origin: string | null) {
  const local = origin?.startsWith("http://localhost:");
  return {
    "Access-Control-Allow-Origin": local ? origin! : allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" } });
}

function clean(value: unknown, max: number) { return String(value ?? "").trim().slice(0, max); }
function escapeHtml(value: unknown) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]!)); }
function euro(cents: number) { return new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(cents / 100); }

const ADDON_PRICES: Record<string, number> = {
  "extra-patty": 350, "extra-chicken": 350, "extra-veggie-patty": 300,
  "extra-cheese": 100, "extra-bacon": 150, jalapeno: 80, "gluten-free-bun": 150,
  "large-fries": 100, "gluten-free-crust": 200, "extra-mozzarella": 150,
  "extra-salami": 180, "extra-mushrooms": 120, "extra-olives": 100, "extra-corn": 100,
  "extra-ketchup": 80, "extra-garlic-sauce": 80, "extra-bbq-sauce": 80,
  "extra-cheese-sauce": 100, "extra-lemon": 30, "extra-mint": 30,
};

function sanitizeCustomizations(value: unknown, locale: "uk" | "sk") {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.slice(0, 30).flatMap((entry) => {
    const code = clean(entry?.code, 80);
    if (!code || seen.has(code)) return [];
    const isFreeChoice = code.startsWith("choice-") || code.startsWith("remove-");
    if (!isFreeChoice && !(code in ADDON_PRICES)) return [];
    seen.add(code);
    const label = locale === "sk" ? entry?.label_sk || entry?.label_uk : entry?.label_uk || entry?.label_sk;
    return [{ code, label: clean(label || code, 100), price_cents: ADDON_PRICES[code] || 0 }];
  });
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  if (origin && !origin.startsWith("http://localhost:") && origin !== allowedOrigin) return json({ error: "Origin not allowed" }, 403, origin);

  try {
    const payload = await request.json();
    if (payload.website) return json({ error: "Invalid request" }, 400, origin);

    const customerName = clean(payload.customerName, 80);
    const phone = clean(payload.phone, 30);
    const fulfillment = payload.fulfillment === "pickup" ? "pickup" : "delivery";
    const address = clean(payload.address, 180);
    const note = clean(payload.note, 500);
    const locale = payload.locale === "sk" ? "sk" : "uk";
    const requestedItems = Array.isArray(payload.items) ? payload.items.slice(0, 20) : [];

    if (customerName.length < 2 || phone.length < 6 || !requestedItems.length || (fulfillment === "delivery" && address.length < 5)) {
      return json({ error: "Missing or invalid order details" }, 400, origin);
    }

    const requestedLines = requestedItems.map((item) => ({
      productId: clean(item.productId, 100),
      quantity: Math.floor(Number(item.quantity)),
      customizations: sanitizeCustomizations(item.customizations, locale),
      itemNote: clean(item.itemNote, 280),
    }));
    if (requestedLines.some((item) => !item.productId || item.quantity < 1 || item.quantity > 20)) return json({ error: "Invalid order item" }, 400, origin);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const ids = [...new Set(requestedLines.map((item) => item.productId))];
    const { data: products, error: productsError } = await supabase.from("products").select("id,name_uk,name_sk,price_cents,active").in("id", ids).eq("active", true);
    if (productsError || !products || products.length !== ids.length) return json({ error: "Some products are unavailable" }, 409, origin);

    const productMap = new Map(products.map((product) => [product.id, product]));
    const orderItems = requestedLines.map((line) => {
      const product = productMap.get(line.productId)!;
      const extrasCents = line.customizations.reduce((sum, item) => sum + item.price_cents, 0);
      return {
        product_id: line.productId,
        product_name: locale === "sk" ? product.name_sk : product.name_uk,
        unit_price_cents: product.price_cents + extrasCents,
        quantity: line.quantity,
        customizations: line.customizations,
        item_note: line.itemNote,
      };
    });
    const subtotalCents = orderItems.reduce((sum, item) => sum + item.unit_price_cents * item.quantity, 0);
    const deliveryCents = fulfillment === "delivery" && subtotalCents < 3000 ? 190 : 0;
    const totalCents = subtotalCents + deliveryCents;
    const orderCode = `QB-${Date.now().toString().slice(-8)}`;

    const { data: order, error: orderError } = await supabase.from("orders").insert({
      code: orderCode, customer_name: customerName, phone, fulfillment, address, note, locale,
      subtotal_cents: subtotalCents, delivery_cents: deliveryCents, total_cents: totalCents,
    }).select("id,code").single();
    if (orderError || !order) throw orderError || new Error("Order was not created");

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems.map((item) => ({ ...item, order_id: order.id })));
    if (itemsError) { await supabase.from("orders").delete().eq("id", order.id); throw itemsError; }

    let emailSent = false;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const orderEmail = Deno.env.get("ORDER_EMAIL");
    const fromEmail = Deno.env.get("ORDER_FROM_EMAIL");
    if (resendKey && orderEmail && fromEmail) {
      const rows = orderItems.map((item) => {
        const details = item.customizations.map((choice) => escapeHtml(choice.label)).join(" · ");
        const noteRow = item.item_note ? `<br><small style="color:#777">${escapeHtml(item.item_note)}</small>` : "";
        return `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${item.quantity}× ${escapeHtml(item.product_name)}${details ? `<br><small style="color:#777">${details}</small>` : ""}${noteRow}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${euro(item.unit_price_cents * item.quantity)}</td></tr>`;
      }).join("");
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromEmail, to: [orderEmail], subject: `Нове замовлення ${orderCode} — ${euro(totalCents)}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#17150f"><div style="background:#e54a2d;color:white;padding:24px"><h1 style="margin:0">Квадро Бургер</h1><p style="margin:8px 0 0">Нове замовлення ${escapeHtml(orderCode)}</p></div><div style="padding:24px;background:#fff"><p><b>Клієнт:</b> ${escapeHtml(customerName)}<br><b>Телефон:</b> ${escapeHtml(phone)}<br><b>Отримання:</b> ${fulfillment === "delivery" ? "Доставка" : "Самовивіз"}<br>${fulfillment === "delivery" ? `<b>Адреса:</b> ${escapeHtml(address)}<br>` : ""}<b>Коментар:</b> ${escapeHtml(note || "—")}</p><table style="width:100%;border-collapse:collapse">${rows}</table><p style="font-size:20px;text-align:right"><b>Разом: ${euro(totalCents)}</b></p></div></div>`,
        }),
      });
      emailSent = emailResponse.ok;
      if (emailSent) await supabase.from("orders").update({ email_sent: true }).eq("id", order.id);
    }

    return json({ orderCode: order.code, totalCents, emailSent }, 201, origin);
  } catch (error) {
    console.error("create-order", error);
    return json({ error: "Unable to create order" }, 500, origin);
  }
});
