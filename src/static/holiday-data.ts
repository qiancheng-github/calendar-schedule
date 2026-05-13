/**
 * 中国法定节假日数据 (2024-2027)
 * isWorkDay: true = 需要上班, false = 放假, null = 正常周末
 * 注：2027 年为依据惯例与公开报道整理的预估安排，国务院正式发布后请以国办通知为准并更新本表。
 */
import dayjs from 'dayjs'

export interface HolidayInfo {
  name: string
  isWorkDay: boolean | null  // null表示普通周末
  isHoliday: boolean         // 是否是假期
}

export const holidayData: Record<string, Record<string, HolidayInfo>> = {
  '2024': {
    '01-01': { name: '元旦', isWorkDay: false, isHoliday: true },
    '02-10': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-11': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-12': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-13': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-14': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-15': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-16': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-17': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-18': { name: '春节(调休)', isWorkDay: true, isHoliday: false }, // 星期日上班
    '02-24': { name: '春节(调休)', isWorkDay: true, isHoliday: false }, // 星期六上班
    '04-04': { name: '清明节', isWorkDay: false, isHoliday: true },
    '04-05': { name: '清明节', isWorkDay: false, isHoliday: true },
    '04-06': { name: '清明节', isWorkDay: false, isHoliday: true },
    '04-07': { name: '清明(调休)', isWorkDay: true, isHoliday: false }, // 星期日上班
    '05-01': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-02': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-03': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-04': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-05': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '06-10': { name: '端午节', isWorkDay: false, isHoliday: true },
    '06-11': { name: '端午节', isWorkDay: false, isHoliday: true },
    '06-12': { name: '端午节', isWorkDay: false, isHoliday: true },
    '09-16': { name: '中秋节', isWorkDay: false, isHoliday: true },
    '09-17': { name: '中秋节', isWorkDay: false, isHoliday: true },
    '09-18': { name: '中秋(调休)', isWorkDay: true, isHoliday: false }, // 星期日上班
    '10-01': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-02': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-03': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-04': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-05': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-06': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-07': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-12': { name: '国庆(调休)', isWorkDay: true, isHoliday: false }, // 星期六上班
  },
  '2025': {
    '01-01': { name: '元旦', isWorkDay: false, isHoliday: true },
    '01-28': { name: '春节', isWorkDay: false, isHoliday: true },
    '01-29': { name: '春节', isWorkDay: false, isHoliday: true },
    '01-30': { name: '春节', isWorkDay: false, isHoliday: true },
    '01-31': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-01': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-02': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-03': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-04': { name: '春节(调休)', isWorkDay: true, isHoliday: false },
    '02-08': { name: '春节(调休)', isWorkDay: true, isHoliday: false },
    '04-04': { name: '清明节', isWorkDay: false, isHoliday: true },
    '04-05': { name: '清明节', isWorkDay: false, isHoliday: true },
    '04-06': { name: '清明节', isWorkDay: false, isHoliday: true },
    '05-01': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-02': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-03': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-04': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-05': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-31': { name: '端午节', isWorkDay: false, isHoliday: true },
    '06-01': { name: '端午节', isWorkDay: false, isHoliday: true },
    '06-02': { name: '端午节', isWorkDay: false, isHoliday: true },
    '10-01': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-02': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-03': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-04': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-05': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-06': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-07': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-11': { name: '国庆(调休)', isWorkDay: true, isHoliday: false },
  },
  '2026': {
    '01-01': { name: '元旦', isWorkDay: false, isHoliday: true },
    '01-02': { name: '元旦', isWorkDay: false, isHoliday: true },
    '01-03': { name: '元旦', isWorkDay: false, isHoliday: true },
    '01-04': { name: '元旦(调休)', isWorkDay: true, isHoliday: false },
    '02-14': { name: '春节(调休)', isWorkDay: true, isHoliday: false },
    '02-15': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-16': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-17': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-18': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-19': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-20': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-21': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-22': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-23': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-28': { name: '春节(调休)', isWorkDay: true, isHoliday: false },
    '04-04': { name: '清明节', isWorkDay: false, isHoliday: true },
    '04-05': { name: '清明节', isWorkDay: false, isHoliday: true },
    '04-06': { name: '清明节', isWorkDay: false, isHoliday: true },
    '05-01': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-02': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-03': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-04': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-05': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-09': { name: '劳动节(调休)', isWorkDay: true, isHoliday: false },
    '06-19': { name: '端午节', isWorkDay: false, isHoliday: true },
    '06-20': { name: '端午节', isWorkDay: false, isHoliday: true },
    '06-21': { name: '端午节', isWorkDay: false, isHoliday: true },
    '09-20': { name: '国庆(调休)', isWorkDay: true, isHoliday: false },
    '09-25': { name: '中秋节', isWorkDay: false, isHoliday: true },
    '09-26': { name: '中秋节', isWorkDay: false, isHoliday: true },
    '09-27': { name: '中秋节', isWorkDay: false, isHoliday: true },
    '10-01': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-02': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-03': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-04': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-05': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-06': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-07': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-10': { name: '国庆(调休)', isWorkDay: true, isHoliday: false },
  },
  // 以下为预估数据，正式发布后请对照 gov.cn 更新
  '2027': {
    '01-01': { name: '元旦', isWorkDay: false, isHoliday: true },
    '01-02': { name: '元旦', isWorkDay: false, isHoliday: true },
    '01-03': { name: '元旦', isWorkDay: false, isHoliday: true },
    '01-04': { name: '元旦(调休)', isWorkDay: true, isHoliday: false },
    '01-31': { name: '春节(调休)', isWorkDay: true, isHoliday: false },
    '02-05': { name: '春节(调休)', isWorkDay: true, isHoliday: false },
    '02-06': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-07': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-08': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-09': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-10': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-11': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-12': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-13': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-14': { name: '春节', isWorkDay: false, isHoliday: true },
    '02-21': { name: '春节(调休)', isWorkDay: true, isHoliday: false },
    '04-03': { name: '清明节', isWorkDay: false, isHoliday: true },
    '04-04': { name: '清明节', isWorkDay: false, isHoliday: true },
    '04-05': { name: '清明节', isWorkDay: false, isHoliday: true },
    '05-01': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-02': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-03': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-04': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-05': { name: '劳动节', isWorkDay: false, isHoliday: true },
    '05-08': { name: '劳动节(调休)', isWorkDay: true, isHoliday: false },
    '06-25': { name: '端午节', isWorkDay: false, isHoliday: true },
    '06-26': { name: '端午节', isWorkDay: false, isHoliday: true },
    '06-27': { name: '端午节', isWorkDay: false, isHoliday: true },
    '10-01': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-02': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-03': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-04': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-05': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-06': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-07': { name: '国庆节', isWorkDay: false, isHoliday: true },
    '10-09': { name: '国庆(调休)', isWorkDay: true, isHoliday: false },
  },
}

