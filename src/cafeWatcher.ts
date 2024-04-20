import { consola } from "consola";
import { Follower, History, db } from "./db.js";
import { signRequest } from "./signature.js";
import { historyToActivity, noteToCreateActivity } from "./activity.js";

const log = consola.withTag("cafeWatcher");

type Song = {
  video_id: string;
  title: string;
  artist_name: string;
  start_time: string;
  msec_duration: number;
  reasons: {
    type: "priority_playlist";
    user_id: number;
    list_title: string;
    list_id: number;
  }[];
  thumbnail: string;
  new_fav_user_ids: number[] | null;
};

type KiiteUser = {
  user_id: number;
  user_name: string;
  nickname: string;
  avatar_url: string;
};

const waitUntil = async (timestamp: number) => {
  const currentTimestamp = new Date().getTime();
  const waitDuration = timestamp - currentTimestamp;
  log.info(`Waiting for ${waitDuration}ms`);
  await new Promise((resolve) => setTimeout(resolve, waitDuration));
};

export const cafeWatcher = async () => {
  log.info("Cafe watcher started");

  const localTime = new Date();
  const time = await fetch("https://cafe.kiite.jp/api/cafe/time").then((r) =>
    r.json(),
  );
  const serverTime = new Date(time * 1000);
  const timeDifference = localTime.getTime() - serverTime.getTime();
  log.info(`Time difference: ${timeDifference}ms`);

  while (true) {
    try {
      const temporaryData = (await fetch(
        "https://cafe.kiite.jp/api/cafe/next_song",
      ).then((r) => r.json())) as Song;
      if (
        new Date(temporaryData.start_time).getTime() +
          timeDifference -
          new Date().getTime() <
        10000
      ) {
        log.info("Song is too close, waiting for next song");
        await waitUntil(
          new Date(temporaryData.start_time).getTime() +
            temporaryData.msec_duration,
        );
        continue;
      }
      await waitUntil(
        new Date(temporaryData.start_time).getTime() + timeDifference - 10000,
      );

      const data = (await fetch(
        "https://cafe.kiite.jp/api/cafe/next_song",
      ).then((r) => r.json())) as Song;
      log.info(`Next song: ${data.title} (${data.video_id})`);
      const inboxes = new Set<string>();
      for (const follower of await db
        .query<Follower>("SELECT * FROM followers")
        .then((r) => r.rows)) {
        if (follower.shared_inbox) {
          inboxes.add(follower.shared_inbox);
        } else {
          inboxes.add(follower.inbox);
        }
      }

      const priorityReason = data.reasons.find(
        (r) => r.type === "priority_playlist",
      );
      let user: KiiteUser | undefined;
      if (priorityReason) {
        log.info(`Priority playlist found`);
        const users = (await fetch(
          `https://cafeapi.kiite.jp/api/kiite_users?user_ids=${priorityReason.user_id}&ignore_order=1`,
        ).then((r) => r.json())) as KiiteUser[];
        user = users[0];
      } else {
        log.info(`No priority playlist found`);
      }
      await waitUntil(new Date(data.start_time).getTime() + timeDifference);

      const history = await db
        .query<History>(
          "INSERT INTO history (" +
            "video_id, name, author, date, thumbnail, pickup_user_url, pickup_user_name, pickup_user_icon, pickup_playlist_url, new_faves, spins" +
            ") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",

          [
            data.video_id,
            data.title,
            data.artist_name,
            new Date(data.start_time),
            data.thumbnail,
            user ? `https://kiite.jp/user/${user.user_name}` : "",
            user?.nickname ?? "",
            user?.avatar_url ?? "",
            priorityReason
              ? `https://kiite.jp/playlist/${priorityReason.list_id}`
              : "",
            -1,
            -1,
          ],
        )
        .then((r) => r.rows[0]);
      log.info(`Now playing: ${history.name} (${history.video_id})`);

      log.info(`Notifying ${inboxes.size} inboxes`);
      for (const inbox of inboxes) {
        const inboxUrl = new URL(inbox);
        const headers = await signRequest("POST", inboxUrl);
        fetch(inbox, {
          method: "POST",
          headers,
          body: JSON.stringify(
            noteToCreateActivity(historyToActivity(history)),
          ),
        }).then((response) =>
          log.info(`Notified ${inboxUrl.host}: ${response.status}`),
        );
      }

      const timetable: (Song & { id: number })[] = await fetch(
        "https://cafe.kiite.jp/api/cafe/timetable?limit=2",
      ).then((r) => r.json());
      const latestSong =
        timetable[0].video_id === data.video_id ? timetable[1] : timetable[0];
      log.info(
        `Updating latest song stat: ${latestSong.title} (${latestSong.video_id})`,
      );
      const spins: Record<string, number[]> = await fetch(
        `https://cafe.kiite.jp/api/cafe/rotate_users?ids=${latestSong.id}`,
      ).then((r) => r.json());
      const newFaves = (latestSong.new_fav_user_ids ?? []).length;
      const spinCount = Object.values(spins).flat().length;

      const latestHistory = await db
        .query<History>(
          "SELECT * FROM history WHERE video_id = $1 ORDER BY date DESC LIMIT 1",
          [latestSong.video_id],
        )
        .then((r) => r.rows[0]);
      if (!latestHistory) {
        log.warn("Latest song not found");
      } else {
        await db.query(
          "UPDATE history SET newfaves = $1, spins = $2 WHERE id = $3",
          [newFaves, spinCount, latestHistory.id],
        );
        log.info(
          `Updated latest song stat: ${newFaves} new faves, ${spinCount} spins`,
        );
      }

      log.info("Waiting for next song");
      await waitUntil(
        new Date(data.start_time).getTime() +
          data.msec_duration +
          timeDifference -
          10000,
      );
    } catch (e) {
      log.error(e);
    }
  }
};
