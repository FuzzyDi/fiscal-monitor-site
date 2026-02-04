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
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">Агент мониторинга</h3>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">v2.0</span>
                </div>
                <p className="text-gray-600 mb-4">
                  Лёгкий агент для кассы. Собирает данные с FiscalDriveService и отправляет на сервер.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Linux */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.002c-.06-.135-.12-.2-.18-.264-.12-.135-.27-.2-.47-.2-.085 0-.155.003-.236.017a3.098 3.098 0 01-.534-.066c-.263-.065-.398-.2-.473-.333-.075-.135-.09-.269-.09-.4-.001-.135.015-.2.04-.268.02-.066.042-.07.042-.135v-.003c-.01-.1-.045-.135-.134-.17a.97.97 0 00-.201-.03.972.972 0 00-.201.002c-.135.018-.253.066-.336.134v.003c-.052.066-.07.135-.08.266-.013.135-.012.267.02.402.01.066.024.133.05.2a.934.934 0 00.059.133c.013.033.025.065.025.065l-.003.003c-.01.267-.06.4-.06.534 0 .066.003.133.017.199.019.066.044.132.077.199.033.066.065.132.109.2.039.067.084.135.143.203a.627.627 0 01-.262-.065 1.482 1.482 0 01-.383-.267.986.986 0 01-.196-.399c-.033-.133-.05-.266-.05-.399 0-.134.017-.267.05-.4.033-.133.083-.267.15-.4.067-.133.145-.266.236-.398.18-.269.38-.469.575-.736.085-.136.155-.336.155-.536 0-.2-.07-.4-.206-.535a.924.924 0 00-.534-.2c-.265 0-.398.066-.6.2-.205.135-.47.336-.67.47l-.003.003a2.36 2.36 0 01-.534.267 6.573 6.573 0 01-.535.133 4.072 4.072 0 01-.534.067h-.003a.97.97 0 00-.2.016c-.066.016-.133.04-.2.067-.067.027-.133.06-.2.106-.066.04-.133.09-.2.133l-.003.004c-.138.1-.23.198-.33.331a3.07 3.07 0 00-.394.663c-.063.133-.12.27-.16.41-.044.133-.08.266-.101.399l-.002.003c-.01.066-.014.133-.02.2-.013.133-.013.266 0 .398.013.133.033.267.063.399.023.135.053.27.106.4l.001.002v.002a2.508 2.508 0 01-.093-.395 2.52 2.52 0 01-.024-.4c.004-.133.017-.266.045-.399.03-.133.064-.266.115-.399.105-.267.235-.534.4-.8.152-.24.315-.479.516-.73-.084-.267-.123-.533-.122-.8 0-.066.002-.132.01-.2-.134.066-.267.135-.401.2a1.16 1.16 0 01-.534.134c-.267 0-.534-.066-.8-.2l-.003-.003a1.16 1.16 0 01-.401-.333 1.079 1.079 0 01-.2-.467 1.37 1.37 0 010-.534c.033-.2.1-.333.2-.467a.862.862 0 01.4-.334c.133-.066.333-.1.533-.1a.97.97 0 01.4.066c.134.048.234.118.334.2l.002.001a.97.97 0 01.267.402c.065.133.099.266.099.4zm-1.732-6.702z"/>
                      </svg>
                      <span className="font-semibold text-gray-900">Linux</span>
                      <span className="text-xs text-gray-500">(TinyCore, Ubuntu, Debian)</span>
                    </div>
                    <a
                      href="/downloads/sbg-fiscaldrive-agent.tar.gz"
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm w-full justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Скачать .tar.gz
                    </a>
                  </div>

                  {/* Windows */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                      </svg>
                      <span className="font-semibold text-gray-900">Windows</span>
                      <span className="text-xs text-gray-500">(Server 2012+, Win 10+)</span>
                    </div>
                    <a
                      href="/downloads/sbg-fiscaldrive-agent-windows.zip"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm w-full justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Скачать .zip
                    </a>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Важно:</strong> После установки отредактируйте конфиг и укажите данные магазина или включите чтение из БД.
                  </p>
                </div>

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
