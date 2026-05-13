<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useScheduleStore } from '@/stores/schedule'
import { useEmployeeStore } from '@/stores/employee'
import dayjs from 'dayjs'

const scheduleStore = useScheduleStore()
const employeeStore = useEmployeeStore()

const viewMode = ref<'day' | 'week' | 'month'>('week')
const currentDate = ref(dayjs())

const shiftTypes = ['早班', '中班', '晚班', '休息', '上班']

// 周视图日期
const weekDates = computed(() => {
  const dates = []
  const start = currentDate.value.startOf('week')
  for (let i = 0; i < 7; i++) {
    dates.push(start.add(i, 'day'))
  }
  return dates
})

// 班次选项
const showShiftPicker = ref(false)
const selectedDateForShift = ref('')
const selectedShiftType = ref('')

function openShiftPicker(date: string) {
  selectedDateForShift.value = date
  const shift = scheduleStore.getShift(employeeStore.currentEmployeeId || '', date)
  selectedShiftType.value = shift?.shiftType || ''
  showShiftPicker.value = true
}

function confirmShift() {
  if (selectedDateForShift.value && employeeStore.currentEmployeeId) {
    scheduleStore.setShift(employeeStore.currentEmployeeId, selectedDateForShift.value, selectedShiftType.value)
  }
  showShiftPicker.value = false
}

function getShiftForDate(date: dayjs.Dayjs) {
  if (!employeeStore.currentEmployeeId) return null
  return scheduleStore.getShift(employeeStore.currentEmployeeId, date.format('YYYY-MM-DD'))
}

/** 微信小程序 WXSS 不支持中文 class 选择器编译结果，用英文类名 */
function shiftCellClass(shiftType: string | undefined) {
  if (!shiftType) return 'empty'
  const m: Record<string, string> = {
    早班: 'shift-morning',
    中班: 'shift-afternoon',
    晚班: 'shift-night',
    休息: 'shift-rest',
    上班: 'shift-work'
  }
  return m[shiftType] || 'empty'
}

function prevWeek() {
  currentDate.value = currentDate.value.subtract(1, 'week')
}

function nextWeek() {
  currentDate.value = currentDate.value.add(1, 'week')
}

onMounted(() => {
  employeeStore.loadFromStorage()
  scheduleStore.loadFromStorage()
})
</script>

<template>
  <view class="container">
    <!-- 导航 -->
    <view class="nav-header">
      <view class="nav-btn" @click="prevWeek">◀</view>
      <text class="nav-title">{{ currentDate.format('YYYY年MM月') }} 第{{ Math.ceil(currentDate.date() / 7) }}周</text>
      <view class="nav-btn" @click="nextWeek">▶</view>
    </view>

    <!-- 员工选择 -->
    <view class="employee-selector" v-if="employeeStore.employees.length > 0">
      <view class="current-employee">
        <view class="emp-dot" :style="{ backgroundColor: employeeStore.currentEmployee?.color }"></view>
        <text>{{ employeeStore.currentEmployee?.name || '请选择' }}</text>
      </view>
    </view>

    <!-- 周视图 -->
    <view class="week-view">
      <view
        v-for="(date, index) in weekDates"
        :key="date.format('YYYY-MM-DD')"
        class="day-column"
        :class="{ today: date.isSame(dayjs(), 'day'), weekend: index === 0 || index === 6 }"
      >
        <view class="day-header">
          <text class="day-name">{{ ['日', '一', '二', '三', '四', '五', '六'][index] }}</text>
          <text class="day-num">{{ date.date() }}</text>
        </view>
        <view class="day-content" @click="openShiftPicker(date.format('YYYY-MM-DD'))">
          <view
            class="shift-cell"
            :class="shiftCellClass(getShiftForDate(date)?.shiftType)"
          >
            {{ getShiftForDate(date)?.shiftType || '点击设置' }}
          </view>
        </view>
      </view>
    </view>

    <!-- 排班规则 -->
    <view class="section">
      <view class="section-title">排班规则</view>
      <view class="rule-list" v-if="scheduleStore.rules.length > 0">
        <view
          v-for="rule in scheduleStore.rules"
          :key="rule.id"
          class="rule-item"
        >
          <view class="rule-info">
            <text>周期: {{ rule.cycle }}天</text>
            <text>班次: {{ rule.shiftPattern.join(' → ') }}</text>
          </view>
          <view class="rule-actions">
            <text @click="scheduleStore.deleteRule(rule.id)">删除</text>
          </view>
        </view>
      </view>
      <view class="empty-tip" v-else>
        暂无排班规则，请在设置中添加
      </view>
    </view>

    <!-- 班次选择弹窗 -->
    <view class="picker-mask" v-if="showShiftPicker" @click="showShiftPicker = false">
      <view class="picker-content" @click.stop>
        <view class="picker-title">选择班次</view>
        <view class="shift-options">
          <view
            v-for="type in shiftTypes"
            :key="type"
            class="shift-option"
            :class="{ active: selectedShiftType === type }"
            @click="selectedShiftType = type"
          >
            {{ type }}
          </view>
        </view>
        <view class="picker-actions">
          <view class="btn-cancel" @click="showShiftPicker = false">取消</view>
          <view class="btn-confirm" @click="confirmShift">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.container {
  padding: 16px;
  background: #f5f5f5;
  min-height: 100vh;
}

.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: white;
  border-radius: 12px;
  margin-bottom: 16px;
}

.nav-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.nav-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 8px;
  color: #666;
}

.employee-selector {
  background: white;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.current-employee {
  display: flex;
  align-items: center;
  gap: 8px;
}

.emp-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.week-view {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  background: white;
  border-radius: 12px;
  padding: 8px;
}

.day-column {
  display: flex;
  flex-direction: column;
  min-height: 120px;
}

.day-column.weekend .day-num {
  color: #ff6b6b;
}

.day-column.today {
  background: #e6f7ff;
  border-radius: 8px;
}

.day-header {
  text-align: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.day-name {
  font-size: 12px;
  color: #999;
  display: block;
}

.day-num {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  display: block;
  margin-top: 4px;
}

.day-content {
  flex: 1;
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.shift-cell {
  font-size: 12px;
  padding: 6px 4px;
  border-radius: 6px;
  text-align: center;
  color: white;
}

.shift-cell.shift-morning {
  background: #52c41a;
}
.shift-cell.shift-afternoon {
  background: #1890ff;
}
.shift-cell.shift-night {
  background: #722ed1;
}
.shift-cell.shift-rest {
  background: #999999;
}
.shift-cell.shift-work {
  background: #fa8c16;
}
.shift-cell.empty {
  background: #f5f5f5;
  color: #999;
  font-size: 10px;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
}

.section-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 8px;
}

.rule-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rule-info text {
  font-size: 13px;
  color: #666;
}

.rule-actions text {
  font-size: 13px;
  color: #ff4d4f;
}

.empty-tip {
  color: #999;
  font-size: 14px;
  text-align: center;
  padding: 20px;
}

.picker-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}

.picker-content {
  width: 100%;
  background: white;
  border-radius: 16px 16px 0 0;
  padding: 20px;
}

.picker-title {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 16px;
}

.shift-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.shift-option {
  padding: 14px;
  background: #f5f5f5;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
}

.shift-option.active {
  background: #1890ff;
  color: white;
}

.picker-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel, .btn-confirm {
  flex: 1;
  padding: 14px;
  border-radius: 8px;
  text-align: center;
  font-size: 15px;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-confirm {
  background: #1890ff;
  color: white;
}
</style>