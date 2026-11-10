// Dominio: fechas. Puro, sin dependencias.

export const toISODate = (d = new Date()) => d.toISOString().slice(0, 10)

// Fecha ISO en hora local (evita que el desfase UTC cambie el día).
export const localISODate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
