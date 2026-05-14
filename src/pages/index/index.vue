<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCalendarStore } from '@/stores/calendar'
import { useDayMemosStore } from '@/stores/dayMemos'
import { useWorkSettingsStore, type ManualWorkDayType, type WorkMode, type WorkDayType } from '@/stores/workSettings'
import { solarToLunar, getLunarHoliday, formatLunarCalendarCell } from '@/utils/lunar'
import { getHolidayInfo, holidayData, holidayDisplayBaseName, getStatutoryHolidayPeriodsForYear, type StatutoryHolidayPeriod } from '@/static/holiday-data'
import dayjs from 'dayjs'

const calendarStore = useCalendarStore()
const workSettingsStore = useWorkSettingsStore()
const dayMemosStore = useDayMemosStore()

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

/** 月历格子：仅扁平字段，避免 dayjs / 大对象进 setData 导致真机「Error: timeout」 */
interface CalendarCell {
  dateStr: string
  day: number
  lunarCalendarText: string
  lunarHoliday: string
  showLunarFestivalRow: boolean
  showStatutoryHolidayTag: boolean
  statutoryHolidayName: string
  workType: WorkDayType
  workLabel: string
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isWeekend: boolean
  isLunarOrStatHoliday: boolean
  hasMemo: boolean
}

function getCellDayInfo(date: dayjs.Dayjs): CalendarCell {
  const dateStr = date.format('YYYY-MM-DD')
  const d = date.toDate()
  const lunarHoliday = getLunarHoliday(d)
  const holidayInfo = getHolidayInfo(d)
  const workType = workSettingsStore.getDayWorkType(d)
  const workLabel = workSettingsStore.getDayWorkLabel(d)
  const isCurrentMonth = calendarStore.isCurrentMonth(date)

  const lunarCalendarText = formatLunarCalendarCell(d)
  const showStatutoryHolidayTag = !!(holidayInfo && holidayInfo.isHoliday)
  const statutoryBase = holidayInfo && holidayInfo.isHoliday ? holidayDisplayBaseName(holidayInfo.name) : ''
  const showLunarFestivalRow = !!lunarHoliday && lunarHoliday !== statutoryBase

  return {
    dateStr,
    day: date.date(),
    lunarCalendarText,
    lunarHoliday: lunarHoliday || '',
    showLunarFestivalRow,
    showStatutoryHolidayTag,
    statutoryHolidayName: showStatutoryHolidayTag && holidayInfo ? holidayInfo.name : '',
    workType,
    workLabel,
    isCurrentMonth,
    isToday: calendarStore.isToday(date),
    isSelected: calendarStore.isSelected(date),
    isWeekend: date.day() === 0 || date.day() === 6,
    isLunarOrStatHoliday: !!lunarHoliday || !!(holidayInfo && holidayInfo.isHoliday),
    hasMemo: dayMemosStore.hasMemo(dateStr)
  }
}

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
    isSelected: calendarStore.isSelected(date),
    /** 避免模板里写 day.date.day()、optional chaining，部分安卓小程序渲染异常 */
    isWeekend: date.day() === 0 || date.day() === 6,
    isLunarOrStatHoliday: !!lunarHoliday || !!(holidayInfo && holidayInfo.isHoliday)
  }
}

const days = computed(() => calendarStore.calendarDays.map(d => getCellDayInfo(d)))

/** 下一连休段日期展示：单日 MM月DD日；同日历年多日 MM月DD日 - MM月DD日；跨年带年份 */
function formatRestDateRange(start: dayjs.Dayjs, end: dayjs.Dayjs): string {
  const s = start.startOf('day')
  const e = end.startOf('day')
  if (s.isSame(e, 'day')) return s.format('MM月DD日')
  if (s.year() === e.year()) {
    return `${s.format('MM月DD日')} - ${e.format('MM月DD日')}`
  }
  return `${s.format('YYYY年MM月DD日')} - ${e.format('YYYY年MM月DD日')}`
}

/** 从「今天」起算到目标日（不含目标日当天）之间要上的班数；今天若是休则不计入 */
function countWorkDaysBeforeDate(targetDay: dayjs.Dayjs, mode: WorkMode): number {
  const today = dayjs().startOf('day')
  const start = targetDay.startOf('day')
  if (!start.isAfter(today, 'day')) return 0
  let count = 0
  let cursor = today
  while (cursor.isBefore(start, 'day')) {
    if (workSettingsStore.getDayWorkTypeByMode(cursor.toDate(), mode) !== 'rest') count++
    cursor = cursor.add(1, 'day')
  }
  return count
}

