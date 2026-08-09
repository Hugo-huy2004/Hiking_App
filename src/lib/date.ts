// Date formatting helper functions

const pad = (n: number) => String(n).padStart(2, '0')

export const localDate = (d: Date = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const localMonth = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

export const localDateTime = (d: Date = new Date()) =>
  `${localDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
