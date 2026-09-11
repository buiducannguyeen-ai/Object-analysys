import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { image } = body || {};
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Vui lòng cung cấp dữ liệu hình ảnh (base64)." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Chưa cấu hình GEMINI_API_KEY. Vui lòng cấu hình biến môi trường GEMINI_API_KEY trong Vercel Settings > Environment Variables.",
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
      }
    }

    if (!responseText) {
      throw lastError || new Error("Không nhận được phản hồi từ mô hình AI.");
    }

    let parsedResult: any;
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Phản hồi từ AI không đúng định dạng JSON.");
      }
    }

    const safeObjects = Array.isArray(parsedResult.objects)
      ? parsedResult.objects.filter(
          (o: any) =>
            o &&
            typeof o.nameVi === "string" &&
            Array.isArray(o.box_2d) &&
            o.box_2d.length === 4
        )
      : [];

    return res.status(200).json({
      success: true,
      dominantObject: parsedResult.dominantObject || (safeObjects[0]?.nameVi ?? "Không xác định"),
      sceneSummary: parsedResult.sceneSummary || "Khung cảnh quan sát từ camera",
      objects: safeObjects,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error("Vercel api/detect error:", err);
    const isRateLimit = String(err).includes("429") || String(err).includes("RESOURCE_EXHAUSTED");
    return res.status(isRateLimit ? 429 : 500).json({
      error: isRateLimit
        ? "Hệ thống AI đang tạm thời đạt giới hạn tốc độ. Vui lòng đợi ít giây rồi thử lại."
        : (err.message || "Lỗi xử lý hình ảnh nhận diện đồ vật"),
      details: String(err),
    });
  }
}
