import { defineStore } from 'pinia'
import { ref } from 'vue'
import dayjs from 'dayjs'

export interface ScheduleRule {
  id: string
  employeeId: string
  type: 'daily' | 'weekly' | 'custom'
  cycle: number        // 周期天数
  shiftPattern: string[] // 排班顺序，如 ['早班', '中班', '晚班', '休息']
  startDate: string    // 规则起始日期 YYYY-MM-DD
}

export interface Shift {
  id: string
  date: string         // YYYY-MM-DD
  employeeId: string
  shiftType: string   // '早班' | '中班' | '晚班' | '休息' | '上班'
  isCustom: boolean   // 是否手动调整
  note: string
}

export const useScheduleStore = defineStore('schedule', () => {
  const rules = ref<ScheduleRule[]>([])
  const shifts = ref<Shift[]>([])
  const holidays = ref<Record<string, boolean>>({}) // 手动设置的节假日

  // 从本地存储加载
  function loadFromStorage() {
    const rulesData = uni.getStorageSync('scheduleRules')
    if (rulesData) {
      rules.value = JSON.parse(rulesData)
    }
    const shiftsData = uni.getStorageSync('shifts')
    if (shiftsData) {
      shifts.value = JSON.parse(shiftsData)
    }
    const holidaysData = uni.getStorageSync('customHolidays')
    if (holidaysData) {
      holidays.value = JSON.parse(holidaysData)
    }
  }

  // 保存到本地存储
  function saveToStorage() {
    uni.setStorageSync('scheduleRules', JSON.stringify(rules.value))
    uni.setStorageSync('shifts', JSON.stringify(shifts.value))
    uni.setStorageSync('customHolidays', JSON.stringify(holidays.value))
  }

  // 添加排班规则
  function addRule(rule: Omit<ScheduleRule, 'id'>) {
    const id = Date.now().toString()
    rules.value.push({ ...rule, id })
    saveToStorage()
    // 生成排班
    generateShifts(rule.employeeId)
    return id
  }

  // 更新规则
  function updateRule(id: string, data: Partial<ScheduleRule>) {
    const index = rules.value.findIndex(r => r.id === id)
    if (index !== -1) {
      rules.value[index] = { ...rules.value[index], ...data }
      saveToStorage()
      // 重新生成排班
      generateShifts(rules.value[index].employeeId)
    }
  }

  // 删除规则
  function deleteRule(id: string) {
    const rule = rules.value.find(r => r.id === id)
    if (rule) {
      // 删除关联的排班
      shifts.value = shifts.value.filter(s => s.employeeId !== rule.employeeId || !s.isCustom)
      rules.value = rules.value.filter(r => r.id !== id)
      saveToStorage()
    }
  }

  // 获取某员工的排班规则
  function getRuleByEmployee(employeeId: string) {
    return rules.value.find(r => r.employeeId === employeeId)
  }

  // 生成排班（根据规则）
  function generateShifts(employeeId: string) {
    const rule = rules.value.find(r => r.employeeId === employeeId)
    if (!rule) return

    const startDate = dayjs(rule.startDate)
    const today = dayjs().startOf('day')
    const endDate = today.add(90, 'day') // 生成未来90天

    // 清除旧的无自定义的排班
    shifts.value = shifts.value.filter(s => s.employeeId !== employeeId || s.isCustom)

    // 生成新排班
    let currentDate = startDate
    let patternIndex = 0

    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
      // 检查是否已有自定义排班
      const existingShift = shifts.value.find(
        s => s.employeeId === employeeId && s.date === currentDate.format('YYYY-MM-DD') && s.isCustom
      )

      if (!existingShift) {
        const shift: Shift = {
          id: `${employeeId}_${currentDate.format('YYYYMMDD')}`,
          date: currentDate.format('YYYY-MM-DD'),
          employeeId,
          shiftType: rule.shiftPattern[patternIndex % rule.shiftPattern.length],
          isCustom: false,
          note: ''
        }
        shifts.value.push(shift)
      }

      patternIndex++
      currentDate = currentDate.add(1, 'day')
    }

    saveToStorage()
  }

  // 手动设置排班
  function setShift(employeeId: string, date: string, shiftType: string, note: string = '') {
    const existingIndex = shifts.value.findIndex(
      s => s.employeeId === employeeId && s.date === date
    )

    if (existingIndex !== -1) {
      shifts.value[existingIndex] = {
        ...shifts.value[existingIndex],
        shiftType,
        isCustom: true,
        note
      }
    } else {
      shifts.value.push({
        id: `${employeeId}_${date.replace(/-/g, '')}`,
        date,
        employeeId,
        shiftType,
        isCustom: true,
        note
      })
    }
    saveToStorage()
  }

  // 获取某天的排班
  function getShift(employeeId: string, date: string): Shift | undefined {
    return shifts.value.find(
      s => s.employeeId === employeeId && s.date === date
    )
  }

  // 获取某员工一段时间的排班
  function getShiftsByRange(employeeId: string, startDate: string, endDate: string): Shift[] {
    return shifts.value.filter(
      s => s.employeeId === employeeId &&
           s.date >= startDate &&
           s.date <= endDate
    )
  }

  // 设置自定义节假日
  function setHoliday(date: string, isHoliday: boolean) {
    holidays.value[date] = isHoliday
    saveToStorage()
  }

  // 获取自定义节假日
  function isHolidayCustom(date: string): boolean | null {
    return holidays.value[date] !== undefined ? holidays.value[date] : null
  }

  return {
    rules,
    shifts,
    holidays,
    loadFromStorage,
    addRule,
    updateRule,
    deleteRule,
    getRuleByEmployee,
    generateShifts,
    setShift,
    getShift,
    getShiftsByRange,
    setHoliday,
    isHolidayCustom
  }
})