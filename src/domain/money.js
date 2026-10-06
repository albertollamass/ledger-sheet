// Dominio: dinero. Puro, sin dependencias.

export const eur = (n) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0)

export const parseAmount = (v) => {
  if (typeof v === 'number') return v
  if (!v) return 0
  const s = String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  return Number(s) || 0
}

// Busca el primer importe en un texto compartido (notificación del banco,
// texto de la cartera, portapapeles). Entiende "12,50 €", "1.234,56", "12.50".
// Ignora fechas y años para no confundirlos con importes.
export function parseSharedAmount(text) {
  if (text === null || text === undefined) return 0
  let s = String(text)
  if (!s.trim()) return 0
  // Quita fechas con año para no confundirlas con importes.
  // Los números de dos partes sin año se dejan: pueden ser decimales ("8.99").
  s = s.replace(/\d{4}-\d{2}-\d{2}/g, ' ').replace(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g, ' ')
  const toNumber = (raw) => {
    let t = String(raw).replace(/[\s\u00a0]/g, '')
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
    const n = Number(t)
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
  }
  const withSymbol = s.match(/(\d{1,3}(?:[.\s]\d{3})*,\d{2}|\d+,\d{1,2}|\d+\.\d{2})\s?(€|EUR|\$)/i)
  if (withSymbol) return toNumber(withSymbol[1])
  const european = s.match(/\d{1,3}(?:[.\s]\d{3})*,\d{1,2}|\d+\.\d{2}/)
  if (european) return toNumber(european[0])
  const ints = s.match(/\d+/g) || []
  const notYear = ints.find((n) => n.length !== 4 || Number(n) < 1900 || Number(n) > 2100)
  return notYear ? Number(notYear) : 0
}
