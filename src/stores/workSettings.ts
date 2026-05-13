import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import { getHolidayInfo } from '@/static/holiday-data'

export type WorkMode = 'double-weekend' | 'big-small-week' | 'single-rest'
export type WorkDayType = 'work' | 'rest' | 'legal-makeup' | 'single-rest-makeup'
export type ManualWorkDayType = 'work' | 'rest' | 'legal-makeup'

export const useWorkSettingsStore = defineStore('workSettings', () => {
  const mode = ref<WorkMode>('double-weekend')
  const bigWeekAnchor = ref(dayjs().startOf('week').format('YYYY-MM-DD'))
  const deferSingleRestHolidayMakeup = ref(true)
  const dayOverrides = ref<Record<string, ManualWorkDayType>>({})

  const modeLabel = computed(() => {
    if (mode.value === 'big-small-week') return '大小周'
    if (mode.value === 'single-rest') return '单休'
    return '双休'
  })

  function loadFromStorage() {
    const savedMode = uni.getStorageSync('workMode') as WorkMode | ''
    const savedAnchor = uni.getStorageSync('bigWeekAnchor') as string | ''
    const savedDefer = uni.getStorageSync('deferSingleRestHolidayMakeup')

    if (savedMode === 'double-weekend' || savedMode === 'big-small-week' || savedMode === 'single-rest') {
      mode.value = savedMode
    }
    if (savedAnchor) {
      bigWeekAnchor.value = savedAnchor
    }
    if (savedDefer !== '') {
      deferSingleRestHolidayMakeup.value = savedDefer !== false
    }

    const savedOverrides = uni.getStorageSync('workDayOverrides')
    if (savedOverrides) {
      dayOverrides.value = JSON.parse(savedOverrides)
    }
  }

  function saveToStorage() {
    uni.setStorageSync('workMode', mode.value)
    uni.setStorageSync('bigWeekAnchor', bigWeekAnchor.value)
    uni.setStorageSync('deferSingleRestHolidayMakeup', deferSingleRestHolidayMakeup.value)
    uni.setStorageSync('workDayOverrides', JSON.stringify(dayOverrides.value))
  }

  function setMode(nextMode: WorkMode) {
    mode.value = nextMode
    saveToStorage()
  }

  function setCurrentWeekAsBigWeek() {
    bigWeekAnchor.value = dayjs().startOf('week').format('YYYY-MM-DD')
    saveToStorage()
  }

  function setCurrentWeekAsSmallWeek() {
    bigWeekAnchor.value = dayjs().startOf('week').subtract(1, 'week').format('YYYY-MM-DD')
    saveToStorage()
  }

  function setDeferSingleRestHolidayMakeup(enabled: boolean) {
    deferSingleRestHolidayMakeup.value = enabled
    saveToStorage()
  }

  function isBigWeek(date: Date) {
    const targetWeek = dayjs(date).startOf('week')
    const anchorWeek = dayjs(bigWeekAnchor.value).startOf('week')
    const diffWeeks = targetWeek.diff(anchorWeek, 'week')
    return Math.abs(diffWeeks % 2) === 0
  }

  function formatDate(date: Date) {
    return dayjs(date).format('YYYY-MM-DD')
  }

  function setDayOverride(date: Date | string, type: ManualWorkDayType) {
    const dateStr = typeof date === 'string' ? date : formatDate(date)
    dayOverrides.value[dateStr] = type
    saveToStorage()
  }

  function clearDayOverride(date: Date | string) {
    const dateStr = typeof date === 'string' ? date : formatDate(date)
    delete dayOverrides.value[dateStr]
    saveToStorage()
  }

  function getDayOverride(date: Date | string): ManualWorkDayType | null {
    const dateStr = typeof date === 'string' ? date : formatDate(date)
    return dayOverrides.value[dateStr] || null
  }

  function isHolidayRest(date: dayjs.Dayjs) {
    const holidayInfo = getHolidayInfo(date.toDate())
    return !!holidayInfo && (holidayInfo.isWorkDay === false || holidayInfo.isHoliday)
  }

  function findHolidayStart(date: dayjs.Dayjs) {
    let current = date
    while (isHolidayRest(current.subtract(1, 'day'))) {
      current = current.subtract(1, 'day')
    }
    return current
  }

  function findHolidayEnd(date: dayjs.Dayjs) {
    let current = date
    while (isHolidayRest(current.add(1, 'day'))) {
      current = current.add(1, 'day')
    }
    return current
  }

  function shouldDeferMakeupToDate(date: Date, targetMode: WorkMode = mode.value) {
    if (!deferSingleRestHolidayMakeup.value || targetMode !== 'big-small-week') return false

    const target = dayjs(date)
    if (target.day() !== 6 || isBigWeek(date) || isHolidayRest(target)) return false

    let cursor = target.subtract(1, 'day')
    while (cursor.isAfter(target.subtract(45, 'day'))) {
      if (isHolidayRest(cursor)) {
        const start = findHolidayStart(cursor)
        const end = findHolidayEnd(cursor)
        const needsMakeup = Array.from({ length: end.diff(start, 'day') + 1 }).some((_, index) => {
          const holidayDay = start.add(index, 'day')
          return holidayDay.day() === 6 && isBigWeek(holidayDay.toDate())
        })

        if (!needsMakeup) {
          cursor = start.subtract(1, 'day')
          continue
        }

        let nextSaturday = end.add(1, 'day')
        while (nextSaturday.day() !== 6) {
          nextSaturday = nextSaturday.add(1, 'day')
        }
        while (
          isBigWeek(nextSaturday.toDate()) ||
          isHolidayRest(nextSaturday) ||
          getHolidayInfo(nextSaturday.toDate())?.isWorkDay === true
        ) {
          nextSaturday = nextSaturday.add(7, 'day')
        }
        return nextSaturday.isSame(target, 'day')
      }
      cursor = cursor.subtract(1, 'day')
    }
    return false
  }

  function getDayWorkTypeByMode(date: Date, targetMode: WorkMode = mode.value, useOverrides = true): WorkDayType {
    const override = useOverrides ? getDayOverride(date) : null
    if (override) return override

    if (shouldDeferMakeupToDate(date, targetMode)) return 'single-rest-makeup'

    const holidayInfo = getHolidayInfo(date)
    if (holidayInfo?.isWorkDay === true) return 'legal-makeup'
    if (holidayInfo?.isWorkDay === false || holidayInfo?.isHoliday) return 'rest'

    const day = date.getDay()
    if (day === 0) return 'rest'
    if (day === 6) {
      if (targetMode === 'single-rest') return 'work'
      return targetMode === 'big-small-week' && isBigWeek(date) ? 'work' : 'rest'
    }
    return 'work'
  }

  function getDayWorkType(date: Date): WorkDayType {
    return getDayWorkTypeByMode(date)
  }

  function getDayWorkStatus(date: Date): boolean {
    return getDayWorkType(date) !== 'rest'
  }

  function getDayWorkLabel(date: Date) {
    const type = getDayWorkType(date)
    if (type === 'legal-makeup') return '法补'
    if (type === 'single-rest-makeup') return '单补'
    return type === 'work' ? '班' : '休'
  }

  return {
    mode,
    modeLabel,
    bigWeekAnchor,
    deferSingleRestHolidayMakeup,
    dayOverrides,
    loadFromStorage,
    setMode,
    setCurrentWeekAsBigWeek,
    setCurrentWeekAsSmallWeek,
    setDeferSingleRestHolidayMakeup,
    setDayOverride,
    clearDayOverride,
    getDayOverride,
    isBigWeek,
    getDayWorkTypeByMode,
    getDayWorkType,
    getDayWorkStatus,
    getDayWorkLabel
  }
})
