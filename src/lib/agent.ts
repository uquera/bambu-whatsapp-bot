import Anthropic from "@anthropic-ai/sdk"
import type { Message } from "@prisma/client"
import { buildSystemPrompt, CLASSIFICATION_PROMPT } from "./prompts"
import {
  getDisponibilidad,
  createCita,
  getBoxes,
  createLead,
  getCitas,
  cancelarCita,
  reagendarCita,
} from "./centrobambu"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = "claude-sonnet-4-6"
const MAX_HISTORY_MESSAGES = 20

// ─── Contexto de la conversación (channelId para tools de citas) ─────────────

export interface AgentContext {
  channelId: string
  channel: string
}

// ─── Herramientas disponibles para el agente ─────────────────────────────────

const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "check_availability",
    description:
      "Consulta la disponibilidad de horas en el centro clínico para una fecha y especialidad dadas. Úsalo cuando el paciente quiera agendar una cita. SIEMPRE pasa la hora que el paciente solicitó en el campo 'hora'.",
    input_schema: {
      type: "object" as const,
      properties: {
        fecha: {
          type: "string",
          description: "Fecha en formato YYYY-MM-DD",
        },
        hora: {
          type: "string",
          description: "Hora exacta que el paciente solicitó, en formato HH:MM (ej: '14:00'). OBLIGATORIO pasarla para verificar si esa hora específica está disponible.",
        },
        especialidad: {
          type: "string",
          description:
            "Especialidad médica, ej: 'psicología', 'kinesiología', 'nutrición'",
        },
      },
      required: ["fecha", "hora"],
    },
  },
  {
    name: "book_appointment",
    description:
      "Crea una solicitud de cita NUEVA para el paciente. Úsalo SOLO para citas nuevas (paciente sin citas activas o que quiere una cita adicional). ⚠️ NUNCA uses esta herramienta para reagendar — si el paciente ya tiene una cita y quiere cambiar horario, usa reschedule_appointment. La cita queda PENDIENTE — el equipo del centro la confirma.",
    input_schema: {
      type: "object" as const,
      properties: {
        pacienteNombre: { type: "string", description: "Nombre completo del paciente" },
        pacienteEmail: { type: "string", description: "Correo electrónico del paciente para enviar la confirmación" },
        pacienteTelefono: { type: "string", description: "Teléfono del paciente en formato E.164 (opcional)" },
        fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
        hora: { type: "string", description: "Hora en formato HH:MM — debe ser la hora que check_availability confirmó como disponible=true" },
        especialidad: { type: "string", description: "Especialidad médica" },
        motivoConsulta: { type: "string", description: "Motivo de consulta o descripción breve de lo que el paciente quiere trabajar o tratar (opcional pero recomendado)" },
      },
      required: ["pacienteNombre", "pacienteEmail", "fecha", "hora", "especialidad"],
    },
  },
  {
    name: "get_my_appointments",
    description:
      "Consulta las próximas citas del paciente actual. Úsalo cuando el paciente quiera ver sus citas, o antes de cancelar/reagendar para identificar cuál es la cita correcta.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "cancel_appointment",
    description:
      "CANCELA la cita del paciente directamente en el sistema. Tú lo haces todo — el paciente no necesita llamar ni contactar al centro. Úsalo SOLO después de que el paciente confirme EXPLÍCITAMENTE que desea cancelar. Antes de llamar esta tool, usa get_my_appointments para identificar la cita.",
    input_schema: {
      type: "object" as const,
      properties: {
        citaId: { type: "string", description: "ID de la cita a cancelar (obtenido de get_my_appointments)" },
      },
      required: ["citaId"],
    },
  },
  {
    name: "reschedule_appointment",
    description:
      "MODIFICA la fecha/hora de una cita existente. NO crea una cita nueva ni deja la anterior pendiente — actualiza la misma cita al nuevo horario. Úsalo SOLO después de: 1) identificar la cita con get_my_appointments, 2) verificar disponibilidad con check_availability, 3) obtener confirmación explícita del paciente. NUNCA uses book_appointment para reagendar.",
    input_schema: {
      type: "object" as const,
      properties: {
        citaId: { type: "string", description: "ID de la cita a reagendar (obtenido de get_my_appointments)" },
        nuevaFecha: { type: "string", description: "Nueva fecha en formato YYYY-MM-DD" },
        nuevaHora: { type: "string", description: "Nueva hora en formato HH:MM — debe ser la hora que check_availability confirmó como disponible=true" },
      },
      required: ["citaId", "nuevaFecha", "nuevaHora"],
    },
  },
  {
    name: "get_box_info",
    description:
      "Obtiene información actualizada de los boxes disponibles para arriendo en el centro. Úsalo cuando un profesional pregunte sobre arriendo.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "register_professional_interest",
    description:
      "Registra el interés de un profesional de la salud en arrendar un box. Úsalo cuando el profesional exprese intención de arrendar.",
    input_schema: {
      type: "object" as const,
      properties: {
        nombre: { type: "string", description: "Nombre del profesional" },
        telefono: { type: "string", description: "Teléfono de contacto" },
        especialidad: { type: "string", description: "Especialidad que ejerce" },
        mensaje: { type: "string", description: "Mensaje o notas adicionales" },
      },
      required: [],
    },
  },
]

