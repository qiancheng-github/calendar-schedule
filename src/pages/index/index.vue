<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCalendarStore } from '@/stores/calendar'
import { useWorkSettingsStore, type ManualWorkDayType, type WorkMode } from '@/stores/workSettings'
import { solarToLunar, getLunarHoliday, formatLunarCalendarCell } from '@/utils/lunar'
import { getHolidayInfo, holidayData, holidayDisplayBaseName, getStatutoryHolidayPeriodsForYear, type StatutoryHolidayPeriod } from '@/static/holiday-data'
import dayjs from 'dayjs'

const calendarStore = useCalendarStore()
const workSettingsStore = useWorkSettingsStore()

const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const modeLabels: Record<WorkMode, string> = {
  'double-weekend': '双休',
  'big-small-week': '大小周',
  'single-rest': '单休'
}

/** 每个法定节日条目独立折叠（key → 是否展开） */
const expandedHolidayKeys = ref<Record<string, boolean>>({})

function toggleHolidayExpand(key: string) {
  expandedHolidayKeys.value = { ...expandedHolidayKeys.value, [key]: !expandedHolidayKeys.value[key] }
}

const deferTipText = computed(() =>
  workSettingsStore.deferSingleRestHolidayMakeup
    ? '单休补班顺延已开，会影响大小周里被假期占掉的上班周六。'
    : '单休补班顺延已关，只按法定补班和手动设置计算。'
)

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

const days = computed(() => calendarStore.calendarDays.map(day => getDayInfo(day)))

function countWorkDaysBeforeHolidayStart(holidayStart: dayjs.Dayjs, mode: WorkMode): number {
  const today = dayjs().startOf('day')
  if (!holidayStart.isAfter(today, 'day')) return 0
  let count = 0
  let cursor = today.add(1, 'day')
  while (cursor.isBefore(holidayStart, 'day')) {
    if (workSettingsStore.getDayWorkTypeByMode(cursor.toDate(), mode) !== 'rest') count++
    cursor = cursor.add(1, 'day')
  }
  return count
}

function getNextLegalHoliday() {
  const today = dayjs().startOf('day')
  const candidates = Object.entries(holidayData).flatMap(([year, yearData]) => {
    return Object.entries(yearData)
      .filter(([, info]) => info.isHoliday)
      .map(([monthDay, info]) => ({
        date: dayjs(`${year}-${monthDay}`),
        name: holidayDisplayBaseName(info.name)
      }))
  })
    .filter(item => item.date.isAfter(today, 'day'))
    .sort((a, b) => a.date.valueOf() - b.date.valueOf())

  const first = candidates[0]
  if (!first) return null

  let end = first.date
  while (true) {
    const next = end.add(1, 'day')
    const info = getHolidayInfo(next.toDate())
    if (!info?.isHoliday || holidayDisplayBaseName(info.name) !== first.name) break
    end = next
  }

  return {
    name: first.name,
    start: first.date,
    end,
    daysAway: first.date.diff(today, 'day')
  }
}

function countWorkDaysUntilHoliday(mode: WorkMode) {
  const holiday = getNextLegalHoliday()
  if (!holiday) return 0
  return countWorkDaysBeforeHolidayStart(holiday.start, mode)
}

function formatDiff(current: number, target: number, targetMode: WorkMode) {
  const diff = current - target
  if (diff > 0) return `比${modeLabels[targetMode]}多上 ${diff} 天班`
  if (diff < 0) return `比${modeLabels[targetMode]}少上 ${Math.abs(diff)} 天班`
  return `和${modeLabels[targetMode]}一样多`
}

function formatStatutoryPeriod(p: StatutoryHolidayPeriod) {
  const s = dayjs(p.start)
  const e = dayjs(p.end)
  if (s.isSame(e, 'day')) return s.format('MM月DD日')
  return `${s.format('MM月DD日')} - ${e.format('MM月DD日')}`
}

/** 当前查看月份工作日天数（按当前作息推算） */
const currentMonthWorkdayCount = computed(() => {
  const monthStart = calendarStore.currentDate.startOf('month')
  const monthEnd = calendarStore.currentDate.endOf('month')
  let n = 0
  let cur = monthStart
  while (!cur.isAfter(monthEnd, 'day')) {
    if (workSettingsStore.getDayWorkType(cur.toDate()) !== 'rest') n++
    cur = cur.add(1, 'day')
  }
  return n
})

