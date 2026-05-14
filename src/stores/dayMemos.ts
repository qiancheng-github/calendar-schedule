import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const STORAGE_KEY = 'dayMemos'

export const useDayMemosStore = defineStore('dayMemos', () => {
  const memos = ref<Record<string, string>>({})

  function loadFromStorage() {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw && typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as Record<string, string>
        if (parsed && typeof parsed === 'object') {
          memos.value = parsed
        }
      } catch {
        try {
          uni.removeStorageSync(STORAGE_KEY)
        } catch {
          /* ignore */
        }
      }
    }
  }

  function saveToStorage() {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(memos.value))
  }

  function getMemo(dateStr: string): string {
    return memos.value[dateStr] || ''
  }

  function hasMemo(dateStr: string): boolean {
    const t = memos.value[dateStr]
    return typeof t === 'string' && t.trim().length > 0
  }

  function setMemo(dateStr: string, text: string) {
    const next = text.trim()
    if (!next) {
      const copy = { ...memos.value }
      delete copy[dateStr]
      memos.value = copy
    } else {
      memos.value = { ...memos.value, [dateStr]: next }
    }
    saveToStorage()
  }

  /** 按日期降序，仅非空备忘，供列表展示 */
  const memoListSorted = computed(() => {
    const out: { dateStr: string; text: string }[] = []
    for (const dateStr of Object.keys(memos.value)) {
      const t = memos.value[dateStr]
      if (typeof t === 'string' && t.trim()) out.push({ dateStr, text: t.trim() })
    }
    out.sort((a, b) => b.dateStr.localeCompare(a.dateStr))
    return out
  })

  return {
    memos,
    memoListSorted,
    loadFromStorage,
    getMemo,
    hasMemo,
    setMemo
  }
})
