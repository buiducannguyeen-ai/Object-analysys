import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Handle json payload with enough headroom for base64 images
  app.use(express.json({ limit: "25mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hasKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: Date.now(),
    });
  });

  // Proxy image endpoint to prevent canvas CORS tainting on sample images
  app.get("/api/proxy-image", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl || !targetUrl.startsWith("http")) {
        return res.status(400).send("Invalid target URL");
      }
      const fetchRes = await fetch(targetUrl);
      if (!fetchRes.ok) {
        return res.status(fetchRes.status).send("Failed to fetch image");
      }
      const buffer = await fetchRes.arrayBuffer();
      const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error("Proxy image error:", err);
      return res.status(500).send("Proxy error");
    }
  });

  // Object detection endpoint
  app.post("/api/detect", async (req, res) => {
    try {
      const { image, mode } = req.body;
      if (!image || typeof image !== "string") {
        return res.status(400).json({ error: "Vui lòng cung cấp dữ liệu hình ảnh (base64)." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Chưa cấu hình GEMINI_API_KEY trong hệ thống. Vui lòng kiểm tra mục Settings > Secrets.",
        });
      }

      // Extract raw base64 data & mime type
      const mimeMatch = image.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const base64Data = image.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, "");

      const ai = getAi();
      const promptText = `Bạn là hệ thống thị giác AI chuyên nhận diện đồ vật theo thời gian thực từ camera/webcam/video qua mạng wifi/internet.
Hãy phân tích hình ảnh và nhận diện tất cả các đồ vật, vật dụng, con người, thiết bị xuất hiện rõ trong khung hình.
Yêu cầu:
1. Nhận diện từ 1 đến 10 đồ vật rõ ràng nhất.
2. Trả về tên Tiếng Việt (nameVi) chuẩn xác, tự nhiên, dễ hiểu (ví dụ: "Điện thoại", "Cốc nước", "Bàn phím máy tính", "Kính mắt", "Đồng hồ", "Người", "Bút viết", "Chai nước", "Tai nghe", "Ba lô", "Ghế", "Màn hình máy tính").
3. Trả về tên Tiếng Anh (nameEn).
4. Phân loại (category) như: "Thiết bị điện tử", "Đồ gia dụng & Bếp", "Văn phòng phẩm", "Thời trang & Phụ kiện", "Đồ uống & Thực phẩm", "Nội thất", "Người & Cá nhân", "Khác".
5. Bounding box (box_2d) theo chuẩn [ymin, xmin, ymax, xmax] trong thang đo 0 đến 1000 tương ứng với vị trí đồ vật trong ảnh.
6. sceneSummary: Tóm tắt 1 câu ngắn gọn bối cảnh (ví dụ: "Bàn làm việc với máy tính xách tay và cốc nước").
7. dominantObject: Tên đồ vật nổi bật và lớn nhất ở trọng tâm khung hình.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          dominantObject: {
            type: Type.STRING,
            description: "Tên đồ vật nổi bật nhất bằng tiếng Việt",
          },
          sceneSummary: {
            type: Type.STRING,
            description: "Tóm tắt khung cảnh ngắn gọn bằng tiếng Việt",
          },
          objects: {
            type: Type.ARRAY,
            description: "Danh sách các đồ vật nhận diện được",
            items: {
              type: Type.OBJECT,
              properties: {
                nameVi: {
                  type: Type.STRING,
                  description: "Tên đồ vật bằng tiếng Việt",
                },
                nameEn: {
                  type: Type.STRING,
                  description: "Tên tiếng Anh",
                },
                category: {
                  type: Type.STRING,
                  description: "Danh mục phân loại bằng tiếng Việt",
                },
                confidence: {
                  type: Type.NUMBER,
                  description: "Độ tin cậy từ 0.70 đến 0.99",
                },
                description: {
                  type: Type.STRING,
                  description: "Mô tả ngắn về vị trí hoặc màu sắc",
                },
                box_2d: {
                  type: Type.ARRAY,
                  description: "[ymin, xmin, ymax, xmax] từ 0 đến 1000",
                  items: { type: Type.INTEGER },
                },
              },
              required: ["nameVi", "nameEn", "category", "confidence", "box_2d"],
            },
          },
        },
        required: ["dominantObject", "sceneSummary", "objects"],
      };

      // Priority list of models with fallback in case of high load
      const candidateModels = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
      let lastError: any = null;
      let responseText = "";

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
            config: {
              responseMimeType: "application/json",
              responseSchema,
            },
          });

          if (response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${modelName} gặp sự cố:`, err?.message || err);
          // Try next model
        }
      }

      if (!responseText) {
        throw lastError || new Error("Không nhận được phản hồi từ mô hình AI.");
      }

      // Clean markdown fences if any
      let cleanedJson = responseText.trim();
      if (cleanedJson.startsWith("```json")) {
        cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/```$/, "").trim();
      } else if (cleanedJson.startsWith("```")) {
        cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/```$/, "").trim();
      }

      let resultData: any = {};
      try {
        resultData = JSON.parse(cleanedJson);
      } catch (parseErr) {
        // Fallback: extract substring between first { and last }
        const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            resultData = JSON.parse(jsonMatch[0]);
          } catch (nestedErr) {
            console.warn("Lỗi phân tích cú pháp JSON phụ:", nestedErr);
            resultData = {
              dominantObject: "Không xác định",
              sceneSummary: "Đã phân tích nhưng cấu trúc dữ liệu chưa chuẩn.",
              objects: [],
            };
          }
        } else {
          resultData = {
            dominantObject: "Không xác định",
            sceneSummary: "Phản hồi văn bản từ AI: " + cleanedJson.slice(0, 100),
            objects: [],
          };
        }
      }

      return res.json({
        success: true,
        dominantObject: resultData.dominantObject || "Không xác định",
        sceneSummary: resultData.sceneSummary || "",
        objects: Array.isArray(resultData.objects) ? resultData.objects : [],
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error("Lỗi nhận diện đồ vật:", err);
      const isRateLimit = String(err).includes("429") || String(err).includes("RESOURCE_EXHAUSTED");
      return res.status(isRateLimit ? 429 : 500).json({
        error: isRateLimit
          ? "Hệ thống AI đang tạm thời đạt giới hạn tốc độ. Vui lòng đợi ít giây rồi thử lại."
          : (err.message || "Lỗi xử lý hình ảnh nhận diện đồ vật"),
        details: String(err),
      });
    }
  });

  // Global API error middleware ensuring JSON response
  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("API uncaught error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Lỗi xử lý yêu cầu API",
    });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
