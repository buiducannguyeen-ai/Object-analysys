function findGeminiKey(): { key: string; foundKeyName: string } {
  const names = [
    "GEMINI_API_KEY",
    "GEMINI_KEY",
    "GOOGLE_API_KEY",
    "GOOGLE_GEMINI_API_KEY",
    "VITE_GEMINI_API_KEY",
    "GEMINI_APIKEY",
  ];

  for (const name of names) {
    const val = process.env[name];
    if (val && typeof val === "string" && val.trim().length > 0) {
      return { key: val.trim().replace(/^["']|["']$/g, ""), foundKeyName: name };
    }
  }

  for (const [k, v] of Object.entries(process.env)) {
    const cleanKey = k.trim().toUpperCase();
    if (cleanKey.includes("GEMINI") && (cleanKey.includes("KEY") || cleanKey.includes("API"))) {
      if (v && typeof v === "string" && v.trim().length > 0) {
        return { key: v.trim().replace(/^["']|["']$/g, ""), foundKeyName: k };
      }
    }
  }

  return { key: "", foundKeyName: "" };
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { key, foundKeyName } = findGeminiKey();
  const envKeysDetected = Object.keys(process.env).filter(
    (k) =>
      !k.startsWith("VERCEL_") &&
      !k.startsWith("AWS_") &&
      !k.startsWith("NODE_") &&
      !k.startsWith("npm_")
  );

  return res.status(200).json({
    status: "ok",
    hasKey: Boolean(key && key.length > 0),
    foundKeyName: foundKeyName || null,
    envKeysDetected,
    timestamp: Date.now(),
    platform: "vercel",
  });
}
