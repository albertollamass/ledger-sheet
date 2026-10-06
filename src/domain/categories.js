// Dominio: vocabulario del cuaderno (grupos y tipos de la hoja 2026).
// El desglose anual además muestra automáticamente cualquier grupo/tipo
// que venga de un Excel importado, aunque no esté en esta lista.

export const INCOME_GROUPS = [
  {
    group: 'Ingresos',
    items: [
      'Salario Neto',
      'Dividendos',
      'Bizum',
      'Ingresos por renta',
      'Bizum tricount',
      'Otros Ingresos B)'
    ]
  }
]

export const EXPENSE_GROUPS = [
  { group: 'Gastos Fijos', items: ['Electricidad', 'Agua', 'Teléfono', 'Gas', 'Internet', 'Gimnasio', 'Otros'] },
  {
    group: 'Hogar',
    items: [
      'Alquiler',
      'Deuda tricount',
      'Impuestos de hogar',
      'Mueblería/aplicaciones',
      'Alquiler garaje',
      'Mejoras',
      'Otros gastos de Hogar'
    ]
  },
  { group: 'Comida', items: ['Supermercado', 'Comidas-fuera', 'Delivery', 'Comida-Leroy'] },
  {
    group: 'Transporte',
    items: [
      'Tarjeta transporte',
      'Seguro de Auto',
      'Combustible',
      'Bus/Taxi/Tren',
      'Reparación Vehículo',
      'Transporte-Otros'
    ]
  },
  { group: 'Salud', items: ['Farmacia', 'Doctor/Dentista', 'Salud - Otros'] },
  {
    group: 'Vida Diaria',
    items: ['Educación', 'Ropa', 'Accesorios personales', 'Peluquería', 'Vida Diaria-Otros']
  },
  {
    group: 'Entretenimiento',
    items: [
      'Vacaciones/Viajes',
      'Regalos',
      'Música',
      'Juegos',
      'Teatro/Cine',
      'Conciertos',
      'Libros',
      'Hobbies',
      'Deportes',
      'Fiesta',
      'Entretenimiento Otros'
    ]
  },
  {
    group: 'Ahorro',
    items: [
      'Ahorros de emergencia',
      'Ahorro de retiro',
      'Ahorro para estudios',
      'Inversión',
      'Ahorro para vacaciones',
      'Otros Ahorros'
    ]
  }
]

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const ALL_GROUPS = [...INCOME_GROUPS, ...EXPENSE_GROUPS]

export const groupOfLabel = (label) =>
  ALL_GROUPS.find((g) => g.items.includes(label))?.group ?? 'Otros'
