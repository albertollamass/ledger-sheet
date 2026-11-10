// Dominio: novedades de cada versión desplegada.
// Al publicar una versión nueva: añade una entrada a RELEASES y cambia APP_VERSION.
// El aviso se muestra una sola vez por usuario y versión.

export const APP_VERSION = '2026.11.10'

export const RELEASES = [
  {
    version: '2026.11.10',
    date: '10 de noviembre de 2026',
    title: 'Movimientos automáticos y nombres a tu gusto',
    items: [
      {
        icon: '↻',
        title: 'Movimientos automáticos',
        text: 'Apunta el alquiler, la nómina o una suscripción el día que elijas de cada mes. Se añaden solos y, si abres la app más tarde, se ponen al día.'
      },
      {
        icon: '✎',
        title: 'Nombres personalizados',
        text: 'Renombra grupos y tipos solo en tu cuenta. Por ejemplo, «Comida-Leroy» puede llamarse como tú quieras sin cambiar tus datos.'
      },
      {
        icon: '⏱',
        title: 'Sin duplicados',
        text: 'Aunque abras la app en dos pestañas a la vez, cada movimiento automático se apunta una sola vez.'
      }
    ]
  }
]

export const currentRelease = () =>
  RELEASES.find((r) => r.version === APP_VERSION) ?? RELEASES[0]
