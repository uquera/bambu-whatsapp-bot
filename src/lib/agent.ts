import Anthropic from "@anthropic-ai/sdk"
import type { Message } from "@prisma/client"
import { buildSystemPrompt, CLASSIFICATION_PROMPT } from "./prompts"
import { getDisponibilidad, createCita, getBoxes, createLead } from "./centrobambu"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = "claude-sonnet-4-6"
const MAX_HISTORY_MESSAGES = 20

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
      "Agenda una cita para el paciente en el centro clínico. Úsalo SOLO después de que el paciente confirme la hora y fecha.",
    input_schema: {
      type: "object" as const,
      properties: {
        pacienteNombre: { type: "string", description: "Nombre completo del paciente" },
        pacienteEmail: { type: "string", description: "Correo electrónico del paciente, necesario para enviarle la confirmación" },
        pacienteTelefono: { type: "string", description: "Teléfono del paciente en formato E.164" },
        fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
        hora: { type: "string", description: "Hora en formato HH:MM — debe ser la hora exacta que check_availability confirmó como disponible=true" },
        especialidad: { type: "string", description: "Especialidad médica" },
      },
      required: ["pacienteNombre", "pacienteEmail", "fecha", "hora", "especialidad"],
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

// ─── Ejecutor de tools (stub — se completa en Fase 4 con centrobambu.ts) ────

async function executeTool(
  name: string,
  input: Record<string, string>
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
        whatsappId: input.whatsappId,
        fecha: input.fecha,
        hora: input.hora,
        especialidad: input.especialidad,
      })
      return JSON.stringify(result)
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
    .filter((m) => m.role !== "OPERATOR") // El operador no forma parte del contexto del agente
    .map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }))
}

// ─── Agente principal con tool use loop ──────────────────────────────────────

export async function runAgent(
  userType: "PACIENTE" | "PROFESIONAL",
  history: Anthropic.MessageParam[],
  newUserMessage: string
): Promise<string> {
  const systemPrompt = await buildSystemPrompt(userType)

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: newUserMessage },
  ]

  // Tool use loop: Claude puede llamar herramientas varias veces antes de responder texto
  for (let iteration = 0; iteration < 5; iteration++) {
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
      // Agregar la respuesta del asistente (con las tool calls) al historial
      messages.push({ role: "assistant", content: response.content })

      // Ejecutar todas las tools solicitadas en paralelo
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        response.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
          .map(async (toolCall) => {
            console.log(`[agent] Tool use: ${toolCall.name}`, toolCall.input)
            const result = await executeTool(
              toolCall.name,
              toolCall.input as Record<string, string>
            )
            console.log(`[agent] Tool result: ${toolCall.name} → ${result}`)
            return {
              type: "tool_result" as const,
              tool_use_id: toolCall.id,
              content: result,
            }
          })
      )

      // Agregar resultados de tools al historial y continuar el loop
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