// ─── Ejecutor de tools ────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, string>,
  context?: AgentContext
): Promise<string> {
  switch (name) {
    case "check_availability": {
      const result = await getDisponibilidad(input.fecha, input.especialidad)
      const horasolicitada = input.hora
      const disponible = horasolicitada ? result.slots.includes(horasolicitada) : null
      return JSON.stringify({
        horasolicitada,
        disponible,
        mensaje: disponible
          ? `La hora ${horasolicitada} está disponible. Usa EXACTAMENTE "${horasolicitada}" al llamar book_appointment.`
          : disponible === false
          ? `La hora ${horasolicitada} NO está disponible. Ofrece estas horas al paciente y espera que elija.`
          : "No se especificó hora",
        otrasHorasDisponibles: result.slots.filter(s => s !== horasolicitada),
      })
    }

    case "book_appointment": {
      const result = await createCita({
        pacienteNombre: input.pacienteNombre,
        pacienteEmail: input.pacienteEmail,
        pacienteTelefono: input.pacienteTelefono,
        whatsappId: context?.channelId,
        fecha: input.fecha,
        hora: input.hora,
        especialidad: input.especialidad,
        motivoConsulta: input.motivoConsulta,
      })
      return JSON.stringify(result)
    }

    case "get_my_appointments": {
      if (!context?.channelId) {
        return JSON.stringify({ error: "No se pudo identificar al paciente", citas: [] })
      }
      const ahora = new Date().toISOString()
      const citas = await getCitas({ whatsappId: context.channelId, desde: ahora })
      if (citas.length === 0) {
        return JSON.stringify({ mensaje: "El paciente no tiene citas próximas", citas: [] })
      }
      return JSON.stringify({ citas })
    }

    case "cancel_appointment": {
      const result = await cancelarCita(input.citaId)
      if (result.ok) {
        return JSON.stringify({
          ok: true,
          citaId: input.citaId,
          mensaje: `ÉXITO: La cita (ID: ${input.citaId}) fue CANCELADA en el sistema. El profesional ya fue notificado automáticamente. El paciente NO necesita llamar al centro ni hacer nada más.`,
        })
      }
      return JSON.stringify({
        ok: false,
        error: result.error,
        mensaje: `ERROR al cancelar la cita ${input.citaId}: ${result.error}.`,
      })
    }

    case "reschedule_appointment": {
      const result = await reagendarCita(input.citaId, input.nuevaFecha, input.nuevaHora)
      if (result.ok) {
        return JSON.stringify({
          ok: true,
          citaId: input.citaId,
          nuevaFecha: input.nuevaFecha,
          nuevaHora: input.nuevaHora,
          fechaConfirmada: result.fecha,
          mensaje: `ÉXITO: La cita (ID: ${input.citaId}) fue MODIFICADA DIRECTAMENTE en el sistema al nuevo horario ${input.nuevaFecha} ${input.nuevaHora}. La cita anterior ya NO existe como entrada separada — fue actualizada in-place. No hay nada más que eliminar. El paciente NO necesita hacer nada adicional.`,
        })
      }
      return JSON.stringify({
        ok: false,
        error: result.error,
        mensaje: `ERROR al reagendar la cita ${input.citaId}: ${result.error}. Informa al paciente y sugiere intentar más tarde o contactar al centro.`,
      })
    }

    case "get_box_info": {
      const boxes = await getBoxes()
      return JSON.stringify({ boxes })
    }

    case "register_professional_interest": {
      await createLead({
        nombre: input.nombre,
        telefono: input.telefono,
        canal: input.canal ?? "WHATSAPP",
        especialidad: input.especialidad,
        mensaje: input.mensaje,
      })
      return JSON.stringify({
        registrado: true,
        mensaje: "Interés registrado. El equipo de Bambú se pondrá en contacto pronto.",
      })
    }

    default:
      return JSON.stringify({ error: `Tool desconocida: ${name}` })
  }
}

