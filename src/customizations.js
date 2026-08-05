const bi = (uk, sk) => ({ uk, sk });
const option = (id, uk, sk, price_cents = 0, checked = false) => ({ id, label: bi(uk, sk), price_cents, checked });

export const CUSTOMIZER_TEXT = {
  uk: {
    customize: "Налаштувати",
    customizable: "Можна змінити склад",
    customizeHint: "Приберіть непотрібне або додайте улюблені доповнення.",
    included: "Склад",
    includedHint: "Зніміть позначку, щоб прибрати інгредієнт — без доплати.",
    extras: "Додати до страви",
    chooseDrink: "Оберіть напій",
    chooseSauce: "Оберіть соус",
    chooseCrust: "Тісто",
    chooseIce: "Кількість льоду",
    chooseCola: "Варіант напою",
    chooseWater: "Вода",
    chooseSweetness: "Солодкість",
    seasoning: "Приправа",
    portion: "Розмір порції",
    itemNote: "Побажання до цієї позиції",
    itemNotePlaceholder: "Наприклад: соус окремо, добре просмажити…",
    quantity: "Кількість",
    addToCart: "Додати до кошика",
    updateCart: "Зберегти зміни",
    edit: "Змінити склад",
    removePrefix: "Без",
    noChanges: "Стандартний склад",
    addedConfigured: "Позицію додано до кошика",
  },
  sk: {
    customize: "Upraviť",
    customizable: "Zloženie môžete upraviť",
    customizeHint: "Odoberte, čo nechcete, alebo pridajte obľúbené doplnky.",
    included: "Zloženie",
    includedHint: "Zrušte označenie a ingredienciu odstránime bez príplatku.",
    extras: "Pridať k jedlu",
    chooseDrink: "Vyberte nápoj",
    chooseSauce: "Vyberte omáčku",
    chooseCrust: "Cesto",
    chooseIce: "Množstvo ľadu",
    chooseCola: "Variant nápoja",
    chooseWater: "Voda",
    chooseSweetness: "Sladkosť",
    seasoning: "Korenie",
    portion: "Veľkosť porcie",
    itemNote: "Poznámka k tejto položke",
    itemNotePlaceholder: "Napríklad: omáčku zvlášť, dobre prepiecť…",
    quantity: "Množstvo",
    addToCart: "Pridať do košíka",
    updateCart: "Uložiť zmeny",
    edit: "Upraviť zloženie",
    removePrefix: "Bez",
    noChanges: "Štandardné zloženie",
    addedConfigured: "Položka bola pridaná do košíka",
  },
};

const menuAssetRoot = import.meta.env ? "../menu" : "../public/menu";
const atlas = (sheet, x, y) => ({ sheet: `${menuAssetRoot}/${sheet}-atlas.jpg`, x, y });

export const PRODUCT_MEDIA = {
  "quadro-burger": atlas("burgers", "0%", "0%"),
  "classic-cheese": atlas("burgers", "100%", "0%"),
  "chicken-crunch": atlas("burgers", "0%", "100%"),
  "veggie-burger": atlas("burgers", "100%", "100%"),
  "quad-menu": atlas("combos", "0%", "0%"),
  "classic-menu": atlas("combos", "100%", "0%"),
  "chicken-menu": atlas("combos", "0%", "100%"),
  "pizza-margherita": atlas("pizzas", "0%", "0%"),
  "pizza-pepperoni": atlas("pizzas", "100%", "0%"),
  "pizza-quattro": atlas("pizzas", "0%", "100%"),
  "pizza-diavola": atlas("pizzas", "100%", "100%"),
  fries: atlas("sides", "0%", "0%"),
  "loaded-fries": atlas("sides", "100%", "0%"),
  "onion-rings": atlas("sides", "0%", "100%"),
  kofola: atlas("drinks", "0%", "0%"),
  cola: atlas("drinks", "100%", "0%"),
  lemonade: atlas("drinks", "0%", "100%"),
  water: atlas("drinks", "100%", "100%"),
};

const CATEGORY_MEDIA = {
  burger: PRODUCT_MEDIA["classic-cheese"],
  combo: PRODUCT_MEDIA["classic-menu"],
  pizza: PRODUCT_MEDIA["pizza-margherita"],
  sides: PRODUCT_MEDIA.fries,
  drinks: PRODUCT_MEDIA.lemonade,
};

export function getProductMedia(product) {
  return PRODUCT_MEDIA[product.id] || CATEGORY_MEDIA[product.category] || null;
}

