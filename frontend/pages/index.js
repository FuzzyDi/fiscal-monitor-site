import Link from 'next/link';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>Fiscal Monitor - Мониторинг фискальных модулей</title>
        <meta name="description" content="Система мониторинга фискальных модулей Set Retail 10" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Header */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900">Fiscal Monitor</h1>
                  <p className="text-xs text-gray-500">Мониторинг фискальных модулей</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/docs" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Документация
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Контроль
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> фискальных модулей </span>
              в реальном времени
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Автоматический мониторинг Z-отчётов, контроль неотправленных чеков и мгновенные уведомления в Telegram
            </p>
          </div>

          {/* Main Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Link
              href="/admin/login"
              className="group block p-6 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center transform group-hover:rotate-6 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <svg className="w-6 h-6 text-blue-600 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Панель администратора
              </h3>
              <p className="text-gray-600 mb-3 text-sm">
                Управление регистрациями, выдача токенов доступа, статистика системы
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Управление</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Статистика</span>
              </div>
            </Link>

            <Link
              href="/portal/login"
              className="group block p-6 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center transform group-hover:rotate-6 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <svg className="w-6 h-6 text-indigo-600 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Портал клиента
              </h3>
              <p className="text-gray-600 mb-3 text-sm">
                Состояние терминалов, алерты, Z-отчёты и настройка Telegram уведомлений
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">Мониторинг</span>
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">Уведомления</span>
              </div>
            </Link>
          </div>

          {/* Agent Download Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Агент мониторинга</h3>
                <p className="text-gray-600 mb-4">
                  Установите агент на кассу для автоматической отправки данных. Работает на TinyCore Linux, Ubuntu, Debian.
                </p>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Быстрая установка:</h4>
                  <ol className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">1</span>
                      <span>Скачайте и распакуйте архив на кассу</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">2</span>
                      <span>Отредактируйте <code className="bg-gray-200 px-1 rounded">/etc/fiscal-agent/config.json</code></span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">3</span>
                      <span>Запустите <code className="bg-gray-200 px-1 rounded">sudo ./install.sh</code></span>
                    </li>
                  </ol>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href="/downloads/fiscal-agent-linux.tar.gz"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Скачать для Linux
                  </a>
                  <Link
                    href="/docs"
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Документация
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            <div className="p-5 bg-white rounded-xl shadow-lg border border-gray-100">
              <div className="w-11 h-11 bg-red-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Автоматические алерты</h4>
              <p className="text-gray-600 text-sm">4 уровня критичности: INFO, WARN, DANGER, CRITICAL. Мгновенные уведомления в Telegram</p>
            </div>

            <div className="p-5 bg-white rounded-xl shadow-lg border border-gray-100">
              <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">В реальном времени</h4>
              <p className="text-gray-600 text-sm">Данные обновляются каждые 5 минут. Обнаружение потери связи с терминалом</p>
            </div>

            <div className="p-5 bg-white rounded-xl shadow-lg border border-gray-100">
              <div className="w-11 h-11 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Безопасность</h4>
              <p className="text-gray-600 text-sm">Токен-авторизация, раздельный доступ для админов и клиентов</p>
            </div>
          </div>

          {/* API Info */}
          <div className="p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">REST API</h3>
                <p className="text-gray-600 mb-3 text-sm">
                  Простой API для интеграции. Агент отправляет snapshot каждые 5 минут.
                </p>
                <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                  <code className="text-green-400 text-sm font-mono">
                    POST /api/v1/fiscal/snapshot
                  </code>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Всегда возвращает 204 — никогда не блокирует работу касс
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-500 text-sm">
                © 2026 Fiscal Monitor. Мониторинг фискальных модулей.
              </p>
              <div className="flex gap-6">
                <Link href="/docs" className="text-gray-500 hover:text-gray-700 text-sm">
                  Документация
                </Link>
                <a href="https://t.me/sbg_support" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 text-sm">
                  Поддержка
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
