# TRPG SERVER GUIDE — Ver.1.0 starter

初期実装用の最小構成です。実データ、認証設定、デザインの最終調整、動作検証は未完了です。

## ローカルビルド
`python3 scripts/build.py`
生成される `dist/` をHTTPサーバーで配信してください（例: `python3 -m http.server 8000 -d dist`）。

## Cloudflare Pages
- GitHubリポジトリと接続
- Build command: `python3 scripts/build.py`
- Build output directory: `dist`
- Python 3 が使用可能なビルド環境にする

## CMS認証（未設定）
`admin/config.yml` の `backend.repo` と `backend.base_url` はプレースホルダーです。GitHub OAuthを安全に扱うWorker等を別途設定し、**認証が正常に機能するまで管理画面は利用できません**。既存サイトの秘密情報は転用・同梱しないでください。

## 注意点
- `content/scenarios/*.json` で `published: false` のデータは `dist/data/scenarios.json` に含まれません。非公開の原稿は公開リポジトリに置かず、プライベートリポジトリを使ってください。
- Decap CMSの標準GitHubバックエンドでは、REQUESTの受付状況のみを独立して即時保存する仕様や厳密な競合比較は実装していません。これらは初回公開用に簡略化しています。
- マークダウンの本文は初期版ではプレーンテキスト表示です。リッチな描画は今後の改善対象です。
- 公開URLやGitHubリポジトリはまだ作成していません。

## 今回の追加（実装準備版）
- 公開済みシナリオのみ `dist/data/scenarios.json` に出力します。
- 公開済みシナリオの詳細ページ `/scenario/<slug>/` を生成します。
- シナリオ一覧から詳細ページへ移動できます。
- `slug` は小文字英数字とハイフンに限定し、重複するとビルドを停止します。
- 非公開シナリオの詳細ページは生成しません。
- **GitHub/Cloudflareへの公開操作は未実施です。** OAuth接続と実データ設定が必要です。

## 最短の公開手順（準備）
1. 新規の**プライベート**GitHubリポジトリを作り、このZIPの中身をルートへ配置。
2. `admin/config.yml` の `backend.repo` を自分のリポジトリに変更。
3. Cloudflare PagesにGitHubリポジトリを接続し、ビルドコマンド `python3 scripts/build.py`、出力 `dist` を設定。
4. GitHub OAuth用の認証バックエンドを安全に用意し、`backend.base_url` を設定。**OAuthが動くまではCMS編集不可。**
5. サンプル文を実際の文章に置き換え、シナリオの公開フラグを確認してから公開。
6. 公開サイトとCMSのスマホ・PC動作確認を実施。
