import {
  BarChart3,
  Database,
  ExternalLink,
  Info,
  Mail,
  Map as MapIcon,
  MapPin,
  Search,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/_components/ui/alert";
import { Badge } from "@/_components/ui/badge";
import { Button } from "@/_components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/_components/ui/card";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Reach You</h1>
            </div>
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200"
            >
              都知事杯オープンデータハッカソン2025
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            福祉施設アクセシビリティ可視化・検索
          </h2>
          <p className="text-xl text-gray-600 mb-6 max-w-3xl mx-auto">
            特定の福祉施設へのアクセシビリティを地図上で多角的に可視化し、
            ユーザーの現在地から高速に施設を検索するためのWebアプリケーション
          </p>

          <Alert className="max-w-2xl mx-auto mb-8 bg-amber-50 border-amber-200">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>デモ版について:</strong>
              本アプリケーションはデモ版です。実際のメール送信は行われず、分析データにはダミーデータを使用しています。
            </AlertDescription>
          </Alert>
        </section>

        {/* Main Features */}
        <section className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Search Feature */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Search
                    className="w-6 h-6 text-green-600"
                    aria-hidden="true"
                  />
                </div>
                <CardTitle className="text-2xl">施設検索</CardTitle>
              </div>
              <CardDescription className="text-lg">
                【施設利用者向け】現在地から条件に合った福祉施設を高速検索
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-gray-800">
                  主な機能
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start space-x-2">
                    <MapPin
                      className="w-4 h-4 mt-1 text-green-600 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>現在地からの範囲検索（1km, 5km等）</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Mail
                      className="w-4 h-4 mt-1 text-green-600 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>複数施設への一括問い合わせ機能</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Users
                      className="w-4 h-4 mt-1 text-green-600 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      アクセシブルなUI（キーボード操作、スクリーンリーダー対応）
                    </span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-gray-800">
                  技術的ポイント
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start space-x-2">
                    <Zap
                      className="w-4 h-4 mt-1 text-blue-600 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      <strong>Geohash空間インデックス:</strong>{" "}
                      数万件のデータから数ミリ秒で検索
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Database
                      className="w-4 h-4 mt-1 text-blue-600 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      <strong>SQLiteデータベース:</strong>{" "}
                      PrismaによるAPI経由のデータ取得
                    </span>
                  </li>
                </ul>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>デモ版制限:</strong>{" "}
                  実際のメール送信は行われません。問い合わせ機能のフロー全体をテストできます。
                </AlertDescription>
              </Alert>

              <Link href="/search" className="block">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Search className="w-5 h-5 mr-2" aria-hidden="true" />
                  施設検索を試す
                  <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Visualization Feature */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MapIcon
                    className="w-6 h-6 text-purple-600"
                    aria-hidden="true"
                  />
                </div>
                <CardTitle className="text-2xl">
                  アクセシビリティ可視化
                </CardTitle>
              </div>
              <CardDescription className="text-lg">
                【施設・行政向け】地図上での多角的なアクセシビリティ分析
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-gray-800">
                  可視化機能
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start space-x-2">
                    <MapIcon
                      className="w-4 h-4 mt-1 text-purple-600 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>最近傍施設までの距離を250mメッシュで表示</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <BarChart3
                      className="w-4 h-4 mt-1 text-purple-600 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>ボロノイ図による施設のテリトリー可視化</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Users
                      className="w-4 h-4 mt-1 text-purple-600 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      問い合わせデータの統合分析（返信率、需要エリアなど）
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Database
                      className="w-4 h-4 mt-1 text-purple-600 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>分析メッシュデータのGeoJSONエクスポート機能</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-gray-800">
                  技術的ポイント
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start space-x-2">
                    <Zap
                      className="w-4 h-4 mt-1 text-blue-600 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      <strong>deck.gl:</strong>{" "}
                      大量の地理空間データを高性能レンダリング
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <BarChart3
                      className="w-4 h-4 mt-1 text-blue-600 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      <strong>カーネル密度推定（KDE）:</strong>{" "}
                      需要の「ホットスポット」を特定
                    </span>
                  </li>
                </ul>
              </div>

              <Alert className="bg-orange-50 border-orange-200">
                <Info className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>ダミーデータ使用:</strong>{" "}
                  問い合わせ分析機能ではテスト用のダミーデータを表示しています。
                </AlertDescription>
              </Alert>

              <Link href="/visualize-map" className="block">
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  <MapIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                  地図分析を試す
                  <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>

        {/* Technical Overview */}
        <section className="bg-white rounded-lg shadow-sm border p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            技術スタック
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Zap className="w-7 h-7 text-blue-600" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">
                フロントエンド
              </h3>
              <p className="text-sm text-gray-600">
                Next.js, TypeScript, React, Tailwind CSS
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Database
                  className="w-7 h-7 text-green-600"
                  aria-hidden="true"
                />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">データベース</h3>
              <p className="text-sm text-gray-600">Prisma, SQLite</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <MapIcon
                  className="w-7 h-7 text-purple-600"
                  aria-hidden="true"
                />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">地図・可視化</h3>
              <p className="text-sm text-gray-600">
                deck.gl, MapLibre GL JS, react-map-gl
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Mail className="w-7 h-7 text-orange-600" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">通信</h3>
              <p className="text-sm text-gray-600">Resend (メール送信)</p>
            </div>
          </div>
        </section>

        {/* Data Source */}
        <section className="bg-gray-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">使用データ</h2>
          <p className="text-gray-700 mb-4">
            <strong>社会福祉施設等一覧（平成30年5月1日時点）</strong> -
            東京都オープンデータ
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Badge variant="secondary" className="justify-center py-2">
              放課後等デイサービス事業所
            </Badge>
            <Badge variant="secondary" className="justify-center py-2">
              障害児相談支援事業所
            </Badge>
            <Badge variant="secondary" className="justify-center py-2">
              計画相談事業所
            </Badge>
            <Badge variant="secondary" className="justify-center py-2">
              就労継続支援（Ａ型）事業所
            </Badge>
            <Badge variant="secondary" className="justify-center py-2">
              就労継続支援（Ｂ型）事業所
            </Badge>
            <Badge variant="secondary" className="justify-center py-2">
              一覧（全施設）
            </Badge>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>
              &copy; 2025 Reach You - 都知事杯オープンデータハッカソン2025
              提出作品
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
