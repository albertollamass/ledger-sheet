// Dominio: catálogo personalizado del cuaderno. Puro, sin dependencias.
// Los datos se guardan siempre con el nombre original (canónico); las
// preferencias solo cambian cómo se muestran los nombres para cada usuario.

export const emptyPreferences = () => ({ labels: {}, groups: {}, lastSeenVersion: '' })

const cleanMap = (map) => {
  const out = {}
  Object.entries(map || {}).forEach(([key, value]) => {
    const name = typeof value === 'string' ? value.trim() : ''
    if (key && name && name !== key) out[key] = name
  })
  return out
}

export function normalizePreferences(prefs) {
  const out = { labels: cleanMap(prefs?.labels), groups: cleanMap(prefs?.groups) }
  const seen = typeof prefs?.lastSeenVersion === 'string' ? prefs.lastSeenVersion.trim() : ''
  if (seen) out.lastSeenVersion = seen
  return out
}

export const displayLabel = (prefs, label) => prefs?.labels?.[label]?.trim() || label

export const displayGroup = (prefs, group) => prefs?.groups?.[group]?.trim() || group

// Prepara los grupos del formulario con el nombre visible pero conservando
// el valor canónico que se guarda en cada movimiento.
export function personalizeGroups(groups, prefs) {
  return groups.map((g) => ({
    group: g.group,
    groupLabel: displayGroup(prefs, g.group),
    items: g.items.map((label) => ({ value: label, label: displayLabel(prefs, label) }))
  }))
}