const BURGER_INGREDIENTS = {
  "quadro-burger": [
    option("beef-patties", "дві яловичі котлети", "dve hovädzie placky", 0, true),
    option("cheddar", "подвійний чедер", "dvojitý čedar", 0, true),
    option("bacon", "бекон", "slanina", 0, true),
    option("pickles", "маринований огірок", "nakladaná uhorka", 0, true),
    option("onion", "червона цибуля", "červená cibuľa", 0, true),
    option("signature-sauce", "фірмовий соус", "domáci dresing", 0, true),
  ],
  "classic-cheese": [
    option("beef-patty", "яловича котлета", "hovädzia placka", 0, true),
    option("cheddar", "чедер", "čedar", 0, true),
    option("lettuce", "салат", "šalát", 0, true),
    option("tomato", "помідор", "paradajka", 0, true),
    option("pickles", "маринований огірок", "nakladaná uhorka", 0, true),
    option("burger-sauce", "бургер-соус", "burgerový dresing", 0, true),
  ],
  "chicken-crunch": [
    option("chicken", "хрустке курча", "chrumkavé kurča", 0, true),
    option("cheddar", "чедер", "čedar", 0, true),
    option("lettuce", "салат", "šalát", 0, true),
    option("pickles", "огірок", "uhorka", 0, true),
    option("honey-mustard", "медово-гірчичний соус", "medovo-horčicový dresing", 0, true),
  ],
  "veggie-burger": [
    option("veggie-patty", "овочева котлета", "zeleninová placka", 0, true),
    option("cheddar", "чедер", "čedar", 0, true),
    option("arugula", "рукола", "rukola", 0, true),
    option("tomato", "помідор", "paradajka", 0, true),
    option("onion", "цибуля", "cibuľa", 0, true),
    option("ajvar", "соус айвар", "ajvar dresing", 0, true),
  ],
};

const PIZZA_INGREDIENTS = {
  "pizza-margherita": [option("tomato-sauce", "томатний соус", "paradajková omáčka", 0, true), option("mozzarella", "моцарела", "mozzarella", 0, true), option("basil", "базилік", "bazalka", 0, true), option("olive-oil", "оливкова олія", "olivový olej", 0, true)],
  "pizza-pepperoni": [option("tomato-sauce", "томатний соус", "paradajková omáčka", 0, true), option("mozzarella", "моцарела", "mozzarella", 0, true), option("pepperoni", "пікантна салямі", "pikantná saláma", 0, true)],
  "pizza-quattro": [option("mozzarella", "моцарела", "mozzarella", 0, true), option("gorgonzola", "горгонзола", "gorgonzola", 0, true), option("parmesan", "пармезан", "parmezán", 0, true), option("smoked-cheese", "копчений сир", "údený syr", 0, true)],
  "pizza-diavola": [option("tomato-sauce", "томатний соус", "paradajková omáčka", 0, true), option("mozzarella", "моцарела", "mozzarella", 0, true), option("spicy-salami", "гостра салямі", "pikantná saláma", 0, true), option("chilli", "чилі", "chilli", 0, true), option("onion", "червона цибуля", "červená cibuľa", 0, true)],
};

const burgerExtras = (product) => {
  const main = product.id === "chicken-crunch"
    ? option("extra-chicken", "додаткове хрустке курча", "extra chrumkavé kurča", 350)
    : product.id === "veggie-burger"
      ? option("extra-veggie-patty", "додаткова овочева котлета", "extra zeleninová placka", 300)
      : option("extra-patty", "додаткова яловича котлета", "extra hovädzia placka", 350);
  return [main, option("extra-cheese", "додатковий чедер", "extra čedar", 100), option("extra-bacon", "додатковий бекон", "extra slanina", 150), option("jalapeno", "халапеньйо", "jalapeño", 80), option("gluten-free-bun", "безглютенова булочка", "bezlepková žemľa", 150)];
};

const sauceOptions = [
  option("choice-signature", "фірмовий", "domáci", 0, true),
  option("choice-garlic", "часниковий", "cesnakový"),
  option("choice-bbq", "BBQ", "BBQ"),
  option("choice-ketchup", "кетчуп", "kečup"),
];

const drinkOptions = [
  option("choice-kofola", "Kofola", "Kofola", 0, true),
  option("choice-cola-original", "Coca-Cola Original", "Coca-Cola Original"),
  option("choice-cola-zero", "Coca-Cola Zero", "Coca-Cola Zero"),
  option("choice-mineral", "мінеральна вода", "minerálna voda"),
];

const iceOptions = [
  option("choice-ice-normal", "звичайно", "normálne", 0, true),
  option("choice-ice-less", "менше льоду", "menej ľadu"),
  option("choice-ice-none", "без льоду", "bez ľadu"),
  option("choice-ice-extra", "більше льоду", "viac ľadu"),
];

