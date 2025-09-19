import fetch from "node-fetch";

const WPP_API_URL = process.env.WPP_API_URL;
const WPP_API_TOKEN = process.env.WPP_API_TOKEN;

export async function sendWppMessage({ to, message, contactName, leadId, chatId }) {
  try {
    const res = await fetch(WPP_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WPP_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp", // si usás WhatsApp Cloud API
        to,
        type: "text",
        text: {
          body: message
        },
        context: {
          contactName,
          leadId,
          chatId
        }
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`WPP API error ${res.status}: ${JSON.stringify(data)}`);
    }

    return data;
  } catch (err) {
    console.error("Error enviando mensaje a WPP:", err);
    throw err;
  }
}