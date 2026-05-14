import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'

export const useCalendarStore = defineStore('calendar', () => {
  const currentDate = ref(dayjs())
  const selectedDate = ref(dayjs())

  // 当前月份信息
  const currentMonth = computed(() => currentDate.value.format('YYYY-MM'))

  // 月初第一天
  const firstDayOfMonth = computed(() => currentDate.value.startOf('month'))

  // 月末最后一天
  const lastDayOfMonth = computed(() => currentDate.value.endOf('month'))

  // 当月总天数
  const daysInMonth = computed(() => currentDate.value.daysInMonth())

  // 当月第一天是周几 (0=周日, 1=周一...)
  const firstDayWeekday = computed(() => firstDayOfMonth.value.day())

  // 日历网格需要的天数（包含上月和下月的补齐）
  const calendarDays = computed(() => {
    const days: dayjs.Dayjs[] = []

    // 上月补齐
    const prevMonth = currentDate.value.subtract(1, 'month')
    const prevMonthDays = prevMonth.daysInMonth()
    for (let i = firstDayWeekday.value - 1; i >= 0; i--) {
      days.push(prevMonth.date(prevMonthDays - i))
    }

    // 当月
    for (let i = 1; i <= daysInMonth.value; i++) {
      days.push(currentDate.value.date(i))
    }

    // 下月补齐：只补到「上月占位 + 当月」占满的整行末尾，不强制 6 行 42 格（避免多出一整行非本月）
    const used = days.length
    const rows = Math.ceil(used / 7)
    const totalCells = rows * 7
    const remaining = totalCells - used
    for (let i = 1; i <= remaining; i++) {
      days.push(currentDate.value.add(1, 'month').date(i))
    }

    return days
  })

  // 上个月
  function prevMonth() {
    currentDate.value = currentDate.value.subtract(1, 'month')
  }

  // 下个月
  function nextMonth() {
    currentDate.value = currentDate.value.add(1, 'month')
  }

  // 回到今天
  function goToToday() {
    currentDate.value = dayjs()
    selectedDate.value = dayjs()
  }

  // 选择日期
  function selectDate(date: dayjs.Dayjs) {
    selectedDate.value = date
  }

  /** 从列表等入口跳到某日：同步切换月份，保证格子里能选中该天 */
  function showDayInCalendar(date: dayjs.Dayjs) {
    const d = date.startOf('day')
    currentDate.value = d.startOf('month')
    selectedDate.value = d
  }

  // 是否是当前月份
  function isCurrentMonth(date: dayjs.Dayjs): boolean {
    return date.format('YYYY-MM') === currentMonth.value
  }

  // 是否是今天
  function isToday(date: dayjs.Dayjs): boolean {
    return date.isSame(dayjs(), 'day')
  }

  // 是否选中
  function isSelected(date: dayjs.Dayjs): boolean {
    return date.isSame(selectedDate.value, 'day')
  }

  return {
    currentDate,
    selectedDate,
    currentMonth,
    firstDayOfMonth,
    lastDayOfMonth,
    daysInMonth,
    firstDayWeekday,
    calendarDays,
    prevMonth,
    nextMonth,
    goToToday,
    selectDate,
    showDayInCalendar,
    isCurrentMonth,
    isToday,
    isSelected
  }
})