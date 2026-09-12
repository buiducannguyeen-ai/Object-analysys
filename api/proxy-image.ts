export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const targetUrl = req.query?.url as string;
  if (!targetUrl || !targetUrl.startsWith("http")) {
    return res.status(400).send("Invalid target URL");
  }

  try {
    const fetchRes = await fetch(targetUrl);
    if (!fetchRes.ok) {
      return res.status(fetchRes.status).send("Failed to fetch image");
    }
    const buffer = await fetchRes.arrayBuffer();
    const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    return res.status(500).send("Proxy error: " + (err.message || String(err)));
  }
}
