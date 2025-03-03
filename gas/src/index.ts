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
  let parsed;
  try {
    parsed = JSON.parse(contents);
  } catch (e) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, reason: "Invalid JSON" }),
    );
  }
  const data = typia.validate<Params[]>(parsed);
  if (!data.success) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        reason: `Invalid JSON, ${JSON.stringify(data.errors)}`,
      }),
    );
  }
  if (!data.data.length) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, reason: "No data" }),
    );
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const values = data.data.map((params) => [
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
  ]);
  sheet
    .getRange(lastRow + 1, 1, values.length, values[0].length)
    .setValues([values]);

  return ContentService.createTextOutput(JSON.stringify({ success: true }));
}

globalThis.doPost = doPost;
