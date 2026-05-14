<script setup lang="ts">
import { computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { useDayMemosStore } from '@/stores/dayMemos'
import { useCalendarStore } from '@/stores/calendar'

const dayMemosStore = useDayMemosStore()
const calendarStore = useCalendarStore()

const weekChars = ['日', '一', '二', '三', '四', '五', '六']

interface MemoGroup {
  monthKey: string
  monthLabel: string
  items: { dateStr: string; text: string }[]
}

const memoGroups = computed(() => {
  const list = dayMemosStore.memoListSorted
  const groups: MemoGroup[] = []
  for (const row of list) {
    const mk = row.dateStr.slice(0, 7)
    const prev = groups[groups.length - 1]
    if (!prev || prev.monthKey !== mk) {
      groups.push({
        monthKey: mk,
        monthLabel: dayjs(row.dateStr).format('YYYY年M月'),
        items: [row]
      })
    } else {
      prev.items.push(row)
    }
  }
  return groups
})

const totalCount = computed(() => dayMemosStore.memoListSorted.length)

function formatRowDate(dateStr: string) {
  const d = dayjs(dateStr)
  return `${d.format('M月D日')} 周${weekChars[d.day()]}`
}

function openOnCalendar(dateStr: string) {
  calendarStore.showDayInCalendar(dayjs(dateStr))
  uni.switchTab({ url: '/pages/index/index' })
}

function copyAllMemos() {
  const list = dayMemosStore.memoListSorted
  if (!list.length) {
    uni.showToast({ title: '暂无备忘', icon: 'none' })
    return
  }
  const lines: string[] = []
  for (const row of list) {
    const d = dayjs(row.dateStr)
    lines.push(
      `${d.format('YYYY-MM-DD')} 周${weekChars[d.day()]}`,
      row.text,
      ''
    )
  }
  const text = lines.join('\n').trimEnd()
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
  })
}

onMounted(() => {
  dayMemosStore.loadFromStorage()
})
</script>

<template>
  <view class="page">
    <view class="hint-bar">
      <text class="hint-text">点某条回到「日历」该日编辑；日常可在日历页「本月备忘录」查看当月。</text>
    </view>

    <view class="toolbar">
      <view class="tool-btn" :class="{ disabled: totalCount === 0 }" @click="copyAllMemos">
        <text>复制全部（纯文本）</text>
      </view>
    </view>

    <scroll-view v-if="totalCount > 0" scroll-y class="scroll" enable-flex>
      <view v-for="g in memoGroups" :key="g.monthKey" class="group">
        <text class="group-title">{{ g.monthLabel }}</text>
        <view class="group-card">
          <view
            v-for="row in g.items"
            :key="row.dateStr"
            class="row"
            @click="openOnCalendar(row.dateStr)"
          >
            <view class="row-bar" />
            <view class="row-body">
              <text class="row-date">{{ formatRowDate(row.dateStr) }}</text>
              <text class="row-preview">{{ row.text }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view v-else class="empty">
      <text class="empty-text">还没有任何备忘录</text>
      <text class="empty-sub">在「日历」里选中日期即可添加</text>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 12px 14px 24px;
  background: #f5f5f5;
  box-sizing: border-box;
}

.hint-bar {
  padding: 10px 12px;
  margin-bottom: 10px;
  background: #e6f7ff;
  border-radius: 8px;
  border: 1px solid #91d5ff;
}

.hint-text {
  font-size: 12px;
  color: #0958d9;
  line-height: 1.5;
}

.toolbar {
  margin-bottom: 12px;
}

.tool-btn {
  padding: 12px 16px;
  border-radius: 10px;
  background: #1890ff;
  text-align: center;
}

.tool-btn text {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.tool-btn.disabled {
  background: #d9d9d9;
  pointer-events: none;
}

.tool-btn.disabled text {
  color: #fff;
}

.scroll {
  max-height: calc(100vh - 200px);
}

.group {
  margin-bottom: 14px;
}

.group-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  padding-left: 2px;
}

.group-card {
  background: #fff;
  border-radius: 12px;
  padding: 4px 12px;
  border: 1px solid #ebebeb;
}

.row {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.row:last-child {
  border-bottom: none;
}

.row-bar {
  width: 4px;
  border-radius: 2px;
  background: #1890ff;
  flex-shrink: 0;
  margin-right: 10px;
}

.row-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.row-date {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.row-preview {
  font-size: 13px;
  color: #595959;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  word-break: break-all;
}

.empty {
  padding: 48px 20px;
  text-align: center;
}

.empty-text {
  display: block;
  font-size: 15px;
  color: #8c8c8c;
  margin-bottom: 8px;
}

.empty-sub {
  display: block;
  font-size: 13px;
  color: #bfbfbf;
}
</style>
