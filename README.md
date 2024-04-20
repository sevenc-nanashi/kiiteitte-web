# Kiiteitte Web

[Kiite Cafe](https://cafe.kiite.jp) の曲を通知したり、履歴を確認したりするための Web サイト。

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
