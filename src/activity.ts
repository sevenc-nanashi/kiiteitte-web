import { APCreate, APNote, APRoot } from "activitypub-types";
import { History } from "./db.js";
import { host } from "./env.js";

export const historyToActivity = (history: History): APRoot<APNote> => {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "Note",
    id: `https://${host}/ap/history/${history.id}`,
    url: `https://${host}/ap/history/${history.id}`,
    published: new Date(history.date).toISOString(),
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    attributedTo: `https://${host}/ap/kiiteitte`,
    content: `♪${history.title} #${history.video_id} #Kiite\nKiite Cafeできいてます https://cafe.kiite.jp/`,
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
