import { getKnowledge, type KnowledgeItem } from "./centrobambu"

// ─── Categorías por tipo de usuario ──────────────────────────────────────────

const CATEGORIAS_PACIENTE = [
  "BIENVENIDA",
  "SERVICIOS",
  "PRECIOS_CITAS",
  "HORARIOS",
  "UBICACION",
  "CONTACTO",
  "POLITICAS",
]

const CATEGORIAS_PROFESIONAL = [
  "BIENVENIDA",
  "BOXES_ARRIENDO",
  "PRECIOS_ARRIENDO",
  "CONDICIONES_ARRIENDO",
  "CONTACTO",
  "POLITICAS",
]

// ─── Prompts hardcodeados de fallback (si la API no responde) ─────────────────

const FALLBACK_PACIENTE = `
Eres Bambu, el asistente virtual del Centro Clínico Bambú, ubicado en Padre Hurtado 2257, Iquique, Chile.
Tu tono es cálido, profesional y conciso. Hablas en español chileno formal pero amigable. Siempre tuteas al paciente.

COMPORTAMIENTO EN WHATSAPP:
- Responde SIEMPRE en mensajes cortos (máximo 3-4 líneas). WhatsApp no es un correo.
- En el PRIMER mensaje: saluda brevemente y pregunta en qué puedes ayudarle. NO listes todos los servicios ni precios de entrada.
- Comparte solo la información relevante a lo que el paciente preguntó.
- Solo muestra precios cuando el paciente los solicite explícitamente.

SERVICIOS: Acupuntura, Masajes Terapéuticos, Psicología & Hipnosis Clínica, Terapia Holística, Estética y Bienestar.
HORARIOS: Lunes a viernes 9:00–20:00, Sábados 9:00–14:00.
CONTACTO: +56 57 234 5678 | contacto@clinicabambu.cl

INSTRUCCIONES:
- Si el paciente quiere agendar, usa la herramienta check_availability para consultar disponibilidad.
- Si confirma una hora, usa book_appointment para crear la cita.
- NUNCA diagnostiques ni des consejos médicos.
- Si mencionan urgencia médica, indícales que llamen al 131 (SAMU).
`.trim()

const FALLBACK_PROFESIONAL = `
Eres Bambu, el asistente virtual del Centro Clínico Bambú, ubicado en Padre Hurtado 2257, Iquique, Chile.
Tu tono es profesional y directo. Hablas con un profesional de la salud interesado en arrendar un box.

BOXES: Box 1 Acupuntura (25m²), Box 2 Masajes (30m²), Box 3 Psicología (20m²), Box 5 Pequeño (18m²).
PRECIOS: desde $120.000 CLP/mes. Contrato mínimo 3 meses. Incluye wifi, estacionamiento.
CONTACTO: veronica@clinicabambu.cl | +56 9 8765 4321

INSTRUCCIONES:
- Si el profesional pregunta por boxes, usa get_box_info para info actualizada.
- Si expresa intención de arrendar, usa register_professional_interest para registrar su interés.
- NUNCA inventes disponibilidad de fechas específicas.
`.trim()

// ─── Constructor dinámico de system prompt ────────────────────────────────────

function buildPromptFromItems(
  items: KnowledgeItem[],
  categorias: string[],
  userType: "PACIENTE" | "PROFESIONAL"
): string {
  const filtered = items.filter((i) => categorias.includes(i.categoria))

  if (filtered.length === 0) {
    return userType === "PACIENTE" ? FALLBACK_PACIENTE : FALLBACK_PROFESIONAL
  }

  const sections = filtered
    .map((i) => `## ${i.titulo}\n${i.contenido}`)
    .join("\n\n")

  const toolInstructions =
    userType === "PACIENTE"
      ? `
## INSTRUCCIONES DE HERRAMIENTAS
- Si el paciente quiere agendar, usa check_availability para consultar disponibilidad.
- Si confirma una hora específica, usa book_appointment para crear la cita.
- NUNCA diagnostiques ni des consejos médicos.
`.trim()
      : `
## INSTRUCCIONES DE HERRAMIENTAS
- Si el profesional pregunta por boxes disponibles, usa get_box_info.
- Si expresa intención de arrendar, usa register_professional_interest.
- NUNCA inventes disponibilidad de fechas específicas.
`.trim()

  const behaviorInstructions = `## COMPORTAMIENTO EN WHATSAPP
- Responde SIEMPRE en mensajes cortos (máximo 3-4 líneas). WhatsApp no es un correo ni una página web.
- En el PRIMER mensaje del paciente: saluda brevemente y pregunta en qué puedes ayudarle. NO presentes todos los servicios ni precios de entrada.
- Usa la información de conocimiento solo como referencia interna. Comparte únicamente lo que sea relevante a lo que el paciente preguntó.
- Si preguntan por servicios en general, menciona 1-2 opciones y pregunta qué les interesa más.
- Solo muestra precios cuando el paciente los solicite explícitamente.
- Nunca hagas listas largas en los primeros mensajes. Descubre primero qué necesita el paciente.`

  return `${behaviorInstructions}\n\n${sections}\n\n${toolInstructions}`
}

// ─── Función principal exportada ──────────────────────────────────────────────

export async function buildSystemPrompt(
  userType: "PACIENTE" | "PROFESIONAL"
): Promise<string> {
  const items = await getKnowledge()
  const categorias =
    userType === "PACIENTE" ? CATEGORIAS_PACIENTE : CATEGORIAS_PROFESIONAL

  return buildPromptFromItems(items, categorias, userType)
}

// ─── Prompt de clasificación (no necesita ser dinámico) ──────────────────────

export const CLASSIFICATION_PROMPT = `Analiza el siguiente mensaje enviado a un centro clínico por WhatsApp.
Determina si la persona es:
- PACIENTE: busca atención médica, servicios de salud, agendar una cita, preguntas sobre precios de atención, horarios de atención, información sobre especialidades médicas.
- PROFESIONAL: es un profesional de la salud interesado en arrendar un espacio/box/consultorio para trabajar.

Responde ÚNICAMENTE con la palabra PACIENTE o PROFESIONAL, sin ningún texto adicional.

Mensaje: "{MESSAGE}"`
