import { APCreate, APNote, APRoot } from "activitypub-types";
import van from "mini-van-plate/van-plate";
import { History } from "./db.ts";
import { host } from "./env.ts";

const { p, a } = van.tags;

export const historyToActivity = (history: History): APRoot<APNote> => {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "Note",
    id: `https://${host}/ap/history/${history.id}`,
    url: `https://${host}/ap/history/${history.id}`,
    published: new Date(history.date).toISOString(),
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    attributedTo: `https://${host}/ap/kiiteitte`,
    content: p(
      a(
        {
          href: `https://nicovideo.jp/watch/${history.video_id}`,
        },
        `♪ ${history.title}`,
      ),
      ` #${history.video_id} #Kiite\nKiite Cafeできいてます `,
      a(
        {
          href: `https://cafe.kiite.jp/`,
        },
        `https://cafe.kiite.jp/`,
      ),
    ).render(),
    source: {
      content: `[♪ <plain>${history.title}</plain>](https://nicovideo.jp/watch/${history.video_id}) #${history.video_id} #Kiite\nKiite Cafeできいてます https://cafe.kiite.jp/`,
      mediaType: "text/x.misskeymarkdown",
    },
  };
};

export const noteToCreateActivity = (
  note: APRoot<APNote>,
): APRoot<APCreate> => {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `${note.id}/activity`,
    actor: `https://${host}/ap/kiiteitte`,
    type: "Create",
    published: note.published,
    object: note,
  };
};
