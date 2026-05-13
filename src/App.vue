<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
onLaunch(() => {
  console.log('App Launched')
})
</script>

<style>
page {
  background-color: #f5f5f5;
  font-size: 14px;
}

/* 底栏：与页面内容分界更明显；「日历 / 设置」之间有竖线（H5 等使用 uni-tabbar 时生效） */
.uni-tabbar-bottom .uni-tabbar {
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
}

.uni-tabbar-border {
  background-color: #d9d9d9 !important;
}

.uni-tabbar__item + .uni-tabbar__item {
  box-shadow: inset 1px 0 0 #e8e8e8;
}

.uni-tabbar__label {
  font-weight: 600;
}
</style>