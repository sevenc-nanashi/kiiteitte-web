/// <reference types="google-apps-script" />
import typia from "typia";

type Params = {
  id: number;
  video_id: string;
  title: string;
  author: string;
  date: string;
  thumbnail: string;
  new_faves: number;
  spins: number;
  pickup_user_url: string;
  pickup_user_name: string;
  pickup_user_icon: string;
  pickup_playlist_url: string;
};

function doPost(e: GoogleAppsScript.Events.DoPost) {
  const contents = e.postData?.contents;
  if (!contents) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, reason: "No contents" }),
    );
  }
  const data = typia.json.validateParse<Params>(contents);
  if (!data.success) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        reason: `Invalid JSON, ${JSON.stringify(data.errors)}`,
      }),
    );
  }
  const params = data.data;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const values = [
    params.video_id,
    params.title,
    params.author,
    params.date,
    params.thumbnail,
    params.new_faves,
    params.spins,
    params.pickup_user_url,
    params.pickup_user_name,
    params.pickup_user_icon,
    params.pickup_playlist_url,
  ];

  sheet.getRange(lastRow + 1, 1, 1, values.length).setValues([]);

  return ContentService.createTextOutput(JSON.stringify({ success: true }));
}

globalThis.doPost = doPost;
