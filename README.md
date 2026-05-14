# Al Tarab LP

Teachable の `Al Tarab ONLINE and CLOUD` LPを静的ページとして再現したものです。

## Files

- `index.html`: 公開用の静的LP
- `styles.css`: LP用スタイル
- `assets/`: 元ページから取得した画像・SVG素材
- `tools/build-static.js`: 元HTMLから静的LPを再生成するためのスクリプト

## Preview

```sh
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173
```

## Notes

- 受講ボタンの月額プランは元ページと同じTeachable checkout URLを保持しています。
- 一括プランのフォームは静的ページで動かないため、問い合わせメールリンクに置き換えています。
- 添削動画サンプルは外部プレイヤー依存のため、静的なプレースホルダー表示にしています。
