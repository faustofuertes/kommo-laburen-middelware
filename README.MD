# Kommo ↔ Laburen Integration Middleware — V1

**Kommo ↔ Laburen Integration Middleware — V1** es una integración diseñada para recibir mensajes entrantes desde **Kommo** mediante *webhooks*, filtrar y procesar únicamente aquellos provenientes de **WhatsApp**, enviarlos al **Agente de Laburen.com**, y reenviar las respuestas tanto a **Kommo** —registrándolas como notas internas— como a **WhatsApp Business API (WABA)**.  

Este servicio actúa como un **bridge** (puente de comunicación) entre plataformas, garantizando que los mensajes fluyan de forma **bidireccional**, **segura** y **controlada**, manejando exclusivamente la comunicación basada en **WhatsApp** dentro del ecosistema Kommo.

---

## 🚀 Características principales

- Recibe mensajes de **Kommo** mediante webhook, filtrando únicamente aquellos provenientes de **WhatsApp**.
- Procesa y enruta los mensajes hacia el **Agente de Laburen.com**.
- Reenvía las respuestas generadas a **Kommo** (como nota interna) y a **WhatsApp Business API (WABA)**.
- Manejo de errores, reintentos y trazabilidad de eventos.
- Compatible con **mensajería asincrónica** y **webhooks seguros**.
- Implementación modular y extensible, preparada para futuras versiones o integración con nuevas plataformas.

---

## ⚙️ Arquitectura general

Kommo → [Webhook Receiver] → [Agente de Laburen.com] → [Kommo (nota) / WhatsApp API]

1. **Kommo Webhook:** envía los mensajes entrantes.
2. **Kommo ↔ Laburen Integration Middleware — V1:**
   - Recibe y valida el payload.
   - Filtra únicamente los mensajes provenientes de **WhatsApp**.
   - Envía los mensajes filtrados al **Agente de Laburen.com** para su procesamiento.
3. **Agente de Laburen.com:** genera una respuesta basada en el mensaje recibido.
4. **Middleware:** reenvía la respuesta hacia **Kommo** (registrándola como nota) y hacia **WhatsApp Business API (WABA)**.

---

## 🧩 Endpoints principales

| Método | Endpoint   | Descripción                           |
| ------ | ---------- | ------------------------------------- |
| `POST` | `/webhook` | Recibe mensajes entrantes desde Kommo |

---

## 🧾 Identificadores y Campos Internos

El middleware utiliza distintos **identificadores (IDs)** provenientes de **Kommo** y **Laburen**, que son esenciales para mantener la trazabilidad de los mensajes, las conversaciones y los contactos.  
A continuación se explica el uso y propósito de cada uno.

### 🔹 `contact_id`
- **Origen:** Kommo  
- **Descripción:** ID único del **contacto** en el CRM Kommo.  
- **Uso:**  
  - Identifica al usuario dentro de Kommo.  
  - Se usa como `visitorId` en Laburen para mantener coherencia entre ambas plataformas.  
  - Es la clave primaria en el `conversationMap` para reusar conversaciones activas.

### 🔹 `element_id`
- **Origen:** Kommo  
- **Descripción:** ID del **lead** (negocio) o elemento principal asociado al contacto.  
- **Uso:**  
  - Permite asociar notas y respuestas dentro del lead correspondiente.  
  - Se utiliza para pausar o reanudar interacciones (`agente pausar` / `agente seguir`).  
  - Sirve como referencia en logs y payloads.

### 🔹 `conversationMap`
- **Origen:** Middleware (local)  
- **Descripción:** Mapa en memoria que asocia `contact_id` → `conversationId` de Laburen.  
- **Uso:**  
  - Evita crear múltiples conversaciones en Laburen para el mismo contacto.  
  - Permite continuar el contexto conversacional.

### 🔹 `idsPausados`
- **Origen:** Middleware (local)  
- **Descripción:** Set en memoria que mantiene los `element_id` (leads) pausados.  
- **Uso:**  
  - Si un lead está en este set, los mensajes **no se envían a Laburen**.  
  - Controlado por los comandos:  
    - `"agente pausar"` → agrega el `element_id` al set.  
    - `"agente seguir"` → lo elimina.

---

## 🔐 Variables de entorno

### Laburen.com
| Variable                | Descripción                            |
| ----------------------- | -------------------------------------- |
| `LABUREN_BASE_URL`      | URL base de la API de Laburen.com      |
| `LABUREN_AGENT_ID`      | ID del agente en Laburen.com           |
| `LABUREN_AUTHORIZATION` | Token de autorización para Laburen.com |

### Kommo
| Variable                    | Descripción                       |
| --------------------------- | --------------------------------- |
| `KOMMO_CLIENT_ID`           | ID de cliente en Kommo            |
| `KOMMO_CLIENT_SECRET`       | Secreto de cliente en Kommo       |
| `KOMMO_LONG_DURATION_TOKEN` | Token de larga duración de Kommo  |
| `KOMMO_BASE_URL`            | URL base de la instancia de Kommo |
| `KOMMO_REDIRECT_URI`        | URI de redirección para OAuth     |

### WhatsApp Business API
| Variable              | Descripción                                |
| --------------------- | ------------------------------------------ |
| `WPP_API_URL`         | URL de la API de WhatsApp (Graph API)      |
| `WPP_PHONE_NUMBER_ID` | ID del número de teléfono de WhatsApp      |
| `WPP_ACCESS_TOKEN`    | Token de acceso para WhatsApp Business API |

---

## 🧰 Tecnologías utilizadas

- **Node.js / Express** – Servidor y manejo de rutas.
- **Axios** – Para realizar requests HTTP externos.
- **Dotenv** – Gestión de variables de entorno.
- **WABA (WhatsApp Business API)** – Integración con la API de Meta para WhatsApp.
- **Kommo REST API** – Comunicación con el CRM Kommo.

---

## 🧩 Estructura del proyecto

- **src/**
  - `index.js` — Punto de entrada
  - **controllers/**
    - `kommoController.js` — Lógica de endpoints de Kommo
  - **routes/**
    - `kommoRoutes.js` — Rutas relacionadas con Kommo
  - **services/**
    - `kommoService.js` — Cliente y lógica Kommo API
    - `laburenService.js` — Lógica específica para Laburen.com
    - `wppService.js` — Cliente WhatsApp API
  - **utils/**
    - `normalizer.js` — Funciones de normalización de datos
    - `parser.js` — Funciones de parsing
    - `rawBody.js` — Middleware raw body