# Reach You - 福祉施設アクセシビリティ可視化・検索

Reach Youは、特定の福祉施設へのアクセシビリティを地図上で多角的に可視化し、ユーザーの現在地から高速に施設を検索するためのWebアプリケーションです。

## 都知事杯オープンデータハッカソン2025 提出作品
### 使用データ
- 社会福祉施設等一覧（平成30年5月1日時点） [https://catalog.data.metro.tokyo.lg.jp/dataset/t000054d0000000073](https://catalog.data.metro.tokyo.lg.jp/dataset/t000054d0000000073)
  - 一覧
  - 放課後等デイサービス事業所
  - 障害児相談支援事業所
  - 就労継続支援（Ａ型）事業所
  - 就労継続支援（Ｂ型）事業所

### アプリ使用データの生成
- アプリで使用するためGoogle Colabolatoryでデータ処理を実施 `/public/{施設タイプ}`に格納
  - `facilities.json`: 障害福祉施設の所在データなど
  - `mesh.geojson`: 東京都内の最近傍施設への距離を示す250mメッシュデータ
  - `voronoi.geojson`: 各施設の独占的な利用圏(ボロノイ領域)を示すボロノイ境界のポリゴンデータ

## 主な機能

### 1. アクセシビリティの可視化

- **最近傍施設までの距離表示**: 各地点から最も近い施設までの距離を、250mメッシュで色分けして地図上に表示します。
- **ボロノイ図**: 各施設がどのエリアをカバーしているか（テリトリー）を可視化します。
- **施設タイプの切り替え**: 「放課後等デイサービス」や「就労継続支援」など、複数の施設タイプに対応したデータを切り替えて表示できます。
- **レイヤーコントロール**: 市区町村の境界線、メッシュ、ボロノイ図、施設マーカーの表示/非表示を自由に切り替えられます。

### 2. 高性能な施設検索

- **現在地からの範囲検索**: ユーザーの現在地情報を基に、指定した半径内（例: 1km, 5km）にある施設を検索します。
- **Geohash空間インデックス**: 事前に計算されたGeohashインデックスを利用することで、数万件の施設データからでも極めて高速（数ミリ秒）な検索を実現しています。
- **検索手法の比較**: 全件スキャン（Brute-force）と複数のGeohash検索アルゴリズム（Basic, Precise, Grid）の性能を比較・分析できます。
- **アクセシブルなUI**: 検索結果はリストと地図で分かりやすく表示され、キーボード操作やスクリーンリーダーにも配慮しています。

## 技術スタック

- **フレームワーク**: [Next.js](https://nextjs.org/) (App Router)
- **言語**: [TypeScript](https://www.typescriptlang.org/)
- **地図・可視化**:
  - [deck.gl](https://deck.gl/): 大量の地理空間データを高性能にレンダリング
  - [MapLibre GL JS](https://maplibre.org/): オープンソースのベースマップライブラリ
  - [react-map-gl](https://visgl.github.io/react-map-gl/): React用地図コンポーネント
- **UIコンポーネント**:
  - [shadcn/ui](https://ui.shadcn.com/): スタイリッシュでアクセシブルなコンポーネント群
  - [Tailwind CSS](https://tailwindcss.com/): UIのスタイリング
  - [Lucide React](https://lucide.dev/): アイコン
- **コード品質**:
  - [Biome](https://biomejs.dev/): フォーマット、リント、チェックを統合した高速なツールチェイン
- **パッケージ管理**: [pnpm](https://pnpm.io/)

## セットアップと実行方法

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-username/reach-you.git
cd reach-you
```

### 2. 依存関係のインストール

このプロジェクトでは`pnpm`を使用します。

```bash
pnpm install
```

### 3. Geohashデータの生成 (必須)

アプリケーションの高速検索機能を利用するには、施設データからGeohashインデックスを事前に計算し、静的ファイルを生成する必要があります。

```bash
pnpm generate-geohash
```

このコマンドは`public/data`ディレクトリにJSONファイルを生成します。この処理は、初回起動時および施設データに更新があった場合に必要です。

### 4. 開発サーバーの起動

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開くと、アプリケーションが表示されます。

## 利用可能なスクリプト

- `pnpm dev`: 開発サーバーを起動します。
- `pnpm build`: プロダクション用にアプリケーションをビルドします。ビルド前に`generate-geohash`が自動的に実行されます。
- `pnpm start`: プロダクションビルドを起動します。
- `pnpm generate-geohash`: 検索用の静的Geohashデータを生成します。
- `pnpm lint`: Biomeでコードの静的解析を実行します。
- `pnpm format`: Biomeでコードをフォーマットします。
- `pnpm check`: Biomeでリント、フォーマット、インポートのチェックをまとめて実行します。

## ディレクトリ構造

```
.
├── public/              # 静的ファイル（地図データ、生成されたGeohashデータ）
├── scripts/             # データ生成用スクリプト
└── src/
    ├── app/             # Next.js App Router（各ページのコンポーネント）
    ├── _components/     # Reactコンポーネント
    │   ├── ui/          # shadcn/uiによる汎用UIコンポーネント
    │   └── ...          # アプリケーション固有のコンポーネント
    ├── hooks/           # カスタムReactフック
    ├── utils/           # 汎用ユーティリティ関数
    ├── types/           # TypeScriptの型定義
    └── _settings/       # アプリケーション全体の設定値
```