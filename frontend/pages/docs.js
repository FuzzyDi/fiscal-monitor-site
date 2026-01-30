import Head from 'next/head';
import Link from 'next/link';

export default function Documentation() {
  return (
    <>
      <Head>
        <title>Документация - Fiscal Monitor</title>
        <meta name="description" content="Документация по установке и настройке Fiscal Monitor" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="ml-2 text-lg font-bold text-gray-900">Fiscal Monitor</span>
              </Link>
              <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                ← На главную
              </Link>
            </div>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Документация</h1>

          {/* Table of Contents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Содержание</h2>
            <ul className="space-y-2 text-blue-600">
              <li><a href="#overview" className="hover:underline">1. Обзор системы</a></li>
              <li><a href="#agent-install" className="hover:underline">2. Установка агента</a></li>
              <li><a href="#agent-config" className="hover:underline">3. Настройка агента</a></li>
              <li><a href="#portal" className="hover:underline">4. Портал клиента</a></li>
              <li><a href="#telegram" className="hover:underline">5. Telegram уведомления</a></li>
              <li><a href="#alerts" className="hover:underline">6. Уровни алертов</a></li>
              <li><a href="#api" className="hover:underline">7. API</a></li>
              <li><a href="#troubleshooting" className="hover:underline">8. Решение проблем</a></li>
            </ul>
          </div>

          {/* Section 1: Overview */}
          <section id="overview" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Обзор системы</h2>
            <p className="text-gray-700 mb-4">
              Fiscal Monitor — система мониторинга фискальных модулей Set Retail 10. 
              Автоматически собирает данные о Z-отчётах, неотправленных чеках и состоянии терминалов.
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Компоненты системы:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li><strong>Агент</strong> — устанавливается на сервер с Set Retail 10, собирает и отправляет данные</li>
                <li><strong>Сервер</strong> — принимает данные, анализирует, генерирует алерты</li>
                <li><strong>Портал клиента</strong> — веб-интерфейс для просмотра состояния терминалов</li>
                <li><strong>Telegram-бот</strong> — отправляет уведомления о проблемах</li>
              </ul>
            </div>
          </section>

          {/* Section 2: Agent Install */}
          <section id="agent-install" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Установка агента</h2>
            
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Системные требования:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Linux (TinyCore, Ubuntu 18.04+, Debian 10+)</li>
                <li>Установленный FiscalDriveService</li>
                <li>Доступ к интернету (HTTPS порт 443)</li>
                <li>curl, jq (для bash-версии)</li>
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Шаги установки:</h3>
              <ol className="space-y-4">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">1</span>
                  <div>
                    <p className="font-medium text-gray-900">Скачайте архив</p>
                    <div className="bg-gray-100 rounded p-2 mt-1">
                      <code className="text-sm text-gray-800">curl -O https://fiscaldrive.sbg.network/downloads/fiscal-agent-linux.tar.gz</code>
                    </div>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">2</span>
                  <div>
                    <p className="font-medium text-gray-900">Распакуйте и установите</p>
                    <div className="bg-gray-100 rounded p-2 mt-1">
                      <code className="text-sm text-gray-800">tar -xzf fiscal-agent-linux.tar.gz && cd fiscal-agent && sudo ./install.sh</code>
                    </div>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">3</span>
                  <div>
                    <p className="font-medium text-gray-900">Настройте config.json</p>
                    <div className="bg-gray-100 rounded p-2 mt-1">
                      <code className="text-sm text-gray-800">sudo nano /etc/fiscal-agent/config.json</code>
                    </div>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">4</span>
                  <div>
                    <p className="font-medium text-gray-900">Запустите службу</p>
                    <div className="bg-gray-100 rounded p-2 mt-1">
                      <code className="text-sm text-gray-800">sudo systemctl start fiscal-agent && sudo systemctl enable fiscal-agent</code>
                    </div>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mr-3">✓</span>
                  <div>
                    <p className="font-medium text-gray-900">Готово!</p>
                    <p className="text-gray-600 text-sm">Агент запустится и начнёт отправлять данные каждые 5 минут</p>
                  </div>
                </li>
              </ol>
            </div>
          </section>

          {/* Section 3: Agent Config */}
          <section id="agent-config" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Настройка агента</h2>
            
            <p className="text-gray-700 mb-4">
              Откройте файл <code className="bg-gray-100 px-1 rounded">/etc/fiscal-agent/config.json</code>:
            </p>

            <div className="bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto">
              <pre className="text-green-400 text-sm font-mono">{`{
  "server_url": "https://fiscaldrive.sbg.network",
  "shop_inn": "123456789012",
  "shop_number": "1",
  "pos_number": "1",
  "interval_seconds": 300,
  "fiscal_api_url": "http://127.0.0.1:3449",
  "log_level": "info"
}`}</pre>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">Параметр</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">Описание</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded">server_url</code></td>
                    <td className="py-2 px-3">URL сервера мониторинга</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded">shop_inn</code></td>
                    <td className="py-2 px-3">ИНН организации (12 цифр)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded">shop_number</code></td>
                    <td className="py-2 px-3">Номер магазина</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded">pos_number</code></td>
                    <td className="py-2 px-3">Номер кассы</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded">interval_seconds</code></td>
                    <td className="py-2 px-3">Интервал отправки (по умолчанию 300 сек = 5 мин)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded">fiscal_api_url</code></td>
                    <td className="py-2 px-3">URL FiscalDriveService API</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Важно:</strong> Агент отправляет только сырые данные. Вся логика алертов и уведомлений — на сервере.
              </p>
            </div>
          </section>

          {/* Section 4: Portal */}
          <section id="portal" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Портал клиента</h2>
            
            <p className="text-gray-700 mb-4">
              Для доступа к порталу вам понадобится токен доступа, который выдаёт администратор системы.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">Функции портала:</h3>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>Просмотр состояния всех терминалов в реальном времени</li>
                <li>История алертов и инцидентов</li>
                <li>Информация о Z-отчётах</li>
                <li>Настройка Telegram уведомлений</li>
                <li>Экспорт данных в Excel</li>
              </ul>
            </div>

            <p className="text-gray-700">
              Вход в портал: <Link href="/portal/login" className="text-blue-600 hover:underline">/portal/login</Link>
            </p>
          </section>

          {/* Section 5: Telegram */}
          <section id="telegram" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Telegram уведомления</h2>
            
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Подключение Telegram:</h3>
              <ol className="space-y-2 text-gray-700">
                <li>1. Войдите в портал клиента</li>
                <li>2. Перейдите в раздел «Telegram»</li>
                <li>3. Запросите подписку на уведомления (если ещё нет)</li>
                <li>4. После одобрения нажмите «Получить код»</li>
                <li>5. Отправьте код боту в Telegram</li>
              </ol>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">💡 Можно подключить несколько Telegram!</h3>
              <p className="text-green-800 text-sm">
                К одному аккаунту можно подключить несколько получателей — директора, бухгалтера, техника. 
                Все будут получать одинаковые уведомления.
              </p>
            </div>
          </section>

          {/* Section 6: Alerts */}
          <section id="alerts" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Уровни алертов</h2>
            
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-gray-100 rounded-lg">
                <span className="w-20 px-2 py-1 bg-gray-500 text-white text-xs font-bold rounded text-center mr-3">INFO</span>
                <span className="text-gray-700">Информационное сообщение, действий не требуется</span>
              </div>
              <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                <span className="w-20 px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded text-center mr-3">WARN</span>
                <span className="text-gray-700">Предупреждение — есть неотправленные чеки (до 10)</span>
              </div>
              <div className="flex items-center p-3 bg-orange-50 rounded-lg">
                <span className="w-20 px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded text-center mr-3">DANGER</span>
                <span className="text-gray-700">Важно — много неотправленных чеков или старый Z-отчёт</span>
              </div>
              <div className="flex items-center p-3 bg-red-50 rounded-lg">
                <span className="w-20 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded text-center mr-3">CRITICAL</span>
                <span className="text-gray-700">Критично — требуется немедленное вмешательство</span>
              </div>
            </div>
          </section>

          {/* Section 7: API */}
          <section id="api" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. API</h2>
            
            <p className="text-gray-700 mb-4">
              Агент отправляет данные через REST API. Endpoint всегда возвращает 204, чтобы не блокировать работу касс.
            </p>

            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <code className="text-green-400 text-sm font-mono">POST /api/v1/fiscal/snapshot</code>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm font-mono">{`{
  "shop_inn": "123456789012",
  "terminals": [
    {
      "shop_number": 1,
      "pos_number": 1,
      "unsent_count": 0,
      "last_z_report_date": "2026-01-29",
      "last_z_report_number": 245
    }
  ]
}`}</pre>
            </div>
          </section>

          {/* Section 8: Troubleshooting */}
          <section id="troubleshooting" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Решение проблем</h2>
            
            <div className="space-y-4">
              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="font-semibold text-gray-900">Агент не отправляет данные</h3>
                <p className="text-gray-600 text-sm">Проверьте: 1) Правильность URL сервера в config.json, 2) Доступ к интернету, 3) Запущена ли служба FiscalAgent</p>
              </div>
              
              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="font-semibold text-gray-900">Не приходят Telegram уведомления</h3>
                <p className="text-gray-600 text-sm">Проверьте: 1) Подключён ли Telegram в портале, 2) Не заблокирован ли бот, 3) Активна ли подписка</p>
              </div>
              
              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="font-semibold text-gray-900">Терминал показывает «Нет данных»</h3>
                <p className="text-gray-600 text-sm">Данные не поступали более 15 минут. Проверьте работу агента на сервере.</p>
              </div>
            </div>
          </section>

          {/* Support */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <h2 className="text-xl font-bold text-blue-900 mb-2">Нужна помощь?</h2>
            <p className="text-blue-700 mb-4">Свяжитесь с технической поддержкой</p>
            <a 
              href="https://t.me/sbg_support" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
              Написать в Telegram
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-gray-500 text-sm">
              © 2026 Fiscal Monitor. Мониторинг фискальных модулей.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
