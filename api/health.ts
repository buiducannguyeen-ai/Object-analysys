export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  return res.status(200).json({
    status: "ok",
    hasKey: !!process.env.GEMINI_API_KEY,
    timestamp: Date.now(),
    platform: "vercel",
  });
}