/** 当前查看年份：工作日 / 总天数 / 上班占比 + 与其它作息的全年对比 */
const viewedYearWorkStats = computed(() => {
  const year = calendarStore.currentDate.year()
  const start = dayjs().year(year).startOf('year')
  const end = dayjs().year(year).endOf('year')
  const currentMode = workSettingsStore.mode

  const counts: Record<WorkMode, number> = {
    'double-weekend': 0,
    'big-small-week': 0,
    'single-rest': 0
  }

  let cur = start
  while (!cur.isAfter(end, 'day')) {
    const d = cur.toDate()
    for (const mode of Object.keys(counts) as WorkMode[]) {
      if (workSettingsStore.getDayWorkTypeByMode(d, mode) !== 'rest') counts[mode]++
    }
    cur = cur.add(1, 'day')
  }

  const total = end.diff(start, 'day') + 1
  const work = counts[currentMode]
  const rest = total - work
  const ratioPct = total > 0 ? Math.round((work / total) * 1000) / 10 : 0

  const comparisons = (Object.keys(counts) as WorkMode[])
    .filter(m => m !== currentMode)
    .map(m => formatDiff(work, counts[m], m))

  return { year, work, rest, total, ratioPct, comparisons }
})

type HolidayInsightStatus = 'upcoming' | 'in-progress' | 'ended'

function buildHolidayInsight(
  p: StatutoryHolidayPeriod,
  idx: number,
  today: dayjs.Dayjs,
  currentMode: WorkMode
) {
  const start = dayjs(p.start).startOf('day')
  const end = dayjs(p.end).startOf('day')
  const ended = today.isAfter(end, 'day')
  const notStarted = today.isBefore(start, 'day')
  const daysAway = start.diff(today, 'day')

  let status: HolidayInsightStatus = 'in-progress'
  if (ended) status = 'ended'
  else if (notStarted) status = 'upcoming'

  let currentCount = 0
  let comparisons: string[] = []

  if (status === 'upcoming') {
    const counts: Record<WorkMode, number> = {
      'double-weekend': countWorkDaysBeforeHolidayStart(start, 'double-weekend'),
      'big-small-week': countWorkDaysBeforeHolidayStart(start, 'big-small-week'),
      'single-rest': countWorkDaysBeforeHolidayStart(start, 'single-rest')
    }
    currentCount = counts[currentMode]
    comparisons = (Object.keys(counts) as WorkMode[])
      .filter(mode => mode !== currentMode)
      .map(mode => formatDiff(currentCount, counts[mode], mode))
  }

  return {
    key: `${p.name}-${p.start}-${idx}`,
    name: p.name,
    dateText: formatStatutoryPeriod(p),
    daysAway,
    status,
    currentCount,
    comparisons
  }
}

/** 从今天起至「下个春节」最后一天之前的法定节日（已过完的不显示；春节后的不显示） */
const holidaysUntilSpringInsights = computed(() => {
  const today = dayjs().startOf('day')
  const y0 = today.year()
  const allPeriods = [y0, y0 + 1, y0 + 2]
    .flatMap(y => getStatutoryHolidayPeriodsForYear(y))
    .sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf())

  const nextSpring = allPeriods.find(
    p => holidayDisplayBaseName(p.name) === '春节' && !today.isAfter(dayjs(p.end), 'day')
  )
  if (!nextSpring) return []

  const springEnd = dayjs(nextSpring.end).startOf('day')
  const filtered = allPeriods.filter(p => {
    const end = dayjs(p.end).startOf('day')
    const start = dayjs(p.start).startOf('day')
    if (today.isAfter(end, 'day')) return false
    if (start.isAfter(springEnd, 'day')) return false
    return true
  })

  const currentMode = workSettingsStore.mode
  return filtered.map((p, idx) => buildHolidayInsight(p, idx, today, currentMode))
})

