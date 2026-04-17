/**
 * Cliente interno para comunicarse con el proyecto centro-bambu-demo.
 * Todas las llamadas usan el header X-Bot-API-Key para autenticación.
 */

const BASE = process.env.CENTRO_BAMBU_API_URL ?? "http://localhost:3001"
const KEY = process.env.BOT_INTERNAL_KEY ?? ""

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Bot-API-Key": KEY,
  }
}

export interface KnowledgeItem {
  id: string
  categoria: string
  titulo: string
  contenido: string
}

export interface Slot {
  slots: string[]
  fecha: string
  especialidad?: string
  mensaje?: string
}

export interface CitaInput {
  pacienteNombre: string
  pacienteEmail?: string
  pacienteTelefono?: string
  whatsappId?: string
  fecha: string          // YYYY-MM-DD
  hora: string           // HH:MM
  especialidad: string
  motivoConsulta?: string
}

export interface CitaResult {
  ok: boolean
  citaId: string
  fecha: string
  profesional: string | null
  estado: string
}

export interface BoxInfo {
  id: string
  nombre: string
  descripcion: string | null
  color: string
}

export interface LeadInput {
  nombre?: string
  telefono?: string
  canal: string       // WHATSAPP | FACEBOOK | INSTAGRAM
  especialidad?: string
  mensaje?: string
}

// ─── Knowledge ───────────────────────────────────────────────────────────────

export async function getKnowledge(): Promise<KnowledgeItem[]> {
  try {
    const res = await fetch(`${BASE}/api/bambu/knowledge`, { headers: headers() })
    if (!res.ok) throw new Error(`Status ${res.status}`)
    return res.json()
  } catch (err) {
    console.warn("[centrobambu] getKnowledge falló, usando fallback:", err)
    return []
  }
}

// ─── Disponibilidad ───────────────────────────────────────────────────────────

export async function getDisponibilidad(fecha: string, especialidad?: string): Promise<Slot> {
  try {
    const params = new URLSearchParams({ fecha })
    if (especialidad) params.set("especialidad", especialidad)
    const res = await fetch(`${BASE}/api/bambu/disponibilidad?${params}`, { headers: headers() })
    if (!res.ok) throw new Error(`Status ${res.status}`)
    return res.json()
  } catch (err) {
    console.warn("[centrobambu] getDisponibilidad falló:", err)
    return { slots: [], fecha, mensaje: "No se pudo consultar disponibilidad en este momento" }
  }
}

// ─── Citas ────────────────────────────────────────────────────────────────────

export async function createCita(data: CitaInput): Promise<CitaResult> {
  const res = await fetch(`${BASE}/api/bambu/citas`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`createCita error ${res.status}: ${err}`)
  }
  return res.json()
}

// ─── Pacientes ────────────────────────────────────────────────────────────────

export async function registerPaciente(data: {
  nombre: string
  telefono?: string
  whatsappId?: string
}): Promise<{ pacienteId: string }> {
  const res = await fetch(`${BASE}/api/bambu/pacientes`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`registerPaciente error ${res.status}: ${err}`)
  }
  return res.json()
}

// ─── Boxes ────────────────────────────────────────────────────────────────────

export async function getBoxes(): Promise<BoxInfo[]> {
  try {
    const res = await fetch(`${BASE}/api/bambu/boxes`, { headers: headers() })
    if (!res.ok) throw new Error(`Status ${res.status}`)
    return res.json()
  } catch (err) {
    console.warn("[centrobambu] getBoxes falló:", err)
    return []
  }
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function createLead(data: LeadInput): Promise<void> {
  try {
    const res = await fetch(`${BASE}/api/bambu/leads`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(data),
    })
    if (!res.ok) console.warn(`[centrobambu] createLead error ${res.status}`)
  } catch (err) {
    console.warn("[centrobambu] createLead falló:", err)
  }
}

export interface PacienteLeadInput {
  nombre?: string
  telefono?: string
  canal: string       // WHATSAPP | FACEBOOK | INSTAGRAM
  servicio?: string   // especialidad o servicio que busca
  mensaje?: string
}

export async function createPacienteLead(data: PacienteLeadInput): Promise<void> {
  try {
    const res = await fetch(`${BASE}/api/bambu/paciente-leads`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(data),
    })
    if (!res.ok) console.warn(`[centrobambu] createPacienteLead error ${res.status}`)
  } catch (err) {
    console.warn("[centrobambu] createPacienteLead falló:", err)
  }
}

// ─── Consulta de citas del paciente ──────────────────────────────────────────

export interface CitaResumen {
  id: string
  fecha: string
  duracion: number
  estado: string
  modalidad: string
  motivoConsulta: string | null
  profesional: { id: string; nombre: string | null } | null
  box: string | null
}

export async function getCitas(params: {
  whatsappId?: string
  estado?: string
  desde?: string
}): Promise<CitaResumen[]> {
  try {
    const p = new URLSearchParams()
    if (params.whatsappId) p.set("whatsappId", params.whatsappId)
    if (params.estado)     p.set("estado", params.estado)
    if (params.desde)      p.set("desde", params.desde)
    const res = await fetch(`${BASE}/api/bambu/citas?${p}`, { headers: headers() })
    if (!res.ok) throw new Error(`Status ${res.status}`)
    return res.json()
  } catch (err) {
    console.warn("[centrobambu] getCitas falló:", err)
    return []
  }
}

// ─── Cancelar cita ────────────────────────────────────────────────────────────

export async function cancelarCita(citaId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE}/api/bambu/citas/${citaId}`, {
      method: "DELETE",
      headers: headers(),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error ?? `Error ${res.status}` }
    return { ok: true }
  } catch (err) {
    console.warn("[centrobambu] cancelarCita falló:", err)
    return { ok: false, error: "Error de red" }
  }
}

// ─── Reagendar cita ───────────────────────────────────────────────────────────

export async function reagendarCita(
  citaId: string,
  nuevaFecha: string,
  nuevaHora: string
): Promise<{ ok: boolean; fecha?: string; error?: string }> {
  try {
    const nuevaFechaHora = `${nuevaFecha}T${nuevaHora}:00`
    const res = await fetch(`${BASE}/api/bambu/citas/${citaId}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ nuevaFecha: nuevaFechaHora, estado: "REAGENDADA" }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error ?? `Error ${res.status}` }
    return { ok: true, fecha: data.fecha }
  } catch (err) {
    console.warn("[centrobambu] reagendarCita falló:", err)
    return { ok: false, error: "Error de red" }
  }
}
