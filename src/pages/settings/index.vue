<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useScheduleStore } from '@/stores/schedule'
import { useEmployeeStore } from '@/stores/employee'
import { useWorkSettingsStore, type WorkMode } from '@/stores/workSettings'
import dayjs from 'dayjs'

const scheduleStore = useScheduleStore()
const employeeStore = useEmployeeStore()
const workSettingsStore = useWorkSettingsStore()

/** 排班规则、休息日设置：设置页暂不展示，改为 true 可恢复 */
const showScheduleAdvancedSections = false

/** 本周六是否为大周（上班周六），用于大小周锚点按钮选中态 */
const thisSaturdayIsBigWeek = computed(() =>
  workSettingsStore.isBigWeek(dayjs().day(6).toDate())
)

// 班次选项
const shiftTypes = ['早班', '中班', '晚班', '休息', '上班']

/** 微信小程序 WXSS 不支持中文 class 选择器；展示仍用中文 shift */
function shiftTypeClass(shift: string) {
  const m: Record<string, string> = {
    早班: 'shift-morning',
    中班: 'shift-afternoon',
    晚班: 'shift-night',
    休息: 'shift-rest',
    上班: 'shift-work'
  }
  return m[shift] || ''
}

// 新规则
const showRuleModal = ref(false)
const ruleEmployeeId = ref('')
const ruleCycle = ref(4)
const rulePattern = ref<string[]>(['早班', '中班', '晚班', '休息'])

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 休息日设置
const restDays = ref<number[]>([0, 6])

function openRuleModal() {
  ruleEmployeeId.value = employeeStore.currentEmployeeId || ''
  ruleCycle.value = 4
  rulePattern.value = ['早班', '中班', '晚班', '休息']
  showRuleModal.value = true
}

function setRulePattern(index: number, value: string) {
  rulePattern.value[index] = value
}

function togglePatternShift(index: number) {
  const current = rulePattern.value[index]
  const currentIndex = shiftTypes.indexOf(current)
  rulePattern.value[index] = shiftTypes[(currentIndex + 1) % shiftTypes.length]
}

function saveRule() {
  if (!ruleEmployeeId.value) {
    uni.showToast({ title: '请选择员工', icon: 'none' })
    return
  }

  // 检查是否已有规则，有则更新
  const existingRule = scheduleStore.getRuleByEmployee(ruleEmployeeId.value)
  if (existingRule) {
    scheduleStore.updateRule(existingRule.id, {
      cycle: ruleCycle.value,
      shiftPattern: [...rulePattern.value],
      startDate: dayjs().format('YYYY-MM-DD')
    })
  } else {
    scheduleStore.addRule({
      employeeId: ruleEmployeeId.value,
      type: 'custom',
      cycle: ruleCycle.value,
      shiftPattern: [...rulePattern.value],
      startDate: dayjs().format('YYYY-MM-DD')
    })
  }

  showRuleModal.value = false
  uni.showToast({ title: '保存成功', icon: 'success' })
}

function clearAllData() {
  uni.showModal({
    title: '确认清空',
    content: '确定要清空所有排班数据吗？',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorageSync()
        uni.reLaunch({ url: '/pages/index/index' })
      }
    }
  })
}

onMounted(() => {
  employeeStore.loadFromStorage()
  scheduleStore.loadFromStorage()
  workSettingsStore.loadFromStorage()

  if (employeeStore.currentEmployee) {
    restDays.value = [...employeeStore.currentEmployee.restDays]
  }
})

function setWorkMode(mode: WorkMode) {
  workSettingsStore.setMode(mode)
  uni.showToast({ title: '保存成功', icon: 'success' })
}

function setBigWeekAnchor(type: 'big' | 'small') {
  if (type === 'big') {
    workSettingsStore.setCurrentWeekAsBigWeek()
  } else {
    workSettingsStore.setCurrentWeekAsSmallWeek()
  }
  uni.showToast({ title: '保存成功', icon: 'success' })
}

function toggleDeferSingleRestHolidayMakeup(event: Event) {
  const checked = (event as unknown as { detail: { value: boolean } }).detail.value
  workSettingsStore.setDeferSingleRestHolidayMakeup(checked)
}

