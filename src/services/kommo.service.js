import axios from "axios";

const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL;
const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN;

export async function getContact(contactId) {
  try {
    const response = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts/${contactId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}`
      }
    });

    const contact = response.data;

    // Nombre (viene directo en "name")
    const name = contact.name;

    // Número: buscar en custom_fields_values
    let phone = null;
    if (contact.custom_fields_values) {
      const phoneField = contact.custom_fields_values.find(
        f => f.field_code === "PHONE"
      );
      if (phoneField && phoneField.values && phoneField.values.length > 0) {
        phone = phoneField.values[0].value;
      }
    }

    return { name, phone };

  } catch (error) {
    console.error("Error en getContact:", error.response?.data || error.message);
    throw error;
  }
}