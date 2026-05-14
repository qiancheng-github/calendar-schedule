/**
 * 农历转换工具
 * 基于简化版农历算法
 */

// 农历月份数据（1900-2100年）
const lunarInfo = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x0a4d0, 0x0d250, 0x1d255, 0x0d520,
  0x0dd45, 0x0b5a0, 0x056d0, 0x055b2, 0x04ae0, 0x0a570, 0x054d4, 0x0d260, 0x0e968, 0x0d520,
  0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a4d0, 0x0d250, 0x1d252, 0x0d550, 0x0a5a0, 0x15576,
  0x056c0, 0x0a5b0, 0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d0d6, 0x0d4d4, 0x0d550, 0x15a57,
  0x05650, 0x06d55, 0x06db2, 0x04ae0, 0x0a570, 0x054d6, 0x0d260, 0x0e968, 0x0d520, 0x0daa0,
  0x16a96, 0x056d0, 0x04ae0, 0x0a4d0, 0x0d250, 0x1d255, 0x0d550, 0x0a5a0, 0x15576, 0x055c0,
  0x0a5b0, 0x096d0, 0x04dd5, 0x04ada, 0x0a4d1, 0x0d0d5, 0x0d4d0, 0x0d550, 0x15a57, 0x05650,
  0x06555, 0x06db0, 0x04ae0, 0x0a570, 0x054d4, 0x0d260, 0x0e958, 0x0d520, 0x0daa0, 0x16a96,
  0x056d0, 0x04ae0, 0x0a4d0, 0x0d250, 0x1d255, 0x0d550, 0x0a5a0, 0x15576, 0x05650, 0x06555,
  0x06d50, 0x04ada, 0x0a4b0, 0x0a4b4, 0x0aa50, 0x0b2a5, 0x0b550, 0x15355, 0x04db0, 0x0a5b0,
  0x09570, 0x04970, 0x064a0, 0x074a3, 0x0ea50, 0x06b58, 0x05ab0, 0x02b60, 0x09378, 0x092e0,
  0x0c960, 0x0d4a0, 0x0d550, 0x15a55, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0cab5, 0x0b950,
  0x0b550, 0x15555, 0x04ba0, 0x0a5b0, 0x13576, 0x04ad0, 0x09ad0, 0x064b5, 0x074a4, 0x0ea50,
  0x06b58, 0x05ab0, 0x02b60, 0x09378, 0x092e0, 0x0c960, 0x0d4a0, 0x0d550, 0x15a55, 0x056a0,
  0x1a5b4, 0x025d0, 0x092d0, 0x0cab5, 0x0b950, 0x0b550, 0x15355, 0x04ba0, 0x0a5b0, 0x13576,
  0x04ad0, 0x09ad0, 0x064b5, 0x074a4, 0x0ea50, 0x06b58, 0x05ab0, 0x02b60, 0x09378, 0x092e0,
  0x0c960, 0x0d4a0, 0x0d550, 0x15a55, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0cab5, 0x0b950
]

// 天干
const Gan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
// 地支
const Zhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
// 生肖
const Animals = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

// 农历月份名
const MonthName = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']

// 农历日期名
const DayName = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十']

/**
 * 获取农历信息
 */
export interface LunarDate {
  year: number      // 农历年
  month: number     // 农历月
  day: number       // 农历日
  isLeap: boolean   // 是否闰月
  lunarYearName: string  // 农历年天干地支
  animal: string    // 生肖
  monthName: string  // 月份名
  dayName: string   // 日期名
}

function lYearDays(year: number): number {
  let sum = 348
  let i = 0x8000
  while (i > 0x8) {
    sum += (lunarInfo[year - 1900] & i) ? 1 : 0
    i >>= 1
  }
  return sum + leapMonth(year)
}

function leapMonth(year: number): number {
  if (!(lunarInfo[year - 1900] & 0xf)) return 0
  return lunarInfo[year - 1900] & 0xf
}

function leapDays(year: number): number {
  if (leapMonth(year) === 0) return 0
  return (lunarInfo[year - 1900] & 0xf0000) ? 30 : 29
}

function monthDays(year: number, month: number): number {
  if ((lunarInfo[year - 1900] & (0x10000 >> month)) === 0) return 29
  return 30
}