const holidayTip = computed(() => {
  const holiday = getNextLegalHoliday()
  if (!holiday) return null

  const counts: Record<WorkMode, number> = {
    'double-weekend': countWorkDaysUntilHoliday('double-weekend'),
    'big-small-week': countWorkDaysUntilHoliday('big-small-week'),
    'single-rest': countWorkDaysUntilHoliday('single-rest')
  }
  const currentMode = workSettingsStore.mode
  const currentCount = counts[currentMode]
  const comparisons = (Object.keys(counts) as WorkMode[])
    .filter(mode => mode !== currentMode)
    .map(mode => formatDiff(currentCount, counts[mode], mode))

  return {
    holiday,
    dateText: holiday.start.isSame(holiday.end, 'day')
      ? holiday.start.format('MM月DD日')
      : `${holiday.start.format('MM月DD日')} - ${holiday.end.format('MM月DD日')}`,
    currentCount,
    comparisons
  }
})

function onDayClick(day: ReturnType<typeof getDayInfo>) {
  calendarStore.selectDate(day.date)
}

function setSelectedWorkType(type: ManualWorkDayType) {
  if (!calendarStore.selectedDate) return
  workSettingsStore.setDayOverride(calendarStore.selectedDate.format('YYYY-MM-DD'), type)
}

function clearSelectedWorkType() {
  if (!calendarStore.selectedDate) return
  workSettingsStore.clearDayOverride(calendarStore.selectedDate.format('YYYY-MM-DD'))
}

onMounted(() => {
  workSettingsStore.loadFromStorage()
})
</script>

