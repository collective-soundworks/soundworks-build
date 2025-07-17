<script setup>
  defineProps(['client'])
</script>

<template>
  <div class="simple-layout">
    <p>Hello {{ client.config.app.name }} using Vue.js!</p>
  </div>
</template>
