import fetch from "node-fetch";
import { config } from "dotenv";
import admin from "firebase-admin";
import { readFileSync } from "fs";
config();

// 🟡 Initialize Firebase
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export async function generateBlog() {
  const today = new Date().toISOString().split("T")[0];
  const timestamp = new Date().toISOString();
  const prompt = `
You're a Zimbabwean content creator called Vimbai. Today is ${today}. Write a blog post celebrating the beauty of Zimbabwe — the people, places, language, nature, culture, zvese.

Use a tone that mixes English, informal and friendly.

Make it sound like you're talking to a friend. Feel free to reminisce, share jokes, and add some vibes. Use headings (##), paragraphs, bold text, and hashtags at the end.
`;

  async function query(data) {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error(`❌ HF API error: ${response.statusText}`);
      const errorText = await response.text();
      throw new Error(errorText);
    }

    return await response.json();
  }

  const res = await query({
    model: "mistralai/Mistral-7B-Instruct-v0.2",
    messages: [
      {
        role: "user",
        content: prompt.trim(),
      },
    ],
  });

  const content = res?.choices?.[0]?.message?.content || "No response.";

  // ✅ Save to Firebase
  const doc = {
    author: "Vimbai",
    date: today,
    createdAt: timestamp,
    title: `Blog for ${today}`,
    content,
  };

  await db.collection("blogs").add(doc);

  console.log(`✅ Blog for ${today} uploaded to Firebase`);
}

generateBlog();