// ─── Conversión de mensajes DB → Anthropic ───────────────────────────────────

export function buildMessages(dbMessages: Message[]): Anthropic.MessageParam[] {
  return dbMessages
    .slice(-MAX_HISTORY_MESSAGES)
    .filter((m) => m.role !== "OPERATOR")
    .map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }))
}

// ─── Agente principal con tool use loop ──────────────────────────────────────

export async function runAgent(
  userType: "PACIENTE" | "PROFESIONAL",
  history: Anthropic.MessageParam[],
  newUserMessage: string,
  context?: AgentContext
): Promise<string> {
  const systemPrompt = await buildSystemPrompt(userType)

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: newUserMessage },
  ]

  // Tool use loop: Claude puede llamar herramientas varias veces antes de responder texto
  for (let iteration = 0; iteration < 8; iteration++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: AGENT_TOOLS,
      messages,
    })

    // Respuesta de texto final
    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text")
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("Claude respondió sin bloque de texto")
      }
      return textBlock.text
    }

    // Claude quiere usar una tool
    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content })

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        response.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
          .map(async (toolCall) => {
            console.log(`[agent] Tool use: ${toolCall.name}`, toolCall.input)
            const result = await executeTool(
              toolCall.name,
              toolCall.input as Record<string, string>,
              context
            )
            console.log(`[agent] Tool result: ${toolCall.name} → ${result}`)
            return {
              type: "tool_result" as const,
              tool_use_id: toolCall.id,
              content: result,
            }
          })
      )

      messages.push({ role: "user", content: toolResults })
      continue
    }

    // Otro stop_reason (max_tokens, etc.)
    const textBlock = response.content.find((b) => b.type === "text")
    if (textBlock && textBlock.type === "text") return textBlock.text
    throw new Error(`Stop reason inesperado: ${response.stop_reason}`)
  }

  throw new Error("El agente superó el máximo de iteraciones de tool use")
}

// ─── Clasificación rápida de intención ───────────────────────────────────────

export async function classifyUserIntent(message: string): Promise<"PACIENTE" | "PROFESIONAL"> {
  const prompt = CLASSIFICATION_PROMPT.replace("{MESSAGE}", message)

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 10,
    messages: [{ role: "user", content: prompt }],
  })

  const block = response.content[0]
  if (block.type !== "text") return "PACIENTE"

  const result = block.text.trim().toUpperCase()
  return result === "PROFESIONAL" ? "PROFESIONAL" : "PACIENTE"
}
