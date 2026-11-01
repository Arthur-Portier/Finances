import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
const eur0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export const money = (n: number) => eur.format(n)
export const money0 = (n: number) => eur0.format(n)
export const signed = (n: number, type: 'expense' | 'income') => (type === 'income' ? '+' : '−') + eur.format(Math.abs(n))
export const pct = (n: number) => `${Math.round(n * 100)} %`

export const fmtDay = (iso: string) => format(parseISO(iso), 'd MMM', { locale: fr })
export const fmtDayLong = (iso: string) => format(parseISO(iso), 'EEEE d MMMM', { locale: fr })
export const fmtMonth = (d: Date) => format(d, 'MMM yy', { locale: fr })
export const fmtMonthLong = (d: Date) => format(d, 'MMMM yyyy', { locale: fr })
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export const todayISO = () => format(new Date(), 'yyyy-MM-dd')