function countWorkDaysBeforeHolidayStart(holidayStart: dayjs.Dayjs, mode: WorkMode): number {
  return countWorkDaysBeforeDate(holidayStart, mode)
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

/** 从今日到当月末还剩几个工作日；未到当月为 null（不跟「共 N 天」）；已过月为 0 */
const monthRemainWorkdaysSuffix = computed(() => {
  const monthStart = calendarStore.currentDate.startOf('month')
  const monthEnd = calendarStore.currentDate.endOf('month')
  const today = dayjs().startOf('day')
  if (today.isBefore(monthStart, 'day')) {
    return null
  }
  if (monthEnd.isBefore(today, 'day')) {
    return 0
  }
  let n = 0
  let cur = today
  while (!cur.isAfter(monthEnd, 'day')) {
    if (workSettingsStore.getDayWorkType(cur.toDate()) !== 'rest') n++
    cur = cur.add(1, 'day')
  }
  return n
})

/** 下一个「休」：从明天起找；对比逻辑与「下个法定假日」一致 */
const nextRestInsight = computed(() => {
  const today = dayjs().startOf('day')
  let cur = today.add(1, 'day')
  for (let i = 0; i < 400; i++) {
    if (workSettingsStore.getDayWorkType(cur.toDate()) === 'rest') {
      const restStart = cur.startOf('day')
      let restEnd = restStart
      for (let j = 0; j < 400; j++) {
        const next = restEnd.add(1, 'day')
        if (workSettingsStore.getDayWorkType(next.toDate()) !== 'rest') break
        restEnd = next
      }
      const counts: Record<WorkMode, number> = {
        'double-weekend': countWorkDaysBeforeDate(restStart, 'double-weekend'),
        'big-small-week': countWorkDaysBeforeDate(restStart, 'big-small-week'),
        'single-rest': countWorkDaysBeforeDate(restStart, 'single-rest')
      }
      const currentMode = workSettingsStore.mode
      const currentCount = counts[currentMode]
      const comparisons = (Object.keys(counts) as WorkMode[])
        .filter(m => m !== currentMode)
        .map(m => formatDiff(currentCount, counts[m], m))
      const wd = ['日', '一', '二', '三', '四', '五', '六'][restStart.day()]
      return {
        weekdayLabel: `周${wd}`,
        dateText: formatRestDateRange(restStart, restEnd),
        currentCount,
        comparisons
      }
    }
    cur = cur.add(1, 'day')
  }
  return null
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

  const teaserLine =
    status === 'upcoming' ? `加上今天还有 ${currentCount} 天班 · 点开展开详情` : ''

  return {
    key: `${p.name}-${p.start}-${idx}`,
    name: p.name,
    dateText: formatStatutoryPeriod(p),
    status,
    currentCount,
    comparisons,
    teaserLine,
    workdaysPrefix: status === 'upcoming' ? '加上今天还有 ' : '',
    workdaysCountStr: status === 'upcoming' ? String(currentCount) : '',
    workdaysSuffix: status === 'upcoming' ? ' 天班' : ''
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

/** 微信小程序真机：避免在模板里对 Pinia 内的 dayjs 链式调用，易导致数字/日期整段不渲染 */
const navMonthTitle = computed(() => calendarStore.currentDate.format('YYYY年MM月'))

const monthWorkdaysSummaryLine = computed(
  () => `${calendarStore.currentDate.format('M')}月 · 共 ${currentMonthWorkdayCount.value} 天`
)

const monthRemainWorkdaysLine = computed(() => {
  const s = monthRemainWorkdaysSuffix.value
  if (s === null) return ''
  return `· 还剩${s}天`
})

const selectedDayPanel = computed(() => {
  const d = calendarStore.selectedDate
  if (!d) return null
  return getDayInfo(d)
})

const memoDraft = ref('')

watch(
  () => selectedDayPanel.value?.dateStr,
  (ds: string | undefined) => {
    memoDraft.value = ds ? dayMemosStore.getMemo(ds) : ''
  },
  { immediate: true }
)

function saveSelectedMemo() {
  const ds = selectedDayPanel.value?.dateStr
  if (!ds) return
  dayMemosStore.setMemo(ds, memoDraft.value)
  uni.showToast({ title: '已保存', icon: 'success', duration: 1200 })
}

function clearSelectedMemo() {
  const ds = selectedDayPanel.value?.dateStr
  if (!ds) return
  memoDraft.value = ''
  dayMemosStore.setMemo(ds, '')
  uni.showToast({ title: '已清空', icon: 'none', duration: 1200 })
}

const selectedHeadDateText = computed(() =>
  calendarStore.selectedDate ? calendarStore.selectedDate.format('YYYY年MM月DD日') : ''
)

const selectedHeadWeekChar = computed(() =>
  calendarStore.selectedDate ? weekDays[calendarStore.selectedDate.day()] : ''
)

const nextRestCountStr = computed(() =>
  nextRestInsight.value ? String(nextRestInsight.value.currentCount) : ''
)

const yearRatioTitleText = computed(() => `${viewedYearWorkStats.value.year} 年全年上班占比`)
const yearRatioPctText = computed(() => `${viewedYearWorkStats.value.ratioPct}%`)
const yearRatioDetailText = computed(
  () =>
    `工作日 ${viewedYearWorkStats.value.work} 天 · 休息 ${viewedYearWorkStats.value.rest} 天 · 全年共 ${viewedYearWorkStats.value.total} 天`
)
const yearRatioModeHint = computed(() => `（按当前${workSettingsStore.modeLabel}推算）`)

const holidayTipPanel = computed(() => {
  const t = holidayTip.value
  if (!t) return null
  return {
    name: t.holiday.name,
    dateText: t.dateText,
    countStr: String(t.currentCount),
    workLine: `加上今天还有 ${t.currentCount} 天班`,
    comparisons: t.comparisons
  }
})

const yearRatioComparisons = computed(() => viewedYearWorkStats.value.comparisons)

const nextRestComparisons = computed(() => nextRestInsight.value?.comparisons ?? [])

function onDayClick(day: CalendarCell) {
  calendarStore.selectDate(dayjs(day.dateStr))
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
  dayMemosStore.loadFromStorage()
})
</script>

<template>
  <view class="container">
    <view class="month-nav">
      <view class="nav-btn" @click="calendarStore.prevMonth()"><text>‹</text></view>
      <view class="month-center">
        <text class="month-title">{{ navMonthTitle }}</text>
        <view class="today-btn" @click="calendarStore.goToToday()"><text>回到今日</text></view>
      </view>
      <view class="nav-btn" @click="calendarStore.nextMonth()"><text>›</text></view>
    </view>

    <view class="week-header">
      <view
        class="week-day"
        v-for="(wd, index) in weekDays"
        :key="index"
        :class="{ weekend: index === 0 || index === 6 }"
      >
        <text>{{ wd }}</text>
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
          weekend: day.isWeekend
        }"
        @click="onDayClick(day)"
      >
        <text class="day-number">{{ day.day }}</text>
        <text
          class="lunar-calendar"
          :class="{ 'is-holiday': day.isLunarOrStatHoliday }"
        >
          {{ day.lunarCalendarText }}
        </text>
        <text v-if="day.showLunarFestivalRow" class="lunar-festival">
          {{ day.lunarHoliday }}
        </text>
        <view class="cell-tags-row">
          <view class="holiday-tag" v-if="day.showStatutoryHolidayTag">
            <text>{{ day.statutoryHolidayName }}</text>
          </view>
          <text
            class="work-tag"
            :class="{
              rest: day.workType === 'rest',
              legalMakeup: day.workType === 'legal-makeup',
              singleMakeup: day.workType === 'single-rest-makeup'
            }"
          >
            {{ day.workLabel }}
          </text>
        </view>
        <view v-if="day.hasMemo" class="memo-dot-wrap">
          <view class="memo-dot" />
        </view>
      </view>
    </view>

    <view class="selected-detail" v-if="selectedDayPanel">
      <view class="detail-header">
        <text class="detail-date">{{ selectedHeadDateText }}</text>
        <text class="detail-week">{{ selectedHeadWeekChar }}</text>
      </view>
      <view class="detail-info">
        <text class="detail-lunar">
          {{ selectedDayPanel.lunar.lunarYearName }}年
          {{ selectedDayPanel.lunar.monthName }}月
          {{ selectedDayPanel.lunar.dayName }}
        </text>
      </view>
      <view class="detail-status">
        <text :class="selectedDayPanel.workStatus ? 'status-work' : 'status-rest'">
          {{ selectedDayPanel.workLabel }}
        </text>
        <text class="manual-tip" v-if="selectedDayPanel.workOverride">手动</text>
      </view>
      <view class="manual-actions">
        <view class="manual-btn work" @click="setSelectedWorkType('work')">设为班</view>
        <view class="manual-btn rest" @click="setSelectedWorkType('rest')">设为休</view>
        <view class="manual-btn makeup" @click="setSelectedWorkType('legal-makeup')">设为法补</view>
        <view class="manual-btn auto" @click="clearSelectedWorkType">恢复自动</view>
      </view>
      <view class="memo-section">
        <text class="memo-title">备忘录</text>
        <textarea
          class="memo-input"
          v-model="memoDraft"
          maxlength="500"
          placeholder="这一天写点什么…"
          :auto-height="true"
        />
        <view class="memo-actions">
          <view class="memo-btn memo-btn-save" @click="saveSelectedMemo"><text>保存</text></view>
          <view class="memo-btn memo-btn-clear" @click="clearSelectedMemo"><text>清空</text></view>
        </view>
      </view>
    </view>

    <view class="holiday-summary">
      <view v-if="nextRestInsight" class="summary-card summary-card-accent">
        <view class="next-rest-head">
          <view class="next-rest-badge"><text>休</text></view>
          <text class="next-rest-heading">下一个休息日</text>
        </view>
        <view class="summary-main next-rest-main">
          <text class="summary-name next-rest-weekday">{{ nextRestInsight.weekdayLabel }}</text>
          <text class="summary-date next-rest-date">{{ nextRestInsight.dateText }}</text>
        </view>
        <view class="summary-line next-rest-line">
          <text>加上今天还有</text>
          <text class="summary-count next-rest-count">{{ nextRestCountStr }}</text>
          <text>天班</text>
        </view>
        <view class="summary-compare" v-if="nextRestComparisons.length">
          <view class="compare-item compare-item-on-accent" v-for="item in nextRestComparisons" :key="item">
            <text>{{ item }}</text>
          </view>
        </view>
      </view>

      <view class="summary-card">
        <view class="month-workdays-line">
          <view class="month-workdays-main">
            <text class="month-workdays-title">本月工作日</text>
            <view class="month-workdays-row">
              <text class="month-workdays-sub">{{ monthWorkdaysSummaryLine }}</text>
              <text v-if="monthRemainWorkdaysSuffix !== null" class="month-workdays-remain">
                {{ monthRemainWorkdaysLine }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="holidayTipPanel" class="summary-card">
        <text class="summary-title">下个法定假日</text>
        <view class="summary-main">
          <text class="summary-name">{{ holidayTipPanel.name }}</text>
          <text class="summary-date">{{ holidayTipPanel.dateText }}</text>
        </view>
        <view class="summary-line">
          <text>{{ holidayTipPanel.workLine }}</text>
        </view>
        <view class="summary-compare">
          <view class="compare-item" v-for="item in holidayTipPanel.comparisons" :key="item">
            <text>{{ item }}</text>
          </view>
        </view>
      </view>
      <view v-else class="summary-card summary-card-plain">
        <text class="summary-title">下个法定假日</text>
        <text class="summary-no-next-desc">暂无之后的法定放假数据</text>
      </view>

      <view class="summary-card">
        <view class="year-ratio-block">
          <text class="year-ratio-title">{{ yearRatioTitleText }}</text>
          <view class="year-ratio-pct-row">
            <text class="year-ratio-pct">{{ yearRatioPctText }}</text>
            <text class="year-ratio-label">{{ yearRatioModeHint }}</text>
          </view>
          <text class="year-ratio-detail">{{ yearRatioDetailText }}</text>
          <view class="summary-compare year-ratio-compare" v-if="yearRatioComparisons.length">
            <view class="compare-item" v-for="c in yearRatioComparisons" :key="c"><text>{{ c }}</text></view>
          </view>
        </view>
      </view>

      <text class="summary-note">{{ deferTipText }}</text>
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
            >{{ item.teaserLine }}</text>
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
              <text>{{ item.workdaysPrefix }}</text>
              <text class="summary-count">{{ item.workdaysCountStr }}</text>
              <text>{{ item.workdaysSuffix }}</text>
            </view>
            <view class="summary-compare" v-if="item.comparisons.length">
              <view class="compare-item" v-for="c in item.comparisons" :key="c"><text>{{ c }}</text></view>
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
}

.month-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.month-title {
  display: block;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.today-btn {
  margin-top: 4px;
  font-size: 13px;
  color: #1890ff;
  padding: 4px 10px;
}

.today-btn text {
  color: #1890ff;
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

.nav-btn text {
  color: #666;
  line-height: 1;
}

.week-header {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: space-between;
  background: white;
  border-radius: 8px;
  padding: 8px 4px;
  margin-bottom: 6px;
}

.week-day {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: #666;
  padding: 6px 0;
}

.week-day text {
  font-size: 12px;
  color: inherit;
}

.week-day.weekend {
  color: #ff6b6b;
}

.calendar-grid {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  justify-content: flex-start;
  align-items: stretch;
  box-sizing: border-box;
  background: white;
  border-radius: 12px;
  padding: 8px 5px 10px;
}

.day-cell {
  box-sizing: border-box;
  flex: 0 0 calc((100% - 18px) / 7);
  width: calc((100% - 18px) / 7);
  max-width: calc((100% - 18px) / 7);
  padding: 4px 2px 6px;
  border-radius: 8px;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  margin-right: 3px;
  margin-bottom: 4px;
}

.day-cell:nth-child(7n) {
  margin-right: 0;
}

.day-cell > text {
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
  display: block;
  font-size: 15px;
  color: #333;
  font-weight: 500;
  line-height: 1.2;
  text-align: center;
}

.lunar-calendar {
  display: block;
  max-width: 100%;
  margin-top: 2px;
  color: #999;
  font-size: 10px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.lunar-calendar.is-holiday {
  color: #ff6b6b;
}

.lunar-festival {
  display: block;
  max-width: 100%;
  margin-top: 2px;
  color: #ff6b6b;
  font-size: 9px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

/* 节日名与班/休 */
.cell-tags-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  margin-top: 1px;
  padding-bottom: 0;
  flex-shrink: 0;
}

.holiday-tag + .work-tag {
  margin-top: 4px;
}

.holiday-tag {
  margin-top: 0;
  padding: 2px 4px;
  border-radius: 4px;
  background: #ff6b6b;
  color: white;
  font-size: 10px;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-sizing: border-box;
}

.holiday-tag text {
  color: #fff;
  font-size: 10px;
}

.work-tag {
  display: inline-block;
  min-width: 22px;
  min-height: 18px;
  margin-top: 0;
  padding: 2px 5px;
  border-radius: 4px;
  background: #fa8c16;
  color: white;
  font-size: 10px;
  line-height: 1.3;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  box-sizing: border-box;
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

.memo-dot-wrap {
  margin-top: 2px;
  display: flex;
  justify-content: center;
  width: 100%;
  flex-shrink: 0;
}

.memo-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #1890ff;
}

.day-cell.is-selected .memo-dot {
  background: rgba(255, 255, 255, 0.95);
}

.selected-detail {
  margin-top: 14px;
  padding: 16px;
  border-radius: 12px;
  background: white;
}

.detail-header {
  display: flex;
  align-items: baseline;
  margin-bottom: 8px;
}

.detail-header .detail-date {
  margin-right: 8px;
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
}

.detail-status .status-work,
.detail-status .status-rest {
  margin-right: 8px;
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
  grid-row-gap: 8px;
  grid-column-gap: 8px;
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

.memo-section {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #f0f0f0;
}

.memo-title {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.memo-input {
  width: 100%;
  min-height: 72px;
  padding: 10px 12px;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  background: #fafafa;
  font-size: 14px;
  line-height: 1.45;
  color: #333;
}

.memo-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.memo-btn {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  text-align: center;
}

.memo-btn text {
  font-size: 14px;
  font-weight: 500;
}

.memo-btn-save {
  background: #1890ff;
}

.memo-btn-save text {
  color: #fff;
}

.memo-btn-clear {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
}

.memo-btn-clear text {
  color: #595959;
}

.holiday-summary {
  margin-top: 16px;
  padding: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
}

.holiday-summary > .summary-card + .summary-card {
  margin-top: 12px;
}

.summary-card {
  padding: 14px 16px 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #ebebeb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.summary-card-accent {
  padding: 16px 14px;
  border: 1px solid #95de64;
  border-left-width: 5px;
  border-left-color: #389e0d;
  border-right-width: 5px;
  border-right-color: #389e0d;
  background: linear-gradient(145deg, #e8ffea 0%, #f6ffed 42%, #ffffff 100%);
  box-shadow: 0 4px 18px rgba(56, 158, 13, 0.18), 0 1px 2px rgba(0, 0, 0, 0.04);
}

.next-rest-head {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.next-rest-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: linear-gradient(160deg, #73d13d 0%, #389e0d 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  flex-shrink: 0;
  box-shadow: 0 3px 10px rgba(56, 158, 13, 0.4);
}

.next-rest-badge text {
  color: #fff;
  font-size: 14px;
  font-weight: 800;
}

.next-rest-heading {
  margin-left: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #237804;
  letter-spacing: 0.02em;
}

.summary-card-plain .summary-no-next-desc {
  margin-top: 4px;
}

.next-rest-main {
  margin-bottom: 12px;
}

.next-rest-weekday {
  font-size: 24px;
  font-weight: 700;
  color: #141414;
}

.next-rest-date {
  font-size: 14px;
  color: #237804;
  font-weight: 700;
}

.next-rest-line {
  font-size: 15px;
  font-weight: 500;
}

.next-rest-count {
  font-size: 22px;
}

.compare-item-on-accent {
  background: #fff;
  border: 1px solid #c8e6c9;
  box-shadow: 0 1px 2px rgba(56, 158, 13, 0.06);
}

.summary-title {
  display: block;
  color: #666;
  font-size: 13px;
  margin-bottom: 8px;
}

.summary-main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.summary-name {
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.summary-date {
  margin-left: 12px;
  color: #999;
  font-size: 13px;
}

.summary-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  color: #333;
  font-size: 14px;
  line-height: 1.6;
}

.summary-line text + .summary-count {
  margin-left: 2px;
  margin-right: 2px;
}

.summary-count {
  padding: 0 3px;
  color: #fa8c16;
  font-size: 18px;
  font-weight: 700;
}

.summary-compare {
  display: flex;
  flex-direction: column;
  margin-top: 12px;
}

.summary-compare .compare-item + .compare-item {
  margin-top: 8px;
}

.compare-item {
  padding: 9px 10px;
  border-radius: 8px;
  background: #f5f5f5;
  color: #555;
  font-size: 13px;
}

.compare-item text {
  display: block;
  font-size: 13px;
  color: #555;
}

.summary-note {
  margin-top: 12px;
  padding: 0 2px;
  color: #888;
  font-size: 12px;
  line-height: 1.5;
}

.year-ratio-block {
  margin-bottom: 0;
}

.year-ratio-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 6px;
}

.year-ratio-pct-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  margin-bottom: 6px;
}

.year-ratio-pct {
  font-size: 26px;
  font-weight: 700;
  color: #fa8c16;
}

.year-ratio-label {
  margin-left: 6px;
  font-size: 12px;
  color: #999;
}

.year-ratio-detail {
  display: block;
  font-size: 13px;
  color: #555;
  line-height: 1.5;
}

.year-ratio-compare {
  margin-top: 10px;
}

.month-workdays-line {
  padding: 0;
}

.month-workdays-main {
  display: flex;
  flex-direction: column;
}

.month-workdays-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #111;
  margin-bottom: 4px;
}

.month-workdays-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: baseline;
}

.month-workdays-sub {
  font-size: 13px;
  color: #555;
}

.month-workdays-remain {
  color: #fa8c16;
  font-weight: 600;
  font-size: 13px;
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
}

.accordion-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.accordion-dates {
  margin-top: 4px;
  font-size: 13px;
  color: #999;
}

.accordion-teaser {
  margin-top: 4px;
  font-size: 12px;
  color: #1890ff;
}

.accordion-teaser.muted {
  color: #999;
}

.accordion-arrow {
  margin-left: 10px;
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
