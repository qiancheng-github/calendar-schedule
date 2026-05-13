import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Employee {
  id: string
  name: string
  color: string
  restDays: number[]  // 0=周日, 1=周一, 2=周二...
  createdAt: number
}

// 默认员工颜色
const defaultColors = ['#1890FF', '#52C41A', '#FA8C16', '#F5222D', '#722ED1', '#13C2C2']

export const useEmployeeStore = defineStore('employee', () => {
  const employees = ref<Employee[]>([])
  const currentEmployeeId = ref<string | null>(null)

  // 从本地存储加载
  function loadFromStorage() {
    const data = uni.getStorageSync('employees')
    if (data) {
      employees.value = JSON.parse(data)
    }
    const current = uni.getStorageSync('currentEmployeeId')
    if (current) {
      currentEmployeeId.value = current
    } else if (employees.value.length > 0) {
      currentEmployeeId.value = employees.value[0].id
    }
  }

  // 保存到本地存储
  function saveToStorage() {
    uni.setStorageSync('employees', JSON.stringify(employees.value))
    if (currentEmployeeId.value) {
      uni.setStorageSync('currentEmployeeId', currentEmployeeId.value)
    }
  }

  // 添加员工
  function addEmployee(name: string, restDays: number[] = [0, 6]) {
    const id = Date.now().toString()
    const colorIndex = employees.value.length % defaultColors.length
    const employee: Employee = {
      id,
      name,
      color: defaultColors[colorIndex],
      restDays,
      createdAt: Date.now()
    }
    employees.value.push(employee)
    if (!currentEmployeeId.value) {
      currentEmployeeId.value = id
    }
    saveToStorage()
    return employee
  }

  // 更新员工
  function updateEmployee(id: string, data: Partial<Employee>) {
    const index = employees.value.findIndex(e => e.id === id)
    if (index !== -1) {
      employees.value[index] = { ...employees.value[index], ...data }
      saveToStorage()
    }
  }

  // 删除员工
  function deleteEmployee(id: string) {
    const index = employees.value.findIndex(e => e.id === id)
    if (index !== -1) {
      employees.value.splice(index, 1)
      if (currentEmployeeId.value === id) {
        currentEmployeeId.value = employees.value.length > 0 ? employees.value[0].id : null
      }
      saveToStorage()
    }
  }

  // 获取当前员工
  const currentEmployee = computed(() => {
    return employees.value.find(e => e.id === currentEmployeeId.value) || null
  })

  // 切换当前员工
  function setCurrentEmployee(id: string) {
    if (employees.value.some(e => e.id === id)) {
      currentEmployeeId.value = id
      saveToStorage()
    }
  }

  // 检查是否是休息日
  function isRestDay(employeeId: string, date: Date): boolean {
    const employee = employees.value.find(e => e.id === employeeId)
    if (!employee) return false
    const dayOfWeek = date.getDay()
    return employee.restDays.includes(dayOfWeek)
  }

  return {
    employees,
    currentEmployeeId,
    currentEmployee,
    loadFromStorage,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    setCurrentEmployee,
    isRestDay
  }
})