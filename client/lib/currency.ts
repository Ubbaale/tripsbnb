const CURRENCY_CONFIG: Record<string, { symbol: string; position: "prefix" | "suffix"; decimals: number }> = {
  usd: { symbol: "$", position: "prefix", decimals: 2 },
  eur: { symbol: "\u20AC", position: "prefix", decimals: 2 },
  gbp: { symbol: "\u00A3", position: "prefix", decimals: 2 },
  jpy: { symbol: "\u00A5", position: "prefix", decimals: 0 },
  cny: { symbol: "\u00A5", position: "prefix", decimals: 2 },
  aud: { symbol: "A$", position: "prefix", decimals: 2 },
  cad: { symbol: "C$", position: "prefix", decimals: 2 },
  chf: { symbol: "CHF", position: "prefix", decimals: 2 },
  inr: { symbol: "\u20B9", position: "prefix", decimals: 2 },
  sgd: { symbol: "S$", position: "prefix", decimals: 2 },
  hkd: { symbol: "HK$", position: "prefix", decimals: 2 },
  nzd: { symbol: "NZ$", position: "prefix", decimals: 2 },
  sek: { symbol: "kr", position: "suffix", decimals: 2 },
  nok: { symbol: "kr", position: "suffix", decimals: 2 },
  dkk: { symbol: "kr", position: "suffix", decimals: 2 },
  zar: { symbol: "R", position: "prefix", decimals: 2 },
  brl: { symbol: "R$", position: "prefix", decimals: 2 },
  mxn: { symbol: "MX$", position: "prefix", decimals: 2 },
  krw: { symbol: "\u20A9", position: "prefix", decimals: 0 },
  thb: { symbol: "\u0E3F", position: "prefix", decimals: 2 },
  aed: { symbol: "AED", position: "prefix", decimals: 2 },
  sar: { symbol: "SAR", position: "prefix", decimals: 2 },
  try: { symbol: "\u20BA", position: "prefix", decimals: 2 },
  pln: { symbol: "z\u0142", position: "suffix", decimals: 2 },
  kes: { symbol: "KSh", position: "prefix", decimals: 2 },
  tzs: { symbol: "TSh", position: "prefix", decimals: 0 },
  ngn: { symbol: "\u20A6", position: "prefix", decimals: 2 },
  egp: { symbol: "E\u00A3", position: "prefix", decimals: 2 },
  myr: { symbol: "RM", position: "prefix", decimals: 2 },
  php: { symbol: "\u20B1", position: "prefix", decimals: 2 },
  idr: { symbol: "Rp", position: "prefix", decimals: 0 },
  vnd: { symbol: "\u20AB", position: "suffix", decimals: 0 },
  cop: { symbol: "COL$", position: "prefix", decimals: 0 },
  ars: { symbol: "AR$", position: "prefix", decimals: 2 },
  clp: { symbol: "CL$", position: "prefix", decimals: 0 },
  pen: { symbol: "S/", position: "prefix", decimals: 2 },
  qar: { symbol: "QAR", position: "prefix", decimals: 2 },
  bdt: { symbol: "\u09F3", position: "prefix", decimals: 2 },
  pkr: { symbol: "Rs", position: "prefix", decimals: 2 },
  lkr: { symbol: "Rs", position: "prefix", decimals: 2 },
};

export function formatPrice(cents: number | null | undefined, currency: string = "usd", showDecimals: boolean = false): string {
  if (cents === null || cents === undefined) return "";
  const config = CURRENCY_CONFIG[currency.toLowerCase()] || { symbol: currency.toUpperCase(), position: "prefix", decimals: 2 };
  const amount = cents / 100;
  const formatted = showDecimals
    ? amount.toFixed(config.decimals)
    : config.decimals === 0
      ? Math.round(amount).toString()
      : amount.toFixed(0);

  if (config.position === "suffix") {
    return `${formatted} ${config.symbol}`;
  }
  return `${config.symbol}${formatted}`;
}

export function formatPriceDetailed(cents: number | null | undefined, currency: string = "usd"): string {
  return formatPrice(cents, currency, true);
}

export function getCurrencySymbol(currency: string = "usd"): string {
  const config = CURRENCY_CONFIG[currency.toLowerCase()];
  return config ? config.symbol : currency.toUpperCase();
}

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_CONFIG).map((code) => ({
  code: code.toUpperCase(),
  symbol: CURRENCY_CONFIG[code].symbol,
  name: getCurrencyName(code),
}));

function getCurrencyName(code: string): string {
  const names: Record<string, string> = {
    usd: "US Dollar",
    eur: "Euro",
    gbp: "British Pound",
    jpy: "Japanese Yen",
    cny: "Chinese Yuan",
    aud: "Australian Dollar",
    cad: "Canadian Dollar",
    chf: "Swiss Franc",
    inr: "Indian Rupee",
    sgd: "Singapore Dollar",
    hkd: "Hong Kong Dollar",
    nzd: "New Zealand Dollar",
    sek: "Swedish Krona",
    nok: "Norwegian Krone",
    dkk: "Danish Krone",
    zar: "South African Rand",
    brl: "Brazilian Real",
    mxn: "Mexican Peso",
    krw: "South Korean Won",
    thb: "Thai Baht",
    aed: "UAE Dirham",
    sar: "Saudi Riyal",
    try: "Turkish Lira",
    pln: "Polish Zloty",
    kes: "Kenyan Shilling",
    tzs: "Tanzanian Shilling",
    ngn: "Nigerian Naira",
    egp: "Egyptian Pound",
    myr: "Malaysian Ringgit",
    php: "Philippine Peso",
    idr: "Indonesian Rupiah",
    vnd: "Vietnamese Dong",
    cop: "Colombian Peso",
    ars: "Argentine Peso",
    clp: "Chilean Peso",
    pen: "Peruvian Sol",
    qar: "Qatari Riyal",
    bdt: "Bangladeshi Taka",
    pkr: "Pakistani Rupee",
    lkr: "Sri Lankan Rupee",
  };
  return names[code.toLowerCase()] || code.toUpperCase();
}
