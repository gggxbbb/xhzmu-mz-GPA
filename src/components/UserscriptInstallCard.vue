<template>
  <div class="neo-card">
    <h2 class="install-title">教务成绩助手</h2>
    <p class="install-description">在教务系统成绩查询页自动统计 GPA、学位 GPA 和学分。</p>
    <a
      class="neo-btn neo-btn--primary install-link"
      :href="installUrl"
      target="_blank"
      rel="noopener noreferrer"
    >安装油猴脚本</a>
    <p class="install-hint">请先安装并启用 Tampermonkey 等脚本管理器，点击后在安装页确认。若仅显示源码，可将脚本链接添加到脚本管理器中安装。</p>
  </div>
</template>

<script setup>
const installUrl = `${import.meta.env.BASE_URL}userscripts/jwpt-gpa.user.js`
</script>

<style scoped>
.install-title {
  font-weight: var(--weight-heading);
  font-size: var(--text-lg);
  margin: 0 0 0.8rem;
}

.install-description {
  margin: 0 0 0.8rem;
}

.install-link {
  display: inline-block;
  text-decoration: none;
  text-align: center;
}

.install-hint {
  color: var(--ink-soft);
  font-size: var(--text-xs);
  margin: 0.8rem 0 0;
}
</style>
