import fetch from "node-fetch";
import { config } from "dotenv";
import admin from "firebase-admin";

config();

let serviceAccount;

try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env variable");
  }
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} catch (error) {
  console.error("Failed to parse Firebase service account JSON from env:", error);
  process.exit(1);
}

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

generateBlog().catch((err) => {
  console.error("❌ Error generating blog:", err);
  process.exit(1);
});