<template>
  <view class="container">
    <view class="month-nav">
      <view class="nav-btn" @click="calendarStore.prevMonth()">‹</view>
      <view class="month-center">
        <view class="month-title">{{ calendarStore.currentDate.format('YYYY年MM月') }}</view>
        <view class="today-btn" @click="calendarStore.goToToday()">回到今日</view>
      </view>
      <view class="nav-btn" @click="calendarStore.nextMonth()">›</view>
    </view>

    <view class="week-header">
      <view
        class="week-day"
        v-for="(day, index) in weekDays"
        :key="index"
        :class="{ weekend: index === 0 || index === 6 }"
      >
        {{ day }}
      </view>
    </view>

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
        <view
          class="lunar-calendar"
          :class="{ 'is-holiday': day.lunarHoliday || day.holidayInfo?.isHoliday }"
        >
          {{ day.lunarCalendarText }}
        </view>
        <view v-if="day.showLunarFestivalRow" class="lunar-festival">
          {{ day.lunarHoliday }}
        </view>
        <view class="cell-tags-row">
          <view class="holiday-tag" v-if="day.showStatutoryHolidayTag && day.holidayInfo">
            {{ day.holidayInfo.name }}
          </view>
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
    </view>

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
        <text :class="getDayInfo(calendarStore.selectedDate).workStatus ? 'status-work' : 'status-rest'">
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

    <view class="holiday-summary">
      <view class="month-workdays-line">
        <view class="month-workdays-main">
          <text class="month-workdays-title">本月工作日</text>
          <text class="month-workdays-sub">{{ calendarStore.currentDate.format('M') }}月 · 共 {{ currentMonthWorkdayCount }} 天</text>
        </view>
      </view>
      <view class="summary-divider" />
      <template v-if="holidayTip">
        <view class="summary-title">下个法定假日</view>
        <view class="summary-main">
          <text class="summary-name">{{ holidayTip.holiday.name }}</text>
          <text class="summary-date">{{ holidayTip.dateText }}</text>
        </view>
        <view class="summary-line">
          还有 {{ holidayTip.holiday.daysAway }} 天，按当前{{ workSettingsStore.modeLabel }}还要上
          <text class="summary-count">{{ holidayTip.currentCount }}</text>
          天班
        </view>
        <view class="summary-compare">
          <view class="compare-item" v-for="item in holidayTip.comparisons" :key="item">
            {{ item }}
          </view>
        </view>
      </template>
      <view v-else class="summary-no-next">
        <text class="summary-title">下个法定假日</text>
        <text class="summary-no-next-desc">暂无之后的法定放假数据</text>
      </view>
      <view class="summary-divider" />
      <view class="year-ratio-block">
        <view class="year-ratio-title">{{ viewedYearWorkStats.year }} 年全年上班占比</view>
        <view class="year-ratio-pct-row">
          <text class="year-ratio-pct">{{ viewedYearWorkStats.ratioPct }}%</text>
          <text class="year-ratio-label">（按当前{{ workSettingsStore.modeLabel }}推算）</text>
        </view>
        <view class="year-ratio-detail">
          工作日 {{ viewedYearWorkStats.work }} 天 · 休息 {{ viewedYearWorkStats.rest }} 天 · 全年共 {{ viewedYearWorkStats.total }} 天
        </view>
        <view class="summary-compare year-ratio-compare" v-if="viewedYearWorkStats.comparisons.length">
          <view class="compare-item" v-for="c in viewedYearWorkStats.comparisons" :key="c">{{ c }}</view>
        </view>
      </view>
      <view class="summary-note">{{ deferTipText }}</view>
    </view>

    <view class="spring-holiday-list" v-if="holidaysUntilSpringInsights.length">
      <view class="spring-list-title">距下个春节前的节假日</view>
      <view
        class="holiday-accordion"
        v-for="item in holidaysUntilSpringInsights"
        :key="item.key"
      >
        <view class="accordion-head" @click="toggleHolidayExpand(item.key)">
          <view class="accordion-head-main">
            <text class="accordion-name">{{ item.name }}</text>
            <text class="accordion-dates">{{ item.dateText }}</text>
            <text
              v-if="!expandedHolidayKeys[item.key] && item.status === 'upcoming'"
              class="accordion-teaser"
            >还有 {{ item.daysAway }} 天 · 点开展开详情</text>
            <text
              v-else-if="!expandedHolidayKeys[item.key] && item.status === 'in-progress'"
              class="accordion-teaser"
            >假期进行中 · 点开展开</text>
            <text
              v-else-if="!expandedHolidayKeys[item.key] && item.status === 'ended'"
              class="accordion-teaser muted"
            >已结束</text>
          </view>
          <text class="accordion-arrow">{{ expandedHolidayKeys[item.key] ? '▲' : '▼' }}</text>
        </view>
        <view v-show="expandedHolidayKeys[item.key]" class="accordion-body">
          <template v-if="item.status === 'upcoming'">
            <view class="summary-line">
              还有 {{ item.daysAway }} 天，按当前{{ workSettingsStore.modeLabel }}还要上
              <text class="summary-count">{{ item.currentCount }}</text>
              天班
            </view>
            <view class="summary-compare" v-if="item.comparisons.length">
              <view class="compare-item" v-for="c in item.comparisons" :key="c">{{ c }}</view>
            </view>
          </template>
          <view v-else-if="item.status === 'in-progress'" class="insight-status-msg">假期进行中</view>
          <view v-else class="insight-status-msg muted">已结束</view>
        </view>
      </view>
    </view>

  </view>
</template>

<style scoped>
.container {
  min-height: 100vh;
  padding: 14px;
  padding-bottom: 86px;
  background: #f5f5f5;
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
  font-size: 20px;
  line-height: 1;
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: white;
  border-radius: 8px;
  padding: 8px 0;
  margin-bottom: 10px;
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
  /* 42 格 = 6 行；小程序对 grid-auto-rows/minmax 支持不稳定，改用固定行高 */
  grid-template-rows: repeat(6, 182px);
  row-gap: 10px;
  column-gap: 6px;
  background: white;
  border-radius: 12px;
  padding: 12px 8px 20px;
}

.day-cell {
  box-sizing: border-box;
  padding: 8px 4px 12px;
  border-radius: 8px;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  align-self: stretch;
}

.day-cell > view {
  flex-shrink: 0;
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
  line-height: 1.2;
}

