import { consola } from "consola";
import { Follower, History, db } from "./db.ts";
import { signRequest } from "./signature.ts";
import { historyToActivity, noteToCreateActivity } from "./activity.ts";
import { gasUrl } from "./env.ts";
import { updateHuggingFace } from "./huggingFace.ts";

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

type PriorityReason = Song["reasons"][0];

const fetchPriorityUser = async (
  song: Song,
  titleForLog?: string,
): Promise<{
  priorityReason: PriorityReason | undefined;
  user: KiiteUser | undefined;
}> => {
  const priorityReason = song.reasons.find(
    (reason) => reason.type === "priority_playlist",
  );

  if (!priorityReason) {
    log.info("No priority playlist found");
    return { priorityReason: undefined, user: undefined };
  }

  if (titleForLog) {
    log.info(`Priority playlist found for ${titleForLog}`);
  } else {
    log.info("Priority playlist found");
  }

  const users = (await fetch(
    `https://cafeapi.kiite.jp/api/kiite_users?user_ids=${priorityReason.user_id}&ignore_order=1`,
  ).then((response) => response.json())) as KiiteUser[];

  return { priorityReason, user: users[0] };
};

const waitUntil = async (timestamp: number) => {
  const currentTimestamp = new Date().getTime();
  const waitDuration = timestamp - currentTimestamp;
  log.info(`Waiting for ${waitDuration}ms`);
  await new Promise((resolve) => setTimeout(resolve, waitDuration));
};

const insertHistory = async (
  song: Song,
  user: KiiteUser | undefined,
  priorityReason: PriorityReason | undefined,
  newFaves: number = -1,
  spinCount: number = -1,
) => {
  const dbHistory = await db
    .query<History>(
      "INSERT INTO histories (" +
        "video_id, title, author, date, thumbnail, pickup_user_url, pickup_user_name, pickup_user_icon, pickup_playlist_url, new_faves, spins" +
        ") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",

      [
        song.video_id,
        song.title,
        song.artist_name,
        new Date(song.start_time),
        song.thumbnail,
        user ? `https://kiite.jp/user/${user.user_name}` : "",
        user?.nickname ?? "",
        user?.avatar_url ?? "",
        priorityReason
          ? `https://kiite.jp/playlist/${priorityReason.list_id}`
          : "",
        newFaves,
        spinCount,
      ],
    )
    .then((r) => r.rows[0]);
  log.info(`Added: ${song.title} (${song.video_id})`);

  return dbHistory;
};
const notifyFollowers = async (history: History) => {
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

  log.info(`Notifying ${inboxes.size} inboxes`);
  const body = noteToCreateActivity(historyToActivity(history));
  for (const inbox of inboxes) {
    const inboxUrl = new URL(inbox);
    const headers = await signRequest("POST", JSON.stringify(body), inboxUrl);
    fetch(inbox, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }).then(async (response) => {
      if (response.ok) {
        log.info(`Notified ${inbox}`);
      } else {
        log.warn(
          `Failed to notify ${inbox}: ${await response.text().then((t) => t.split("\n")[0])}`,
        );
      }
    });
  }
};

export const updateSecondLatestHistory = async (currentVideoId: string) => {
  const timetable: (Song & { id: number })[] = await fetch(
    "https://cafe.kiite.jp/api/cafe/timetable?limit=2",
  ).then((r) => r.json());
  const latestSong =
    timetable[timetable.findIndex((s) => s.video_id === currentVideoId) + 1];
  log.info(
    `Updating latest song stat: ${latestSong.title} (${latestSong.video_id})`,
  );
  const spins: Record<string, number[]> = await fetch(
    `https://cafe.kiite.jp/api/cafe/rotate_users?ids=${latestSong.id}`,
  ).then((r) => r.json());
  const newFaves = (latestSong.new_fav_user_ids ?? []).length;
  const spinCount = Object.values(spins).flat().length;

  const secondLatestHistory = await db
    .query<History>(
      "SELECT * FROM histories WHERE video_id = $1 ORDER BY date DESC LIMIT 1",
      [latestSong.video_id],
    )
    .then((r) => r.rows[0]);

  if (!secondLatestHistory) {
    log.warn("Latest song not found");
  } else {
    await db.query(
      "UPDATE histories SET new_faves = $1, spins = $2 WHERE id = $3",
      [newFaves, spinCount, secondLatestHistory.id],
    );
    log.info(
      `Updated latest song stat: ${newFaves} new faves, ${spinCount} spins`,
    );

    secondLatestHistory.new_faves = newFaves;
    secondLatestHistory.spins = spinCount;
  }
  return secondLatestHistory;
};

