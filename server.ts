import express from "express";
import path from "path";
import fs from "node:fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import webPush, { PushSubscription } from "web-push";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@timeflow.local",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
}

type PushReminder = {
  taskId: string;
  title: string;
  body?: string;
  deadline: number;
  reminderTime: number;
};

const pushSubscriptions = new Map<string, PushSubscription>();
const scheduledReminderTimers = new Map<string, NodeJS.Timeout>();

// --- Persistent Push Store (Local JSON Database) ---
const PUSH_STORE_PATH = path.join(process.cwd(), "push_store.json");

interface PersistedData {
  subscriptions: Record<string, any>;
  reminders: Array<{ userId: string; reminder: any }>;
}

function loadPushStore(): PersistedData {
  try {
    if (fs.existsSync(PUSH_STORE_PATH)) {
      const raw = fs.readFileSync(PUSH_STORE_PATH, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to load push store:", err);
  }
  return { subscriptions: {}, reminders: [] };
}

function savePushStore(data: PersistedData) {
  try {
    fs.writeFileSync(PUSH_STORE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save push store:", err);
  }
}

// --- Simple Prompt Cache for Gemini API ---
type CacheEntry<T> = {
  data: T;
  expiry: number;
};

class SimpleCache {
  private store = new Map<string, CacheEntry<any>>();
  private maxAgeMs: number;

  constructor(maxAgeMinutes = 15) {
    this.maxAgeMs = maxAgeMinutes * 60 * 1000;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: any) {
    this.store.set(key, {
      data,
      expiry: Date.now() + this.maxAgeMs
    });
  }

  clear() {
    this.store.clear();
  }
}

const aiCache = new SimpleCache(15); // Cache prompts for 15 minutes

function schedulePushReminder(userId: string, reminder: PushReminder) {
  const timerKey = `${userId}:${reminder.taskId}`;
  const previousTimer = scheduledReminderTimers.get(timerKey);
  if (previousTimer) {
    clearTimeout(previousTimer);
    scheduledReminderTimers.delete(timerKey);
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  if (reminder.reminderTime <= Date.now()) return;

  const delayMs = Math.min(reminder.reminderTime - Date.now(), 2147483647);
  const timer = setTimeout(async () => {
    scheduledReminderTimers.delete(timerKey);
    const subscription = pushSubscriptions.get(userId);
    if (!subscription) return;

    try {
      await webPush.sendNotification(subscription, JSON.stringify({
        title: "Timeflow nhắc hạn",
        body: reminder.body || `Sắp đến hạn: ${reminder.title}`,
        tag: `deadline-${reminder.taskId}-${reminder.deadline}`,
        url: "/tasks",
        taskId: reminder.taskId,
      }));
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        pushSubscriptions.delete(userId);
      }
      console.warn("Push reminder failed", error?.message || error);
    }
  }, delayMs);

  scheduledReminderTimers.set(timerKey, timer);
}

// Initialize GoogleGenAI client (lazy server-side initialization to avoid crashing on launch if API key is not set yet)
let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

app.use(express.json());

// API endpoints

app.get("/api/push/public-key", (_req, res) => {
  res.json({
    enabled: Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY),
    publicKey: VAPID_PUBLIC_KEY,
  });
});

app.post("/api/push/subscribe", (req, res) => {
  const { userId, subscription } = req.body || {};
  if (!userId || !subscription?.endpoint) {
    return res.status(400).json({ error: "userId and subscription are required" });
  }

  pushSubscriptions.set(String(userId), subscription);

  // Persist push subscription to local store
  const store = loadPushStore();
  store.subscriptions[String(userId)] = subscription;
  savePushStore(store);

  res.json({ ok: true });
});

app.post("/api/push/schedule", (req, res) => {
  const { userId, reminders } = req.body || {};
  if (!userId || !Array.isArray(reminders)) {
    return res.status(400).json({ error: "userId and reminders are required" });
  }

  for (const [key, timer] of scheduledReminderTimers.entries()) {
    if (key.startsWith(`${userId}:`)) {
      clearTimeout(timer);
      scheduledReminderTimers.delete(key);
    }
  }

  const validReminders = reminders.filter((reminder: PushReminder) => (
    reminder &&
    typeof reminder.taskId === "string" &&
    typeof reminder.title === "string" &&
    typeof reminder.deadline === "number" &&
    typeof reminder.reminderTime === "number"
  ));

  // Persist reminders in local JSON store
  const store = loadPushStore();
  // Filter out any old reminders for this specific user
  store.reminders = store.reminders.filter((r) => r.userId !== String(userId));
  // Append new ones
  validReminders.forEach((reminder: PushReminder) => {
    store.reminders.push({ userId: String(userId), reminder });
  });
  savePushStore(store);

  // Schedule timers
  validReminders.forEach((reminder: PushReminder) => schedulePushReminder(String(userId), reminder));

  res.json({ ok: true, scheduled: scheduledReminderTimers.size });
});

// 1. AI Productivity Coach Daily Strategy feedback
app.post("/api/ai/coach", async (req, res) => {
  try {
    const { tasks, habits, goals, focusTimeMinutes, language } = req.body;

    const cacheKey = `coach:${language}:${focusTimeMinutes}:${JSON.stringify(tasks || [])}:${JSON.stringify(habits || [])}:${JSON.stringify(goals || [])}`;
    const cachedData = aiCache.get<{ feedback: string }>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Construct context summary
    let systemPrompt = "Bạn là Timeflow Coach, một chuyên gia cố vấn năng suất thông thái, tâm lý và súc tích. Bạn truyền cảm hứng, viết bằng Tiếng Việt súc tích, chuyên nghiệp.";
    if (language === 'en') {
      systemPrompt = "You are Timeflow Coach, an encouraging and highly strategic productivity mentor. You write concise, high-value, and motivating feedback in English.";
    }

    const prompt = `
Hãy viết một bản tin đánh giá chiến lược hàng ngày (Daily Strategy Review) siêu súc tích dạng Markdown dựa trên:
- Công việc hiện tại (Tasks): ${JSON.stringify(tasks || [])}
- Thói quen (Habits): ${JSON.stringify(habits || [])}
- Mục tiêu lớn (Goals): ${JSON.stringify(goals || [])}
- Thời lượng tập trung (Focus Time): ${focusTimeMinutes || 0} phút

Hãy chia nhỏ cấu trúc bản tin bằng các gạch đầu dòng rõ ràng:
1. 💡 **Phân tích Năng lực**: Tổng kết khách quan tiến độ hôm nay của tôi (khích lệ thói quen hoặc nhiệm vụ hoàn thành).
2. 🎯 **Bố trí Ưu tiên**: Việc gì là 'Chìa khóa' gặt hái lớn nhất hôm nay? Gợi ý hướng đi cụ thể để giải quyết nó.
3. 🌱 **Đồng hành Kỷ luật**: khích lệ giữ nhịp chuỗi ngày hoặc lời khuyên chiến thắng sự trì hoãn.
4. ✨ **Châm ngôn Ngày mới**: Một câu nói ngắn truyền ngọn lửa động lực.

**Nguyên tắc**: Viết ngắn gọn tuyệt đối (lưới 220 từ), xuống dòng phân tách đẹp mắt, nhiều emoji khích lệ thực tế. Tránh văn chương dông dài lý thuyết.
`;

    const response = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    const result = { feedback: response.text };
    aiCache.set(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    console.error("AI Coach Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// 2. AI Quick Task Generation (NLP interpretation)
app.post("/api/ai/quickadd", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const cacheKey = `quickadd:${prompt}`;
    const cachedData = aiCache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const systemPrompt = `Bạn là trợ lý đắc lực giúp bóc tách các đầu việc thô của người dùng thành danh sách các task có cấu trúc. Phân tích ngữ nghĩa thời gian để đề xuất deadline tương đối tính bằng giờ phát sinh từ thời điểm NGAY BÂY GIỜ. Trả về đúng định dạng JSON được yêu cầu. Không giải thích gì thêm ngoài JSON.`;

    const response = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Hãy bóc tách thành một danh sách các đầu việc có cấu trúc: "${prompt}"`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              description: "Danh sách các task bóc tách được",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Tên nhiệm vụ ngắn gọn rõ ràng bằng tiếng Việt" },
                  description: { type: Type.STRING, description: "Chi tiết nhiệm vụ hoặc ghi chú quan trọng" },
                  priority: { type: Type.STRING, description: "Mức độ ưu tiên: Low, Medium, High, hoặc Critical" },
                  estimatedTime: { type: Type.INTEGER, description: "Thời gian ước tính hoàn thành (phút), mặc định là 30 nếu không đề cập" },
                  deadlineHoursFromNow: { type: Type.NUMBER, description: "Mốc hạn chót dạng số giờ tương đối tính từ BÂY GIỜ (ví dụ: tối nay là 4, mai là 24, tuần sau là 168). Gửi null nếu không thấy mốc thời gian." }
                },
                required: ["title", "priority"]
              }
            }
          },
          required: ["tasks"]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    aiCache.set(cacheKey, data);
    res.json(data);
  } catch (error: any) {
    console.error("AI QuickAdd Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// 3. AI Task Breakdown into steps
app.post("/api/ai/breakdown", async (req, res) => {
  try {
    const { taskTitle, taskDescription } = req.body;
    if (!taskTitle) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const cacheKey = `breakdown:${taskTitle}:${taskDescription || ""}`;
    const cachedData = aiCache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const systemPrompt = `Bạn là chuyên gia phân rã công việc. Hãy chia nhỏ mọi ý tưởng hoặc nhiệm vụ lớn thành 3 đến 5 bước con (subtasks) khả thi, súc tích, thực hiện được ngay.`;

    const response = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Hãy chia nhỏ nhiệm vụ sau thành các bước hành động: "${taskTitle}" ${taskDescription ? `(Mô tả: ${taskDescription})` : ""}`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING, description: "Bước hành động cụ thể rõ ràng bằng tiếng Việt" }
            }
          },
          required: ["steps"]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    aiCache.set(cacheKey, data);
    res.json(data);
  } catch (error: any) {
    console.error("AI Breakdown Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// 4. AI Productivity Chat Assistant
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, language } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages are required" });
    }

    let systemInstruction = "Bạn là Timeflow Coach, một cố vấn quản lý thời gian và rèn luyện thói quen xuất chúng. Bạn chia sẻ các phương pháp khoa học (Pomodoro, Eisenhower, Time blocking) một cách thực tế, hóm hỉnh và giàu động lực bằng Tiếng Việt súc tích.";
    if (language === 'en') {
      systemInstruction = "You are Timeflow Coach, a brilliant time-management and habit building specialist. Keep answers strategic, structured, warm, and highly motivating in English.";
    }

    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    const response = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// 5. AI Task Insights and Dependency analysis (D3.js generation helper)
app.post("/api/ai/task-insights", async (req, res) => {
  try {
    const { tasks, language } = req.body;
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: "Tasks list is required" });
    }

    const cacheKey = `task-insights:${language}:${JSON.stringify(tasks)}`;
    const cachedData = aiCache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const systemPrompt = `Bạn là Timeflow Architect - Chuyên gia phân tích mối liên kết, sự lệ thuộc (dependencies) và lộ trình tối ưu hóa công việc. 
Nhiệm vụ của bạn là phân tích ngữ nghĩa các đầu việc mà người dùng cung cấp để:
1. Nhận diện các liên kết lệ thuộc tiềm ẩn hoặc trực tiếp giữa các nhiệm vụ (ví dụ: việc viết outline trước khi quay video, thiết lập ngân sách trước khi mua sắm, hoặc việc xây dựng bài tập trước khi dạy...)
2. Gom cụm các việc có liên quan mật thiết vào cùng một "group" (nhóm hoạt động, ví dụ: Học tập, Sức khỏe, Phát triển bản thân, Công việc).
3. Đưa ra phân tích súc tích (analysis) bằng Markdown chỉ rõ điểm nghẽn cổ chai (bottleneck) hoặc gợi ý "Đường găng" (Critical Path) để tối ưu năng suất.

TRẢ VỀ ĐÚNG định dạng JSON theo schema đã quy định. Không giải thích gì ngoài JSON.`;

    const userPrompt = `
Hãy phân tích danh sách nhiệm vụ sau để tạo mối liên kết dependencies và phân cụm group hoạt động cho đồ thị:
${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, description: t.description, priority: t.priority, status: t.status })))}

Vui lòng sinh tối thiểu các liên kết nếu có thể để đồ thị sinh động. Nếu không có quan hệ lệ thuộc trực tiếp, hãy tạo các liên kết "Bổ trợ" hoặc "Cùng nhóm dự án/nhãn" hoặc "Phương pháp đòn bẩy" (làm việc X giúp tạo đà làm việc Y).

Phần analysis viết bằng ${language === 'vi' ? 'Tiếng Việt' : 'English'} súc tích (khoảng 150-200 từ), sử dụng các gạch đầu dòng rõ ràng.
`;

    const response = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              description: "Danh sách các nút của đồ thị biểu diễn nhiệm vụ",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "ID gốc của nhiệm vụ" },
                  title: { type: Type.STRING, description: "Tiêu đề nhiệm vụ rút gọn siêu ngắn (dưới 25 ký tự)" },
                  priority: { type: Type.STRING, description: "Low, Medium, High, hoặc Critical" },
                  status: { type: Type.STRING, description: "Todo, InProgress, hoặc Completed" },
                  group: { type: Type.STRING, description: "Cụm danh mục phân loại hoạt động tiềm năng (ví dụ: Work, Personal, Learn, Project, Health...)" }
                },
                required: ["id", "title", "priority", "status", "group"]
              }
            },
            links: {
              type: Type.ARRAY,
              description: "Mối liên kết/mũi tên hướng quan hệ giữa các nhiệm vụ",
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING, description: "ID của nguồn nhiệm vụ đi trước hoặc chặn đầu" },
                  target: { type: Type.STRING, description: "ID của đích nhiệm vụ đi sau hoặc bị liên quan" },
                  type: { type: Type.STRING, description: "requires (yêu cầu đi trước), blocking (chặn tiến độ), related (liên quan bổ trợ), sequenced (tuần tự)" },
                  label: { type: Type.STRING, description: "Mô tả siêu ngắn về mối quan hệ bằng tiếng Việt (Ví dụ: 'Chuẩn bị cho', 'Trực thuộc', 'Có liên quan')" }
                },
                required: ["source", "target", "type", "label"]
              }
            },
            analysis: {
              type: Type.STRING,
              description: "Đánh giá phân tích bằng Markdown về nút thắt rủi ro trì hoãn hoặc gợi ý giải pháp sắp xếp lại thứ tự công việc"
            }
          },
          required: ["nodes", "links", "analysis"]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    aiCache.set(cacheKey, data);
    res.json(data);
  } catch (error: any) {
    console.error("AI Task Insights Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// Setup Vite Dev server or Serve build static directory depending on NODE_ENV
async function startServer() {
  // Load persisted push subscriptions and schedule active reminders on startup
  const store = loadPushStore();
  
  // Restore subscriptions to in-memory map
  for (const [userId, sub] of Object.entries(store.subscriptions)) {
    pushSubscriptions.set(userId, sub);
  }

  const now = Date.now();
  // Filter active (future) reminders and clean up expired ones
  const activeReminders = store.reminders.filter((item) => item.reminder.reminderTime > now);
  store.reminders = activeReminders;
  savePushStore(store);

  // Reschedule timers
  let restoredCount = 0;
  activeReminders.forEach((item) => {
    schedulePushReminder(item.userId, item.reminder);
    restoredCount++;
  });

  if (restoredCount > 0) {
    console.log(`[Push Server] Restored ${restoredCount} active push reminder timers.`);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

startServer();
