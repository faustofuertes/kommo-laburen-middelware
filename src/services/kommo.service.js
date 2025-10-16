import axios from "axios";
const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL;
const KOMMO_LONG_DURATION_TOKEN = process.env.KOMMO_LONG_DURATION_TOKEN;

export async function getContact(contactId) {
  try {
    const response = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts/${contactId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${KOMMO_LONG_DURATION_TOKEN}`
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

export async function addNoteToLead(leadId, noteText) {
  try {
    const response = await axios.post(
      `${KOMMO_BASE_URL}/api/v4/leads/${leadId}/notes`,
      [
        {
          note_type: "extended_service_message",
          "params": {
            "service": "Example service",
            "text": noteText
          }
        }
      ],
      {
        headers: {
          Authorization: `Bearer ${KOMMO_LONG_DURATION_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log('✅ Mensaje enviado a Kommo');
    return response.data;
  } catch (error) {
    console.error("Error al agregar nota al lead:", error.response?.data || error.message);
    throw error;
  }
}