// 传统节日日期（农历）映射到阳历（每年需要计算）
export interface LunarFestival {
  name: string
  month: number
  day: number
}

export const lunarFestivals: LunarFestival[] = [
  { name: '春节', month: 1, day: 1 },
  { name: '元宵节', month: 1, day: 15 },
  { name: '端午节', month: 5, day: 5 },
  { name: '七夕节', month: 7, day: 7 },
  { name: '中秋节', month: 8, day: 15 },
  { name: '重阳节', month: 9, day: 9 },
  { name: '腊八节', month: 12, day: 8 },
]

// 公历节日
export const solarFestivals: Record<string, string> = {
  '01-01': '元旦',
  '02-14': '情人节',
  '03-08': '妇女节',
  '03-12': '植树节',
  '04-01': '愚人节',
  '05-01': '劳动节',
  '05-04': '青年节',
  '06-01': '儿童节',
  '07-01': '建党节',
  '08-01': '建军节',
  '09-10': '教师节',
  '10-01': '国庆节',
  '12-25': '圣诞节',
}

/** 去掉括号说明后的节日名，用于匹配 */
export function holidayDisplayBaseName(name: string): string {
  return name.replace(/[（(].*?[）)]/g, '').trim()
}

/** 某年法定假日连休段（按数据中 isHoliday 连续日合并） */
export interface StatutoryHolidayPeriod {
  name: string
  start: string
  end: string
}

export function getStatutoryHolidayPeriodsForYear(year: number): StatutoryHolidayPeriod[] {
  const yearKey = String(year)
  const yearData = holidayData[yearKey]
  if (!yearData) return []

  const sortedKeys = Object.entries(yearData)
    .filter(([, info]) => info.isHoliday)
    .map(([mmdd]) => `${yearKey}-${mmdd}`)
    .sort()

  const periods: StatutoryHolidayPeriod[] = []
  let cur: StatutoryHolidayPeriod | null = null

  for (const iso of sortedKeys) {
    const info = getHolidayInfo(dayjs(iso).toDate())
    if (!info?.isHoliday) continue
    const name = holidayDisplayBaseName(info.name)

    if (cur && cur.name === name && dayjs(cur.end).add(1, 'day').format('YYYY-MM-DD') === iso) {
      cur.end = iso
    } else {
      if (cur) periods.push(cur)
      cur = { name, start: iso, end: iso }
    }
  }
  if (cur) periods.push(cur)
  return periods
}

/**
 * 获取某一天是否是法定节假日
 */
export function getHolidayInfo(date: Date): HolidayInfo | null {
  const year = date.getFullYear().toString()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const key = `${month}-${day}`

  if (holidayData[year] && holidayData[year][key]) {
    return holidayData[year][key]
  }
  return null
}

/**
 * 判断某天是否需要上班
 */
export function isWorkDay(date: Date): boolean | null {
  const info = getHolidayInfo(date)
  if (info) {
    return info.isWorkDay
  }
  // 普通周末
  const dayOfWeek = date.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false // 周末不上班
  }
  return null // 正常工作日
}
