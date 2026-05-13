<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useCalendarStore } from '@/stores/calendar'
import { useWorkSettingsStore } from '@/stores/workSettings'
import { solarToLunar, getLunarHoliday, formatLunarCalendarCell } from '@/utils/lunar'
import { getHolidayInfo, holidayDisplayBaseName } from '@/static/holiday-data'
import dayjs from 'dayjs'

const calendarStore = useCalendarStore()
const workSettingsStore = useWorkSettingsStore()

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

// 获取某一天的信息
function getDayInfo(date: dayjs.Dayjs) {
  const dateStr = date.format('YYYY-MM-DD')
  const d = date.toDate()
  const lunar = solarToLunar(d)
  const lunarHoliday = getLunarHoliday(d)
  const holidayInfo = getHolidayInfo(d)
  const workOverride = workSettingsStore.getDayOverride(dateStr)
  const workType = workSettingsStore.getDayWorkType(d)
  const workStatus = workSettingsStore.getDayWorkStatus(d)
  const workLabel = workSettingsStore.getDayWorkLabel(d)
  const isCurrentMonth = calendarStore.isCurrentMonth(date)

  const lunarCalendarText = formatLunarCalendarCell(d)
  const showStatutoryHolidayTag = !!holidayInfo?.isHoliday
  const statutoryBase = holidayInfo?.isHoliday ? holidayDisplayBaseName(holidayInfo.name) : ''
  const showLunarFestivalRow = !!lunarHoliday && lunarHoliday !== statutoryBase

  return {
    date,
    dateStr,
    day: date.date(),
    lunar,
    lunarHoliday,
    lunarCalendarText,
    showStatutoryHolidayTag,
    showLunarFestivalRow,
    holidayInfo,
    workOverride,
    workType,
    workStatus,
    workLabel,
    isCurrentMonth,
    isToday: calendarStore.isToday(date),
    isSelected: calendarStore.isSelected(date)
  }
}

const days = computed(() => {
  return calendarStore.calendarDays.map(d => getDayInfo(d))
})

onMounted(() => {
  workSettingsStore.loadFromStorage()
})

// 点击日期
function onDayClick(day: ReturnType<typeof getDayInfo>) {
  calendarStore.selectDate(day.date)
}

function setSelectedWorkType(type: 'work' | 'rest' | 'legal-makeup') {
  if (!calendarStore.selectedDate) return
  workSettingsStore.setDayOverride(calendarStore.selectedDate.format('YYYY-MM-DD'), type)
}

function clearSelectedWorkType() {
  if (!calendarStore.selectedDate) return
  workSettingsStore.clearDayOverride(calendarStore.selectedDate.format('YYYY-MM-DD'))
}
</script>

<template>
  <view class="container">
    <!-- 月份导航 -->
    <view class="month-nav">
      <view class="nav-btn" @click="calendarStore.prevMonth()">◀</view>
      <view class="month-center">
        <view class="month-title">{{ calendarStore.currentDate.format('YYYY年MM月') }}</view>
        <view class="today-btn" @click="calendarStore.goToToday()">回到今日</view>
      </view>
      <view class="nav-btn" @click="calendarStore.nextMonth()">▶</view>
    </view>

    <!-- 星期标题 -->
    <view class="week-header">
      <view class="week-day" v-for="(day, index) in weekDays" :key="index" :class="{ weekend: index === 0 || index === 6 }">
        {{ day }}
      </view>
    </view>

    <!-- 日历网格 -->
    <view class="calendar-grid">
      <view
        v-for="(day, index) in days"
        :key="index"
        class="day-cell"
        :class="{
          'other-month': !day.isCurrentMonth,
          'is-today': day.isToday,
          'is-selected': day.isSelected,
          'weekend': day.date.day() === 0 || day.date.day() === 6
        }"
        @click="onDayClick(day)"
      >
        <view class="day-number">{{ day.day }}</view>

        <!-- 农历日期（始终显示） -->
        <view
          class="lunar-calendar"
          :class="{ 'is-holiday': day.lunarHoliday || day.holidayInfo?.isHoliday }"
        >
          {{ day.lunarCalendarText }}
        </view>
        <view
          v-if="day.showLunarFestivalRow"
          class="lunar-festival"
        >
          {{ day.lunarHoliday }}
        </view>

        <!-- 法定节日名（端午/中秋/春节等仅在农历正日子显示） -->
        <view class="holiday-tag" v-if="day.showStatutoryHolidayTag && day.holidayInfo">
          {{ day.holidayInfo.name }}
        </view>

        <!-- 调休标记 -->
        <view
          class="work-tag"
          :class="{
            rest: day.workType === 'rest',
            legalMakeup: day.workType === 'legal-makeup',
            singleMakeup: day.workType === 'single-rest-makeup'
          }"
        >
          {{ day.workLabel }}
        </view>

      </view>
    </view>

    <!-- 选中日期详情 -->
    <view class="selected-detail" v-if="calendarStore.selectedDate">
      <view class="detail-header">
        <text class="detail-date">{{ calendarStore.selectedDate.format('YYYY年MM月DD日') }}</text>
        <text class="detail-week">{{ weekDays[calendarStore.selectedDate.day()] }}</text>
      </view>
      <view class="detail-info">
        <text class="detail-lunar">
          {{ getDayInfo(calendarStore.selectedDate).lunar.lunarYearName }}年
          {{ getDayInfo(calendarStore.selectedDate).lunar.monthName }}月
          {{ getDayInfo(calendarStore.selectedDate).lunar.dayName }}
        </text>
      </view>
      <view class="detail-status">
        <text
          :class="getDayInfo(calendarStore.selectedDate).workStatus === true ? 'status-work' : 'status-rest'"
        >
          {{ getDayInfo(calendarStore.selectedDate).workLabel }}
        </text>
        <text class="manual-tip" v-if="getDayInfo(calendarStore.selectedDate).workOverride">手动</text>
      </view>
      <view class="manual-actions">
        <view class="manual-btn work" @click="setSelectedWorkType('work')">设为班</view>
        <view class="manual-btn rest" @click="setSelectedWorkType('rest')">设为休</view>
        <view class="manual-btn makeup" @click="setSelectedWorkType('legal-makeup')">设为法补</view>
        <view class="manual-btn auto" @click="clearSelectedWorkType">恢复自动</view>
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