function toDate(lYear: number, lMonth: number, lDay: number): Date | null {
  let offset = 0
  for (let i = 1900; i < lYear; i++) {
    offset += lYearDays(i)
  }
  for (let i = 1; i < lMonth; i++) {
    offset += leapMonth(lYear) === i ? leapDays(lYear) : monthDays(lYear, i)
  }
  if (leapMonth(lYear) < lMonth) {
    offset += leapDays(lYear)
  }
  offset += lDay
  const baseDate = new Date(1900, 0, 31)
  return new Date(baseDate.getTime() + offset * 86400000)
}

/** 公历日相对 1900-01-31 的整数天偏移（与 lunarInfo 表一致；不用 Intl，兼容微信小程序） */
function solarToOffsetDays(date: Date): number {
  return Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(1900, 0, 31)) / 86400000
  )
}

/**
 * 阳历转农历（查 lunarInfo 表，不依赖 Intl）
 */
export function solarToLunar(date: Date): LunarDate {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()

  if (y < 1900 || y > 2100 || (y === 1900 && m === 1 && d < 31)) {
    const zhiIndex = (y - 4) % 12
    return {
      year: y,
      month: 1,
      day: 1,
      isLeap: false,
      lunarYearName: Gan[(y - 4) % 10] + Zhi[zhiIndex < 0 ? zhiIndex + 12 : zhiIndex],
      animal: Animals[zhiIndex < 0 ? zhiIndex + 12 : zhiIndex],
      monthName: '正',
      dayName: '初一'
    }
  }

  let offset = solarToOffsetDays(date)
  let i: number
  let temp = 0

  for (i = 1900; i < 2101 && offset > 0; i++) {
    temp = lYearDays(i)
    offset -= temp
  }
  if (offset < 0) {
    offset += temp
    i--
  }

  const lunarYear = i
  const leap = leapMonth(lunarYear)
  let isLeap = false

  for (i = 1; i < 13 && offset > 0; i++) {
    if (leap > 0 && i === leap + 1 && !isLeap) {
      i--
      isLeap = true
      temp = leapDays(lunarYear)
    } else {
      temp = monthDays(lunarYear, i)
    }
    if (isLeap && leap > 0 && i === leap + 1) {
      isLeap = false
    }
    offset -= temp
  }

  if (offset === 0 && leap > 0 && i === leap + 1) {
    if (isLeap) {
      isLeap = false
    } else {
      isLeap = true
      i--
    }
  }
  if (offset < 0) {
    offset += temp
    i--
  }

  const lunarMonth = i
  const lunarDay = offset + 1
  const zhiIndex = ((lunarYear - 4) % 12 + 12) % 12
  const rawMonthName = MonthName[lunarMonth - 1] || '正'

  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeap,
    lunarYearName: Gan[((lunarYear - 4) % 10 + 10) % 10] + Zhi[zhiIndex],
    animal: Animals[zhiIndex],
    monthName: isLeap ? `闰${rawMonthName}` : rawMonthName,
    dayName: DayName[lunarDay - 1] || `${lunarDay}`
  }
}

/**
 * 农历转阳历
 */
export function lunarToSolar(year: number, month: number, day: number, isLeap: boolean = false): Date | null {
  return toDate(year, isLeap ? month + 1 : month, day)
}

/**
 * 格式化农历日期显示
 */
export function formatLunarDate(date: Date): string {
  const lunar = solarToLunar(date)
  return `${lunar.monthName}月${lunar.dayName}`
}

/** 月历格子：农历初一显示「三月」，其余格只显示「初二」「十五」等，不重复月份 */
export function formatLunarCalendarCell(date: Date): string {
  const lunar = solarToLunar(date)
  if (lunar.day === 1) {
    return `${lunar.monthName}月`
  }
  return lunar.dayName
}

/**
 * 获取农历节日
 */
export function getLunarHoliday(date: Date): string | null {
  const lunar = solarToLunar(date)
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  const nextLunar = solarToLunar(nextDay)

  // 农历节日映射
  const lunarHolidays: Record<string, string> = {
    '1-1': '春节',
    '1-15': '元宵节',
    '2-2': '龙抬头',
    '5-5': '端午节',
    '7-7': '七夕节',
    '7-15': '中元节',
    '8-15': '中秋节',
    '9-9': '重阳节',
    '12-8': '腊八节',
    '12-23': '小年',
    '12-30': '除夕'
  }

  const key = `${lunar.month}-${lunar.day}`
  if (nextLunar.month === 1 && nextLunar.day === 1) return '除夕'
  return lunarHolidays[key] || null
}
