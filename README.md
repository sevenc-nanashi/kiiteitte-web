# Kiiteitte Web [![@kiiteitte@kw.sevenc7c.com](https://shields.io/badge/@kiiteitte-@kw.sevenc7c.com-555555?labelColor=0ff)](https://kw.sevenc7c.com)

[Kiite Cafe](https://cafe.kiite.jp) の曲を通知したり、履歴を確認したりするための Web サイト。\
ActivityPub 経由でフォローすることもできます。

また、今までの曲の履歴を確認できるスプレッドシートも公開しています：<https://docs.google.com/spreadsheets/d/1EAV3AnS6pgC2roSAlQBopl1GlsEYGyEKNElcZwmvkfc/edit?usp=sharing>

## API

`GET /api/history` をすると、過去の曲の履歴を取得できます。
1リクエスト毎に10曲ずつ取得できます。
次のリクエストをする際には、`next` パラメータに前回の最後の曲のIDを指定してください。

```jsonc
[
  {
    // 内部ID。
    "id": 84,
    // 曲のID。
    "video_id": "sm31084095",
    // 曲のタイトル。
    "title": "記憶の水槽 / こんにちは谷田さん feat. 初音ミク",
    // 曲の作者。
    "author": "キタニタツヤ/こんにちは谷田さん",
    // 再生された日時。
    "date": "2024-04-20T06:57:25.000Z",
    // ニコニコ動画のURL。
    "url": "https://www.nicovideo.jp/watch/sm31084095",
    // サムネイル画像のURL。
    "thumbnail": "https://nicovideo.cdn.nimg.jp/thumbnails/31084095/31084095",
    // この回で増えたお気に入り数。データが存在しない場合（現在再生中、古い記録など）は-1。
    "new_faves": -1,
    // この回で回ったユーザー数。データが存在しない場合は-1。
    "spins": -1,
    // イチ推しリストのユーザーのURL。無い場合は空文字列。
    "pickup_user_url": "https://kiite.jp/user/Dokonokokinoko",
    // イチ推しリストのユーザーの名前。無い場合は空文字列。
    "pickup_user_name": "Koreratake",
    // イチ推しリストのユーザーのアイコン画像のURL。無い場合は空文字列。
    "pickup_user_icon": "https://d7209z8dzwjpy.cloudfront.net/avatar/ujrpiIEhaYlMUifXiG2tPJXP5v4WSDRAzh0NWLlw.jpg",
    // イチ推しリストのプレイリストのURL。無い場合は空文字列。
    "pickup_playlist_url": "https://kiite.jp/playlist/1HVF3YkW0b",
  },
  // ...
]
```

## 開発

[Bun](https://bun.sh) が必要です。

```sh
openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out key/private.pem
openssl rsa -in key/private.pem -outform PEM -pubout -out key/public.pem

cp ./env.example .env
cp ./docker-compose.dev.yml docker-compose.yml

docker-compose up -d
bun run dev
```

## ライセンス

MIT Licenseで公開しています。