.lunar-calendar {
  max-width: 100%;
  margin-top: 0;
  color: #999;
  font-size: 10px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lunar-calendar.is-holiday {
  color: #ff6b6b;
}

.lunar-festival {
  max-width: 100%;
  margin-top: 0;
  color: #ff6b6b;
  font-size: 9px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 节日名与班/休：再拉开一点，避免贴底被裁 */
.cell-tags-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  width: 100%;
  margin-top: 4px;
  padding-bottom: 2px;
  flex-shrink: 0;
}

.holiday-tag {
  margin-top: 0;
  padding: 3px 6px;
  border-radius: 4px;
  background: #ff6b6b;
  color: white;
  font-size: 10px;
  line-height: 1.25;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-sizing: border-box;
}

.work-tag {
  min-width: 26px;
  min-height: 22px;
  margin-top: 0;
  padding: 4px 8px;
  border-radius: 4px;
  background: #fa8c16;
  color: white;
  font-size: 11px;
  line-height: 1.35;
  text-align: center;
  white-space: nowrap;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.work-tag.rest {
  background: #52c41a;
}

.work-tag.legalMakeup {
  min-width: 32px;
  background: #f5222d;
}

.work-tag.singleMakeup {
  min-width: 32px;
  background: #722ed1;
}

.selected-detail {
  margin-top: 24px;
  padding: 16px;
  border-radius: 12px;
  background: white;
}

.detail-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.detail-date {
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.detail-week,
.detail-lunar {
  color: #666;
  font-size: 14px;
}

.detail-info {
  margin-bottom: 8px;
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
  padding: 2px 6px;
  border-radius: 4px;
  background: #fff7e6;
  color: #fa8c16;
  font-size: 11px;
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
  color: white;
  font-size: 12px;
  text-align: center;
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

.holiday-summary {
  margin-top: 16px;
  padding: 16px;
  border-radius: 12px;
  background: white;
}

.summary-title {
  color: #666;
  font-size: 13px;
  margin-bottom: 8px;
}

.summary-main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.summary-name {
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.summary-date {
  color: #999;
  font-size: 13px;
}

.summary-line {
  color: #333;
  font-size: 14px;
  line-height: 1.6;
}

.summary-count {
  padding: 0 3px;
  color: #fa8c16;
  font-size: 18px;
  font-weight: 700;
}

.summary-compare {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.compare-item {
  padding: 9px 10px;
  border-radius: 8px;
  background: #f5f5f5;
  color: #555;
  font-size: 13px;
}

.summary-note {
  margin-top: 10px;
  color: #888;
  font-size: 12px;
  line-height: 1.5;
}

.summary-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 14px 0;
}

.year-ratio-block {
  margin-bottom: 4px;
}

.year-ratio-title {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 6px;
}

.year-ratio-pct-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 6px;
}

.year-ratio-pct {
  font-size: 26px;
  font-weight: 700;
  color: #fa8c16;
}

.year-ratio-label {
  font-size: 12px;
  color: #999;
}

.year-ratio-detail {
  font-size: 13px;
  color: #555;
  line-height: 1.5;
}

.year-ratio-compare {
  margin-top: 10px;
}

.month-workdays-line {
  padding: 10px 0 6px;
}

.month-workdays-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.month-workdays-title {
  font-size: 15px;
  font-weight: 700;
  color: #111;
}

.month-workdays-sub {
  font-size: 13px;
  color: #555;
}

.summary-no-next {
  margin-bottom: 4px;
}

.summary-no-next-desc {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  color: #999;
}

.spring-holiday-list {
  margin-top: 16px;
  padding: 14px 16px 16px;
  border-radius: 12px;
  background: white;
}

.spring-list-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.holiday-accordion {
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 0;
}

.holiday-accordion:last-of-type {
  border-bottom: none;
}

.accordion-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 0;
}

.accordion-head:active {
  opacity: 0.88;
}

.accordion-head-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.accordion-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.accordion-dates {
  font-size: 13px;
  color: #999;
}

.accordion-teaser {
  font-size: 12px;
  color: #1890ff;
}

.accordion-teaser.muted {
  color: #999;
}

.accordion-arrow {
  flex-shrink: 0;
  font-size: 12px;
  color: #999;
  padding-top: 2px;
}

.accordion-body {
  padding: 0 0 14px;
  border-bottom: 1px solid #f5f5f5;
}

.holiday-accordion:last-of-type .accordion-body {
  border-bottom: none;
}

.insight-status-msg {
  font-size: 14px;
  color: #1890ff;
}

.insight-status-msg.muted {
  color: #999;
}
</style>
