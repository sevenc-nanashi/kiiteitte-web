<script setup lang="ts">
import { History } from "@/db";
import { computed } from "vue";
import { mdiHeart, mdiOpenInNew } from "@mdi/js";

const props = defineProps<{
  history: History;
  index: number;
}>();
const date = computed(() => new Date(props.history.date));
const time = computed(() => {
  const offset = Date.now() - date.value.getTime();
  if (offset < 60 * 1000) {
    return `${Math.floor(offset / 1000)}秒前`;
  } else if (offset < 60 * 60 * 1000) {
    return `${Math.floor(offset / 60 / 1000)}分前`;
  } else if (offset < 24 * 60 * 60 * 1000) {
    return `${Math.floor(offset / 60 / 60 / 1000)}時間前`;
  } else {
    return `${date.value.getMonth() + 1}/${date.value.getDate()}`;
  }
});

const heartSvg = btoa(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#f0f"><path d="${mdiHeart}" /></svg>`,
);
</script>
<template>
  <div class="song-info">
    <div
      class="thumbnail-container"
      :style="{
        backgroundImage: `url(${props.history.thumbnail})`,
      }"
    />
    <div class="texts">
      <div class="time-and-playlist">
        <time
          class="time"
          :datetime="date.toISOString()"
          :title="date.toLocaleString()"
          :class="{ 'is-on-air': props.index === 0 }"
          >{{ props.index === 0 ? "ON AIR" : time }}</time
        >
        <div class="playlist" v-if="props.history.pickup_playlist_url">
          <a
            :href="props.history.pickup_user_url"
            target="_blank"
            class="username"
          >
            <img
              class="user-icon"
              :src="props.history.pickup_user_icon"
              :alt="props.history.pickup_user_name"
            />
            {{ props.history.pickup_user_name }}</a
          >
          さんの
          <a
            :href="props.history.pickup_playlist_url"
            target="_blank"
            class="playlist-name"
            >イチ推し</a
          >
        </div>
      </div>
      <div class="title">{{ props.history.title }}</div>
      <div class="artist">{{ props.history.author }}</div>
      <div class="stat">
        <span class="spin">回</span>
        {{ props.history.spins === -1 ? "-" : props.history.spins }}
        <img :src="`data:image/svg+xml;base64,${heartSvg}`" class="like" />
        {{ props.history.new_faves === -1 ? "-" : props.history.new_faves }}
      </div>
      <a
        :href="`https://www.nicovideo.jp/watch/${props.history.video_id}`"
        target="_blank"
        class="open-in-nico"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="24"
          height="24"
        >
          <path :d="mdiOpenInNew" />
        </svg>
      </a>
    </div>
  </div>
</template>
<style scoped lang="scss">
.song-info {
  display: flex;
  padding: 0.75rem;
  background: #000;
  gap: 1rem;
  position: relative;
}

.thumbnail-container {
  width: 4rem;
  height: 4rem;
  border-radius: 10%;
  background: #333;
  background-size: 180%;
  background-position: center;
}

.texts {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}

.artist {
  color: #aaa;
  font-size: 0.8rem;
}

.stat {
  color: #aaa;
  margin-left: auto;
  display: grid;
  grid-template-columns: 1rem 3rem 1rem 3rem;
  gap: 0.25rem;
  align-items: center;
  .spin {
    font-size: 0.8rem;
    color: #ff0;
  }
  .like {
    font-size: 1rem;
    fill: #f0f;
    width: 1rem;
  }
}

.time-and-playlist {
  display: flex;
  gap: 0.5rem;
}

.playlist {
  color: #aaa;
  font-size: 0.8rem;

  display: flex;
  align-items: center;

  .username {
    display: flex;
    align-items: center;
    .user-icon {
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
      margin-right: 0.25rem;
    }
  }
  .playlist-name {
    color: #0ff;
  }
}

.time {
  &.is-on-air {
    background: #f00;
    color: #fff;
  }
  &:not(.is-on-air) {
    background: #333;
    color: #aaa;
  }
  font-size: 0.75rem;
  padding: 0.25rem 0;
  width: 4rem;
  display: block;
  text-align: center;
}

.open-in-nico {
  position: absolute;
  right: 1rem;
  top: 1rem;
  fill: #aaa;

  &:hover {
    fill: #fff;
  }
}
</style>