function saveRestDays() {
  if (employeeStore.currentEmployeeId) {
    employeeStore.updateEmployee(employeeStore.currentEmployeeId, {
      restDays: [...restDays.value]
    })
    // 重新生成排班
    const rule = scheduleStore.getRuleByEmployee(employeeStore.currentEmployeeId)
    if (rule) {
      scheduleStore.generateShifts(employeeStore.currentEmployeeId)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
  }
}

function toggleRestDay(day: number) {
  const index = restDays.value.indexOf(day)
  if (index > -1) {
    restDays.value.splice(index, 1)
  } else {
    restDays.value.push(day)
  }
}
</script>

<template>
  <view class="container">
    <view class="section">
      <view class="section-title">作息模式</view>
      <view class="mode-selector">
        <view
          class="mode-option"
          :class="{ selected: workSettingsStore.mode === 'double-weekend' }"
          @click="setWorkMode('double-weekend')"
        >
          <text class="mode-name">双休</text>
          <text class="mode-desc">法定节假日优先，周六周日休息</text>
        </view>
        <view
          class="mode-option"
          :class="{ selected: workSettingsStore.mode === 'big-small-week' }"
          @click="setWorkMode('big-small-week')"
        >
          <text class="mode-name">大小周</text>
          <text class="mode-desc">法定节假日优先，周六隔周上班</text>
        </view>
        <view
          class="mode-option"
          :class="{ selected: workSettingsStore.mode === 'single-rest' }"
          @click="setWorkMode('single-rest')"
        >
          <text class="mode-name">单休</text>
          <text class="mode-desc">法定节假日优先，周六上班周日休息</text>
        </view>
      </view>
      <view class="big-week-options" v-if="workSettingsStore.mode === 'big-small-week'">
        <view class="hint-text">设置本周属于哪一周，用来推算之后每个周六。</view>
        <view class="anchor-actions">
          <view
            class="anchor-btn"
            :class="{ selected: thisSaturdayIsBigWeek }"
            @click="setBigWeekAnchor('big')"
          >本周周六上班</view>
          <view
            class="anchor-btn secondary"
            :class="{ selected: !thisSaturdayIsBigWeek }"
            @click="setBigWeekAnchor('small')"
          >本周周六休息</view>
        </view>
      </view>
      <view class="switch-row">
        <view>
          <view class="switch-title">单休假期补班顺延</view>
          <view class="switch-desc">假期遇到本该上班的周六时，自动顺延到下一个双休周六补班</view>
        </view>
        <switch
          :checked="workSettingsStore.deferSingleRestHolidayMakeup"
          @change="toggleDeferSingleRestHolidayMakeup"
        />
      </view>
    </view>
    <!-- 当前员工休息日设置 -->
    <view class="section" v-if="showScheduleAdvancedSections">
      <view class="section-title">休息日设置</view>
      <view class="employee-selector" v-if="employeeStore.currentEmployee">
        <view class="emp-info">
          <view class="emp-dot" :style="{ backgroundColor: employeeStore.currentEmployee.color }"></view>
          <text>{{ employeeStore.currentEmployee.name }}</text>
        </view>
      </view>
      <view class="week-selector">
        <view
          v-for="(day, index) in weekDays"
          :key="index"
          class="day-option"
          :class="{ selected: restDays.includes(index) }"
          @click="toggleRestDay(index)"
        >
          {{ day }}
        </view>
      </view>
      <view class="save-btn" @click="saveRestDays">
        <text>保存休息日</text>
      </view>
    </view>

    <!-- 排班规则 -->
    <view class="section" v-if="showScheduleAdvancedSections">
      <view class="section-title">排班规则</view>
      <view class="rule-info" v-if="scheduleStore.rules.length > 0">
        <view
          v-for="rule in scheduleStore.rules"
          :key="rule.id"
          class="rule-item"
        >
          <view class="rule-header">
            <text>周期: {{ rule.cycle }}天</text>
          </view>
          <view class="rule-pattern">
            <view
              v-for="(shift, index) in rule.shiftPattern"
              :key="index"
              class="pattern-item"
              :class="shiftTypeClass(shift)"
            >
              {{ shift }}
            </view>
          </view>
        </view>
      </view>
      <view class="empty-tip" v-else>
        暂无排班规则
      </view>
      <view class="add-rule-btn" @click="openRuleModal">
        <text>+ 设置排班规则</text>
      </view>
    </view>

    <!-- 数据管理 -->
    <view class="section danger-zone">
      <view class="section-title">数据管理</view>
      <view class="danger-btn" @click="clearAllData">
        <text>清空所有数据</text>
      </view>
    </view>

    <!-- 排班规则弹窗 -->
    <view class="modal-mask" v-if="showScheduleAdvancedSections && showRuleModal" @click="showRuleModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-title">设置排班规则</view>

        <view class="form-item">
          <text class="form-label">选择员工</text>
          <view class="employee-grid">
            <view
              v-for="emp in employeeStore.employees"
              :key="emp.id"
              class="emp-option"
              :class="{ selected: ruleEmployeeId === emp.id }"
              @click="ruleEmployeeId = emp.id"
            >
              <view class="emp-dot" :style="{ backgroundColor: emp.color }"></view>
              <text>{{ emp.name }}</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">排班周期 (天数)</text>
          <view class="cycle-selector">
            <view
              v-for="n in [2, 3, 4, 5, 6, 7]"
              :key="n"
              class="cycle-option"
              :class="{ selected: ruleCycle === n }"
              @click="ruleCycle = n"
            >
              {{ n }}天
            </view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">班次顺序</text>
          <view class="pattern-selector">
            <view
              v-for="(shift, index) in rulePattern"
              :key="index"
              class="pattern-slot"
              @click="togglePatternShift(index)"
            >
              <text class="slot-index">{{ index + 1 }}</text>
              <text class="slot-value" :class="shiftTypeClass(shift)">{{ shift }}</text>
            </view>
          </view>
        </view>

        <view class="form-actions">
          <view class="btn-cancel" @click="showRuleModal = false">取消</view>
          <view class="btn-save" @click="saveRule">保存</view>
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

.section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.mode-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.mode-option {
  min-height: 72px;
  padding: 12px;
  border-radius: 8px;
  background: #f5f5f5;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.mode-option.selected {
  background: #e6f7ff;
  border-color: #1890ff;
}

.mode-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.mode-desc {
  font-size: 12px;
  line-height: 1.4;
  color: #777;
}

.big-week-options {
  margin-top: 12px;
}

.hint-text {
  color: #999;
  font-size: 12px;
  margin-bottom: 10px;
}

.anchor-actions {
  display: flex;
  gap: 10px;
}

.anchor-btn {
  flex: 1;
  padding: 12px 8px;
  border-radius: 8px;
  text-align: center;
  font-size: 13px;
  border: 2px solid #e8e8e8;
  background: #f5f5f5;
  color: #999;
}

.anchor-btn.selected {
  background: #1890ff;
  border-color: #1890ff;
  color: #fff;
  font-weight: 600;
}

.anchor-btn.secondary.selected {
  background: #52c41a;
  border-color: #389e0d;
  color: #fff;
}

.switch-row {
  margin-top: 14px;
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.switch-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.switch-desc {
  color: #777;
  font-size: 12px;
  line-height: 1.4;
}

.employee-selector {
  margin-bottom: 16px;
}

.emp-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.emp-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.week-selector {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 16px;
}

.day-option {
  padding: 10px 4px;
  background: #f5f5f5;
  border-radius: 8px;
  text-align: center;
  font-size: 12px;
  color: #666;
}

.day-option.selected {
  background: #1890ff;
  color: white;
}

.save-btn, .add-rule-btn {
  background: #1890ff;
  color: white;
  padding: 14px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
}

.rule-info {
  margin-bottom: 16px;
}

.rule-item {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 8px;
}

.rule-header {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.rule-pattern {
  display: flex;
  gap: 8px;
}

.pattern-item {
  padding: 6px 12px;
  border-radius: 6px;
  color: white;
  font-size: 12px;
}

.pattern-item.shift-morning {
  background: #52c41a;
}
.pattern-item.shift-afternoon {
  background: #1890ff;
}
.pattern-item.shift-night {
  background: #722ed1;
}
.pattern-item.shift-rest {
  background: #999999;
}
.pattern-item.shift-work {
  background: #fa8c16;
}

.empty-tip {
  color: #999;
  font-size: 14px;
  text-align: center;
  padding: 20px 0;
}

.danger-zone {
  border: 1px solid #ff4d4f;
}

.danger-zone .section-title {
  color: #ff4d4f;
}

.danger-btn {
  background: #fff1f0;
  border: 1px solid #ff4d4f;
  color: #ff4d4f;
  padding: 14px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
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
  width: 320px;
  max-height: 80vh;
  overflow-y: auto;
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

.employee-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.emp-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 13px;
}

.emp-option.selected {
  background: #e6f7ff;
  border: 1px solid #1890ff;
}

.cycle-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.cycle-option {
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
  text-align: center;
  font-size: 13px;
}

.cycle-option.selected {
  background: #1890ff;
  color: white;
}

.pattern-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.pattern-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: #f5f5f5;
  border-radius: 8px;
}

.slot-index {
  font-size: 10px;
  color: #999;
  margin-bottom: 4px;
}

.slot-value {
  font-size: 13px;
  font-weight: 500;
}

.slot-value.shift-morning {
  color: #52c41a;
}
.slot-value.shift-afternoon {
  color: #1890ff;
}
.slot-value.shift-night {
  color: #722ed1;
}
.slot-value.shift-rest {
  color: #999999;
}
.slot-value.shift-work {
  color: #fa8c16;
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
