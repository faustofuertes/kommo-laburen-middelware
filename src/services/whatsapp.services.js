import fetch from "node-fetch";

const URL = process.env.WPP_API_URL
const PHONE_NUMBER_ID = process.env.WPP_PHONE_NUMBER_ID;
const TOKEN = process.env.WPP_ACCESS_TOKEN;

export async function sendWppMessage(to, message) {
  const url = `${URL}/${PHONE_NUMBER_ID}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { message }
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("Error sending message.", error);
  }
}