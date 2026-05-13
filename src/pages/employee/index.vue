<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEmployeeStore, type Employee } from '@/stores/employee'

const employeeStore = useEmployeeStore()

const showAddModal = ref(false)
const editingEmployee = ref<Employee | null>(null)
const employeeName = ref('')
const selectedRestDays = ref<number[]>([0, 6])

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const colorOptions = ['#1890FF', '#52C41A', '#FA8C16', '#F5222D', '#722ED1', '#13C2C2', '#EB2F96', '#A0D911']

function openAddModal() {
  editingEmployee.value = null
  employeeName.value = ''
  selectedRestDays.value = [0, 6]
  showAddModal.value = true
}

function openEditModal(emp: Employee) {
  editingEmployee.value = emp
  employeeName.value = emp.name
  selectedRestDays.value = [...emp.restDays]
  showAddModal.value = true
}

function toggleRestDay(day: number) {
  const index = selectedRestDays.value.indexOf(day)
  if (index > -1) {
    selectedRestDays.value.splice(index, 1)
  } else {
    selectedRestDays.value.push(day)
  }
}

function saveEmployee() {
  if (!employeeName.value.trim()) {
    uni.showToast({ title: '请输入员工姓名', icon: 'none' })
    return
  }

  if (editingEmployee.value) {
    employeeStore.updateEmployee(editingEmployee.value.id, {
      name: employeeName.value,
      restDays: [...selectedRestDays.value]
    })
  } else {
    employeeStore.addEmployee(employeeName.value, [...selectedRestDays.value])
  }

  showAddModal.value = false
}

function deleteEmployee(id: string) {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除该员工吗？',
    success: (res) => {
      if (res.confirm) {
        employeeStore.deleteEmployee(id)
      }
    }
  })
}

onMounted(() => {
  employeeStore.loadFromStorage()
})
</script>

<template>
  <view class="container">
    <!-- 员工列表 -->
    <view class="employee-list">
      <view
        v-for="emp in employeeStore.employees"
        :key="emp.id"
        class="employee-card"
        :class="{ active: emp.id === employeeStore.currentEmployeeId }"
      >
        <view class="emp-header">
          <view class="emp-color" :style="{ backgroundColor: emp.color }"></view>
          <text class="emp-name">{{ emp.name }}</text>
          <view class="emp-badge" v-if="emp.id === employeeStore.currentEmployeeId">当前</view>
        </view>
        <view class="emp-info">
          <text class="rest-label">休息日:</text>
          <view class="rest-days">
            <text
              v-for="day in emp.restDays"
              :key="day"
              class="rest-day-tag"
            >{{ weekDays[day] }}</text>
          </view>
        </view>
        <view class="emp-actions">
          <view class="action-btn" @click="openEditModal(emp)">编辑</view>
          <view class="action-btn delete" @click="deleteEmployee(emp.id)">删除</view>
          <view class="action-btn" @click="employeeStore.setCurrentEmployee(emp.id)">设为当前</view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-if="employeeStore.employees.length === 0">
      <text class="empty-text">暂无员工</text>
      <text class="empty-hint">点击下方按钮添加员工</text>
    </view>

    <!-- 添加按钮 -->
    <view class="add-btn" @click="openAddModal">
      <text>+ 添加员工</text>
    </view>

    <!-- 添加/编辑弹窗 -->
    <view class="modal-mask" v-if="showAddModal" @click="showAddModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-title">{{ editingEmployee ? '编辑员工' : '添加员工' }}</view>

        <view class="form-item">
          <text class="form-label">姓名</text>
          <input class="form-input" v-model="employeeName" placeholder="请输入员工姓名" />
        </view>

        <view class="form-item">
          <text class="form-label">休息日</text>
          <view class="week-selector">
            <view
              v-for="(day, index) in weekDays"
              :key="index"
              class="day-option"
              :class="{ selected: selectedRestDays.includes(index) }"
              @click="toggleRestDay(index)"
            >
              {{ day }}
            </view>
          </view>
        </view>

        <view class="form-actions">
          <view class="btn-cancel" @click="showAddModal = false">取消</view>
          <view class="btn-save" @click="saveEmployee">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.container {
  padding: 16px;
  padding-bottom: 100px;
  background: #f5f5f5;
  min-height: 100vh;
}

.employee-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.employee-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
}

.employee-card.active {
  border: 2px solid #1890ff;
}

.emp-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.emp-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.emp-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.emp-badge {
  background: #1890ff;
  color: white;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
}

.emp-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.rest-label {
  font-size: 13px;
  color: #666;
}

.rest-days {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.rest-day-tag {
  background: #f0f0f0;
  color: #666;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
}

.emp-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 12px;
  color: #666;
}

.action-btn.delete {
  color: #ff4d4f;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
}

.empty-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  color: #999;
}

.add-btn {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: #1890ff;
  color: white;
  padding: 14px 40px;
  border-radius: 30px;
  font-size: 15px;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 300px;
  background: white;
  border-radius: 16px;
  padding: 24px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 20px;
}

.form-item {
  margin-bottom: 16px;
}

.form-label {
  font-size: 14px;
  color: #666;
  display: block;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-size: 14px;
}

.week-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.day-option {
  padding: 8px;
  background: #f5f5f5;
  border-radius: 6px;
  text-align: center;
  font-size: 12px;
  color: #666;
}

.day-option.selected {
  background: #1890ff;
  color: white;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-cancel, .btn-save {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-save {
  background: #1890ff;
  color: white;
}
</style>