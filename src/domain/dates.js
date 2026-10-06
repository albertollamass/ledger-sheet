// Dominio: fechas. Puro, sin dependencias.

export const toISODate = (d = new Date()) => d.toISOString().slice(0, 10)
