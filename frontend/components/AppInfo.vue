<script setup>
import { ref, computed } from "vue";
import { consola } from "consola";

const log = consola.withTag("AppInfo");

const username = ref("");

const userRegex = /@[^@]+@[^@]+/;
const isValidUser = computed(() => {
  return !userRegex.test(username.value);
});

const send = async () => {
  if (isValidUser.value) {
    return;
  }
  log.info("Fetching URL", username.value);
  const url = await fetch(
    `/api/follow?username=${encodeURIComponent(username.value)}`,
  );
  if (!url.ok) {
    log.error("Failed to fetch URL", url);
    alert("フォローに失敗しました。");
    return;
  }
  const data = await url.json();
  log.info("Fetched URL", data);
  window.open(data.url, "_blank");
};

const host = window.location.origin;
</script>
<template>
  <div class="desktop-dummy" />
  <div class="app-info">
    <h1>Kiiteitte Web</h1>
    <p>
      Kiiteitte は、<a href="https://cafe.kiite.jp">Kiite Cafe</a
      >の選曲情報を表示する非公式のアプリです。<br />
      ActivityPub に対応しているアプリからフォローすることもできます。 RSS
      にも対応しています。
    </p>

    <form @submit.prevent="send">
      <div class="form">
        <input
          v-model="username"
          class="input username"
          type="text"
          placeholder="@sevenc_nanashi@voskey.icalo.net"
        />
        <button class="submit" type="submit" :disabled="isValidUser">
          フォロー
        </button>
      </div>
    </form>

    <input class="input url" type="text" readonly :value="`${host}/feed/atom.xml`" />
    <input
      class="input url"
      type="text"
      readonly
      :value="`${host}/feed/feed.json`"
    />
    <ul class="links">
      <li>開発：<a href="https://sevenc7c.com" target="_blank">名無し｡</a></li>
      <li>
        ソースコード：<a href="https://github.com/sevenc-nanashi/kiiteitte-web"
          >sevenc-nanashi/kiiteitte-web</a
        >
      </li>
      <li>
        原作者：<a href="https://twitter.com/Zect3279" target="_blank">Zect</a
        >、<a href="https://twitter.com/melodynade" target="_blank">melonade</a>
      </li>
    </ul>
  </div>
</template>
<style scoped lang="scss">
.desktop-dummy {
  display: none;
  @media (min-width: 768px) {
    display: block;
    width: 24rem;
    padding: 1rem;
  }
}
.app-info {
  width: calc(100% - 2rem);
  @media (min-width: 768px) {
    width: 24rem;
    position: fixed;
  }

  height: min-content;
  background: #0008;
  padding: 1rem;
}

h1 {
  margin: 0;
}

.form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
  position: relative;
}
.input {
  display: block;
  border-radius: 0;
  border: 0;
  background: #fff;
  padding: 0.5rem;

  &:focus {
    outline: 0;
    background: #fffff0;
  }

  &.url {
    width: 100%;
    box-sizing: border-box;

    margin-top: 0.5rem;
  }
}
.links {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.submit {
  padding: 0.5rem;
  display: block;
  cursor: pointer;
  background: #3338;
  border: 0;
  color: #fff;

  &:hover:not(:disabled) {
    background: #444;
  }
  &:disabled {
    color: #fff8;
    cursor: not-allowed;
  }
}
</style>