export const notifyGas = async (histories: History[]) => {
  if (!gasUrl) {
    log.warn("Google Apps Script URL not found");
    return;
  }
  log.info("Notifying Google Apps Script");
  const response = await fetch(gasUrl, {
    method: "POST",
    body: JSON.stringify(histories),
  })
    .then((r) => r.json())
    .catch(() => ({
      success: false,
      reason: "Failed to parse JSON",
    }));
  if (response.success) {
    log.info("Notified Google Apps Script");
  } else {
    log.warn(`Failed to notify Google Apps Script: ${response.reason}`);
  }
};

export const cafeWatcher = async () => {
  log.info("Cafe watcher started");

  await fillOfflineHistories();

  while (true) {
    try {
      await updateHistory();
    } catch (e) {
      log.error(e);
    }
  }
};

async function fillOfflineHistories() {
  const latestHistory = await db
    .query<History>("SELECT * FROM histories ORDER BY date DESC LIMIT 1")
    .then((r) => r.rows[0]);
  if (!latestHistory) {
    log.info("Latest history not found");
  } else {
    log.info(
      `Latest history: ${latestHistory.title} (${latestHistory.video_id})`,
    );
    const timetable: (Song & { id: number })[] = await fetch(
      "https://cafe.kiite.jp/api/cafe/timetable?limit=100",
    ).then((r) => r.json());
    const lastHistoryIndex = timetable.findIndex(
      (s) => s.video_id === latestHistory.video_id,
    );

    if (lastHistoryIndex === 0) {
      log.info("Database is up to date");
    } else {
      log.info(
        `Adding ${lastHistoryIndex === -1 ? 100 : lastHistoryIndex} songs to the database`,
      );
      const unknownTimetables = timetable.slice(
        0,
        lastHistoryIndex === -1 ? 100 : lastHistoryIndex,
      );

      const spins: Record<string, number[]> = await fetch(
        `https://cafe.kiite.jp/api/cafe/rotate_users?ids=${unknownTimetables
          .map((h) => h.id)
          .join(",")}`,
      ).then((r) => r.json());

      const histories: History[] = [];
      for (const history of unknownTimetables) {
        const { priorityReason, user } = await fetchPriorityUser(
          history,
          history.title,
        );

        const newFaves = (history.new_fav_user_ids ?? []).length;
        const spinCount = spins[history.id]?.length ?? -1;

        histories.push(
          await insertHistory(
            history,
            user,
            priorityReason,
            newFaves,
            spinCount,
          ),
        );
      }

      await notifyGas(histories);
      await updateHuggingFace();
    }
  }
}

async function updateHistory() {
  const localTime = new Date();
  const time = await fetch("https://cafe.kiite.jp/api/cafe/time").then((r) =>
    r.json(),
  );
  const serverTime = new Date(time * 1000);
  const timeDifference = localTime.getTime() - serverTime.getTime();
  log.info(`Time difference: ${timeDifference}ms`);

  const temporaryData = (await fetch(
    "https://cafe.kiite.jp/api/cafe/next_song",
  ).then((r) => r.json())) as Song;
  const untilNextSong =
    new Date(temporaryData.start_time).getTime() +
    timeDifference -
    new Date().getTime();
  if (untilNextSong < 10000) {
    log.info(`Song is too close: ${untilNextSong}ms, waiting more`);
    await waitUntil(new Date(temporaryData.start_time).getTime() + 10000);
    return;
  }
  await waitUntil(
    new Date(temporaryData.start_time).getTime() + timeDifference - 10000,
  );

  const nextSong = (await fetch(
    "https://cafe.kiite.jp/api/cafe/next_song",
  ).then((r) => r.json())) as Song | null;
  if (!nextSong) {
    log.info("Cafe is closed, sleeping 1 minute");
    await new Promise((resolve) => setTimeout(resolve, 60000));
    return;
  }
  log.info(`Next song: ${nextSong.title} (${nextSong.video_id})`);

  const { priorityReason, user } = await fetchPriorityUser(nextSong);
  await waitUntil(new Date(nextSong.start_time).getTime() + timeDifference);

  const history = await insertHistory(nextSong, user, priorityReason, -1, -1);
  log.info(`Now playing: ${history.title} (${history.video_id})`);

  await notifyFollowers(history);

  const lastHistory = await updateSecondLatestHistory(nextSong.video_id);
  await notifyGas([lastHistory]);
  await updateHuggingFace();

  log.info("Waiting for next song");
  await waitUntil(
    new Date(nextSong.start_time).getTime() +
      nextSong.msec_duration +
      timeDifference -
      10000,
  );
}