.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  margin-bottom: 8px;
  gap: 8px;
}

.month-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.month-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.today-btn {
  font-size: 13px;
  color: #1890ff;
  padding: 4px 10px;
}

.nav-btn {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 8px;
  color: #666;
  font-size: 14px;
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: white;
  border-radius: 8px;
  padding: 8px 0;
  margin-bottom: 8px;
}

.week-day {
  text-align: center;
  font-size: 12px;
  color: #666;
  padding: 6px 0;
}

.week-day.weekend {
  color: #ff6b6b;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  background: white;
  border-radius: 12px;
  padding: 8px;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 4px;
  border-radius: 8px;
  background: #fff;
  min-height: 0;
  position: relative;
}

.day-cell.weekend .day-number {
  color: #ff6b6b;
}

.day-cell.is-today {
  background: #e6f7ff;
}

.day-cell.is-today .day-number {
  color: #1890ff;
  font-weight: bold;
}

.day-cell.is-selected {
  background: #1890ff;
}

.day-cell.is-selected .day-number,
.day-cell.is-selected .lunar-calendar,
.day-cell.is-selected .lunar-festival {
  color: white;
}

.day-cell.other-month {
  opacity: 0.4;
}

.day-number {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.lunar-calendar {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lunar-calendar.is-holiday {
  color: #ff6b6b;
}

.lunar-festival {
  font-size: 9px;
  color: #ff6b6b;
  margin-top: 1px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.holiday-tag {
  background: #ff6b6b;
  color: white;
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 4px;
  margin-top: 2px;
}

.work-tag {
  background: #fa8c16;
  color: white;
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 4px;
  margin-top: 2px;
  min-width: 14px;
  text-align: center;
}

.work-tag.rest {
  background: #52c41a;
}

.work-tag.legalMakeup {
  background: #f5222d;
  min-width: 28px;
}

.work-tag.singleMakeup {
  background: #722ed1;
  min-width: 28px;
}

.selected-detail {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
}

.detail-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.detail-date {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.detail-week {
  font-size: 14px;
  color: #666;
}

.detail-info {
  margin-bottom: 8px;
}

.detail-lunar {
  font-size: 14px;
  color: #666;
}

.detail-status {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-work {
  color: #fa8c16;
  font-weight: 500;
}

.status-rest {
  color: #52c41a;
  font-weight: 500;
}

.manual-tip {
  background: #fff7e6;
  color: #fa8c16;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.manual-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.manual-btn {
  padding: 9px 4px;
  border-radius: 6px;
  text-align: center;
  color: white;
  font-size: 12px;
}

.manual-btn.work {
  background: #fa8c16;
}

.manual-btn.rest {
  background: #52c41a;
}

.manual-btn.makeup {
  background: #f5222d;
}

.manual-btn.auto {
  background: #8c8c8c;
}

</style>
