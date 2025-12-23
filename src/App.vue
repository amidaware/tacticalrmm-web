<template>
  <router-view />
</template>

<script>
export default {
  name: "App",
};
</script>

<style lang="sass">
body
  overflow-y: hidden
  background-color: var(--q-light-page)

a
  color: #1976D2

.tbl-sticky
  thead tr th
    position: sticky
    z-index: 1
  thead tr:first-child th
    top: 0

.tabs-tbl-sticky

  thead tr th
    position: sticky
    z-index: 1
  thead tr:first-child th
    top: 0

.remote-bg-tbl-sticky
  max-height: 70vh

  thead tr th
    position: sticky
    z-index: 1
  thead tr:first-child th
    top: 0

.audit-mgr-tbl-sticky
  max-height: 75vh

  thead tr th
    position: sticky
    z-index: 1
  thead tr:first-child th
    top: 0

.settings-tbl-sticky
  max-height: 60vh

  thead tr th
    position: sticky
    z-index: 1
  thead tr:first-child th
    top: 0

.agents-tbl-sticky
  thead tr th
    position: sticky
    z-index: 1
  thead tr:first-child th
    top: 0

.table-bgcolor
  .q-table__top,
  .q-table__bottom,
  thead tr:first-child th
    background-color: color-mix(in srgb, var(--q-light-card) 100%, black 20%) !important

.table-bgcolor-dark
  .q-table__top,
  .q-table__bottom,
  thead tr:first-child th
    background-color: color-mix(in srgb, var(--q-dark) 100%, black 20%)

.bg-dark
  background-color: var(--q-dark-page)

.bg-light
  background-color: var(--q-light-page, #ffffff)

.highlight
  background-color: color-mix(in srgb, var(--q-light-card) 100%, white 40%)

.highlight-dark
  background-color: color-mix(in srgb, var(--q-dark) 100%, white 40%)

.action-completed
  background-color: $positive

.agent-offline
  background: gray !important

.agent-overdue
  background: red !important

.min-width
  min-width: 0px !important

.body--light
  .q-card
    background-color: var(--q-light-card, #fff) !important

  .q-table__bottom
    background-color: var(--q-light-card, #fff) !important

  .q-table__container
    background-color: var(--q-light-card, #fff) !important

  .q-tab-panels
    background-color: var(--q-light-card, #fff) !important

  .q-chip
    background-color: var(--q-light-card, #fff)

  .q-menu
    background-color: var(--q-light-card, #fff) !important

.main-toolbar
  .q-chip
    background-color: color-mix(in srgb, var(--q-bg-toolbar) 100%, white 20%) !important
    color: var(--q-text-toolbar) !important
</style>
