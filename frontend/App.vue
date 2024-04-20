<script setup lang="ts">
import { onMounted, ref } from "vue";
import AppInfo from "./components/AppInfo.vue";
import SongInfo from "./components/SongInfo.vue";
import { History } from "@/db";
import { consola } from "consola";

const log = consola.withTag("App");

const histories = ref<History[]>([]);

const fetchAllHistory = async () => {
  log.info("Fetching all history");
  histories.value = await fetch("/api/history").then((res) => res.json());

  const { nextTime } = (await fetch("/api/nextTime").then((res) =>
    res.json(),
  )) as {
    nextTime: number;
  };
  log.info("Next fetch time", nextTime);
  setTimeout(fetchHistory, nextTime);
};
const fetchHistory = async () => {
  log.info("Fetching history");

  const lastVideoId = histories.value[0]?.video_id;

  let newHistories: History[];
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    newHistories = await fetch("/api/history").then((res) => res.json());
    if (newHistories[0].video_id === lastVideoId) {
      log.info("No new history, retrying");
      continue;
    }
    if (newHistories[1].spins === histories.value[1].spins) {
      log.info("Spins not updated, retrying");
      continue;
    }
    break;
  }

  log.info("New history", newHistories);

  const background = document.querySelector(".background") as HTMLElement;
  background.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 100,
  });
  // 新曲
  histories.value.unshift(newHistories[0]);
  // いいね/回る更新
  histories.value[1] = newHistories[1];
  const { nextTime } = (await fetch("/api/nextTime").then((res) =>
    res.json(),
  )) as {
    nextTime: number;
  };
  log.info("Next fetch time", nextTime);
  setTimeout(fetchHistory, nextTime);
};

onMounted(fetchAllHistory);
</script>
<template>
  <div class="container">
    <div
      class="background"
      :style="{
        backgroundImage: histories[0] && `url(${histories[0]?.thumbnail})`,
      }"
    />
    <AppInfo />
    <div class="song-info-container">
      <SongInfo
        v-for="(history, i) in histories"
        :key="history.id"
        :index="i"
        :history="history"
      />
    </div>
  </div>
</template>
<style scoped lang="scss">
.container {
  display: grid;
  width: 100%;
  @media (max-width: 767px) {
    grid-template-rows: auto 1fr;
    grid-template-columns: 1fr;
  }
  grid-template-columns: auto 1fr;
  padding: 1rem;
  gap: 1rem;
  .background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-position: center;
    background-size: 200%;
    filter: blur(10px);
    z-index: -1;
  }
}

.song-info-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
