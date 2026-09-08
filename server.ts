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
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: `Bạn là hệ thống thị giác AI chuyên nhận diện đồ vật theo thời gian thực từ camera/webcam/video qua mạng wifi/internet.
Hãy phân tích hình ảnh và nhận diện tất cả các đồ vật, vật dụng, con người, thiết bị xuất hiện rõ trong khung hình.
Yêu cầu:
1. Nhận diện từ 1 đến 10 đồ vật rõ ràng nhất.
2. Trả về tên Tiếng Việt (nameVi) chuẩn xác, tự nhiên, dễ hiểu (ví dụ: "Điện thoại", "Cốc nước", "Bàn phím máy tính", "Kính mắt", "Đồng hồ", "Người", "Bút viết", "Chai nước", "Tai nghe", "Ba lô", "Ghế", "Màn hình máy tính").
3. Trả về tên Tiếng Anh (nameEn).
4. Phân loại (category) như: "Thiết bị điện tử", "Đồ gia dụng & Bếp", "Văn phòng phẩm", "Thời trang & Phụ kiện", "Đồ uống & Thực phẩm", "Nội thất", "Người & Cá nhân", "Khác".
5. Bounding box (box_2d) theo chuẩn [ymin, xmin, ymax, xmax] trong thang đo 0 đến 1000 tương ứng với vị trí đồ vật trong ảnh.
6. sceneSummary: Tóm tắt 1 câu ngắn gọn bối cảnh (ví dụ: "Bàn làm việc với máy tính xách tay và cốc nước").
7. dominantObject: Tên đồ vật nổi bật và lớn nhất ở trọng tâm khung hình.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
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
          },
        },
      });

      const responseText = response.text || "{}";
      const resultData = JSON.parse(responseText);

      return res.json({
        success: true,
        dominantObject: resultData.dominantObject || "Không xác định",
        sceneSummary: resultData.sceneSummary || "",
        objects: Array.isArray(resultData.objects) ? resultData.objects : [],
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error("Lỗi nhận diện đồ vật:", err);
      return res.status(500).json({
        error: err.message || "Lỗi xử lý hình ảnh nhận diện đồ vật",
        details: String(err),
      });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