function group(id, titleKey, type, options, extra = {}) { return { id, titleKey, type, options, ...extra }; }

export function getProductCustomizer(product) {
  const included = BURGER_INGREDIENTS[product.id];
  if (product.category === "burger") {
    return [
      group("included", "included", "included", included || [], { hintKey: "includedHint" }),
      group("extras", "extras", "checkbox", burgerExtras(product)),
    ];
  }

  if (product.category === "combo") {
    const sourceId = product.id === "quad-menu" ? "quadro-burger" : product.id === "chicken-menu" ? "chicken-crunch" : "classic-cheese";
    return [
      group("included", "included", "included", BURGER_INGREDIENTS[sourceId], { hintKey: "includedHint" }),
      group("drink", "chooseDrink", "radio", drinkOptions, { summaryAlways: true }),
      group("sauce", "chooseSauce", "radio", sauceOptions, { summaryAlways: true }),
      group("portion", "portion", "radio", [option("choice-fries-regular", "звичайна картопля", "bežné hranolky", 0, true), option("large-fries", "велика картопля", "veľké hranolky", 100)], { summaryAlways: true }),
      group("extras", "extras", "checkbox", burgerExtras({ ...product, id: sourceId })),
    ];
  }

  if (product.category === "pizza") {
    return [
      group("included", "included", "included", PIZZA_INGREDIENTS[product.id] || [], { hintKey: "includedHint" }),
      group("crust", "chooseCrust", "radio", [option("choice-crust-classic", "класичне", "klasické", 0, true), option("choice-crust-thin", "тонке", "tenké"), option("gluten-free-crust", "безглютенове", "bezlepkové", 200)], { summaryAlways: true }),
      group("extras", "extras", "checkbox", [option("extra-mozzarella", "додаткова моцарела", "extra mozzarella", 150), option("extra-salami", "додаткова салямі", "extra saláma", 180), option("extra-mushrooms", "печериці", "šampiňóny", 120), option("extra-olives", "оливки", "olivy", 100), option("extra-corn", "кукурудза", "kukurica", 100), option("jalapeno", "халапеньйо", "jalapeño", 80)]),
    ];
  }

  if (product.category === "sides") {
    const groups = [];
    if (product.id === "loaded-fries") groups.push(group("included", "included", "included", [option("cheddar-sauce", "чедерний соус", "čedarová omáčka", 0, true), option("bacon", "бекон", "slanina", 0, true), option("crispy-onion", "хрустка цибуля", "chrumkavá cibuľka", 0, true)], { hintKey: "includedHint" }));
    groups.push(group("seasoning", "seasoning", "radio", [option("choice-seasoning-classic", "класична сіль", "klasická soľ", 0, true), option("choice-seasoning-paprika", "копчена паприка", "údená paprika"), option("choice-seasoning-spicy", "гостра приправа", "pikantné korenie"), option("choice-seasoning-none", "без солі", "bez soli")], { summaryAlways: true }));
    groups.push(group("extras", "extras", "checkbox", [option("extra-ketchup", "кетчуп", "kečup", 80), option("extra-garlic-sauce", "часниковий соус", "cesnaková omáčka", 80), option("extra-bbq-sauce", "BBQ соус", "BBQ omáčka", 80), option("extra-cheese-sauce", "чедерний соус", "čedarová omáčka", 100)]));
    return groups;
  }

  if (product.category === "drinks") {
    const groups = [];
    if (product.id === "cola") groups.push(group("variant", "chooseCola", "radio", [option("choice-cola-original", "Original", "Original", 0, true), option("choice-cola-zero", "Zero", "Zero")], { summaryAlways: true }));
    if (product.id === "water") groups.push(group("variant", "chooseWater", "radio", [option("choice-water-sparkling", "газована", "sýtená", 0, true), option("choice-water-still", "негазована", "nesýtená")], { summaryAlways: true }));
    if (product.id === "lemonade") groups.push(group("sweetness", "chooseSweetness", "radio", [option("choice-sweet-normal", "звичайна", "bežná", 0, true), option("choice-sweet-less", "менш солодка", "menej sladká"), option("choice-sweet-none", "без цукру", "bez cukru")], { summaryAlways: true }));
    groups.push(group("ice", "chooseIce", "radio", iceOptions, { summaryAlways: true }));
    groups.push(group("extras", "extras", "checkbox", [option("extra-lemon", "додатковий лимон", "extra citrón", 30), option("extra-mint", "додаткова м'ята", "extra mäta", 30)]));
    return groups;
  }

  return [];
}

export function localizedLabel(item, locale) { return item?.label?.[locale] || item?.label?.uk || ""; }
