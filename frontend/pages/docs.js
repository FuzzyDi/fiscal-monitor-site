import Link from 'next/link';
import Head from 'next/head';

export default function Docs() {
  return (
    <>
      <Head>
        <title>Документация - Fiscal Monitor</title>
        <meta name="description" content="Документация по установке и настройке системы мониторинга фискальных модулей" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14">
              <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                На главную
              </Link>
              <h1 className="text-lg font-bold text-gray-900">Документация</h1>
              <div className="w-24"></div>
            </div>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Table of Contents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Содержание</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <a href="#overview" className="text-blue-600 hover:underline">1. Обзор системы</a>
              <a href="#agent-install" className="text-blue-600 hover:underline">2. Установка агента (Linux)</a>
              <a href="#windows-install" className="text-blue-600 hover:underline">2.5. Установка на Windows</a>
              <a href="#agent-config" className="text-blue-600 hover:underline">3. Настройка агента</a>
              <a href="#agent-commands" className="text-blue-600 hover:underline">4. Команды управления</a>
              <a href="#portal" className="text-blue-600 hover:underline">5. Портал клиента</a>
              <a href="#telegram" className="text-blue-600 hover:underline">6. Telegram уведомления</a>
              <a href="#alerts" className="text-blue-600 hover:underline">7. Уровни алертов</a>
              <a href="#troubleshooting" className="text-blue-600 hover:underline">8. Решение проблем</a>
            </div>
          </div>

          {/* Section 1: Overview */}
          <section id="overview" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Обзор системы</h2>
            
            <p className="text-gray-700 mb-4">
              Fiscal Monitor — система мониторинга фискальных модулей (ФМ). Состоит из трёх компонентов:
            </p>

            <div className="space-y-3 mb-4">
              <div className="flex items-start p-3 bg-green-50 rounded-lg">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Агент (на кассе)</h4>
                  <p className="text-sm text-gray-600">Собирает данные с FiscalDriveService и отправляет на сервер каждые 5 минут</p>
                </div>
              </div>

              <div className="flex items-start p-3 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Сервер</h4>
                  <p className="text-sm text-gray-600">Принимает данные, анализирует, генерирует алерты и отправляет уведомления</p>
                </div>
              </div>

              <div className="flex items-start p-3 bg-purple-50 rounded-lg">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Веб-интерфейс</h4>
                  <p className="text-sm text-gray-600">Портал клиента для просмотра состояния и настройки уведомлений</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Важно:</strong> Агент только собирает данные. Вся логика алертов и уведомлений — на сервере.
              </p>
            </div>
          </section>

          {/* Section 2: Agent Install */}
          <section id="agent-install" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Установка агента (Linux)</h2>
            
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Системные требования:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Linux (TinyCore, Ubuntu 18.04+, Debian 10+)</li>
                <li>Установленный FiscalDriveService</li>
                <li>Доступ к интернету (HTTPS порт 443)</li>
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Шаги установки:</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">1</span>
                    <span className="font-medium text-gray-900">Скачайте архив на кассу</span>
                  </div>
                  <div className="ml-10 bg-gray-900 rounded p-3">
                    <code className="text-green-400 text-sm">curl -O https://fiscaldrive.sbg.network/downloads/sbg-fiscaldrive-agent.tar.gz</code>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">2</span>
                    <span className="font-medium text-gray-900">Распакуйте архив</span>
                  </div>
                  <div className="ml-10 bg-gray-900 rounded p-3">
                    <code className="text-green-400 text-sm">tar -xzf sbg-fiscaldrive-agent.tar.gz && cd sbg-fiscaldrive-agent</code>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">3</span>
                    <span className="font-medium text-gray-900">Запустите установщик</span>
                  </div>
                  <div className="ml-10 bg-gray-900 rounded p-3">
                    <code className="text-green-400 text-sm">sudo ./install.sh</code>
                  </div>
                  <p className="ml-10 mt-2 text-sm text-gray-600">Автоматически определит TinyCore или Ubuntu/systemd</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">4</span>
                    <span className="font-medium text-gray-900">Настройте конфиг</span>
                  </div>
                  <div className="ml-10 bg-gray-900 rounded p-3">
                    <code className="text-green-400 text-sm">sudo nano /etc/sbg-fiscaldrive-agent/agent.conf</code>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <span className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">✓</span>
                    <span className="font-medium text-green-800">Готово! Агент запустится автоматически</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href="/downloads/sbg-fiscaldrive-agent.tar.gz"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Скачать для Linux
              </a>
              <a
                href="/downloads/sbg-fiscaldrive-agent-windows.zip"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Скачать для Windows
              </a>
            </div>
          </section>

          {/* Section 2.5: Windows Install */}
          <section id="windows-install" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold text-gray-900">2.5. Установка на Windows</h2>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">NEW</span>
            </div>
            
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Системные требования:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Windows Server 2012 R2+ или Windows 10+</li>
                <li>Установленный FiscalDriveService</li>
                <li>PowerShell 5.1+</li>
                <li>Доступ к интернету (HTTPS порт 443)</li>
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Шаги установки:</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">1</span>
                    <span className="font-medium text-gray-900">Скачайте и распакуйте архив</span>
                  </div>
                  <p className="ml-10 text-sm text-gray-600">Распакуйте <code className="bg-gray-200 px-1 rounded">sbg-fiscaldrive-agent-windows.zip</code> в удобную папку</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">2</span>
                    <span className="font-medium text-gray-900">Запустите PowerShell от администратора</span>
                  </div>
                  <p className="ml-10 text-sm text-gray-600">Правый клик на PowerShell → &quot;Запуск от имени администратора&quot;</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">3</span>
                    <span className="font-medium text-gray-900">Запустите установщик</span>
                  </div>
                  <div className="ml-10 bg-gray-900 rounded p-3">
                    <code className="text-green-400 text-sm">cd C:\путь\к\папке<br/>.\install.ps1</code>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">4</span>
                    <span className="font-medium text-gray-900">Настройте конфиг и пароль БД</span>
                  </div>
                  <div className="ml-10 bg-gray-900 rounded p-3 mb-2">
                    <code className="text-green-400 text-sm">notepad C:\ProgramData\sbg-fiscaldrive-agent\agent.conf<br/>notepad C:\ProgramData\sbg-fiscaldrive-agent\secrets.bat</code>
                  </div>
                  <p className="ml-10 text-sm text-gray-600">В secrets.bat укажите: <code className="bg-gray-200 px-1 rounded">set DB_PASSWORD=ваш_пароль</code></p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <span className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">✓</span>
                    <span className="font-medium text-green-800">Готово! Служба запустится автоматически</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Команды управления (PowerShell):</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-green-400 text-sm font-mono">{`# Статус службы
Get-Service sbg-fiscaldrive-agent

# Запуск / остановка / перезапуск
Start-Service sbg-fiscaldrive-agent
Stop-Service sbg-fiscaldrive-agent
Restart-Service sbg-fiscaldrive-agent

# Просмотр логов
Get-Content C:\\ProgramData\\sbg-fiscaldrive-agent\\agent.log -Tail 50

# Следить за логами в реальном времени
Get-Content C:\\ProgramData\\sbg-fiscaldrive-agent\\agent.log -Wait`}</pre>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Расположение файлов:</h3>
              <table className="min-w-full text-sm">
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-2 font-medium text-gray-900">Программа</td>
                    <td className="py-2 text-gray-700 font-mono">C:\Program Files\sbg-fiscaldrive-agent\</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium text-gray-900">Конфигурация</td>
                    <td className="py-2 text-gray-700 font-mono">C:\ProgramData\sbg-fiscaldrive-agent\agent.conf</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium text-gray-900">Пароль БД</td>
                    <td className="py-2 text-gray-700 font-mono">C:\ProgramData\sbg-fiscaldrive-agent\secrets.bat</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium text-gray-900">Логи</td>
                    <td className="py-2 text-gray-700 font-mono">C:\ProgramData\sbg-fiscaldrive-agent\agent.log</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Agent Config */}
          <section id="agent-config" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Настройка агента</h2>
            
            <p className="text-gray-700 mb-4">
              Файл конфигурации: <code className="bg-gray-100 px-2 py-1 rounded">/etc/sbg-fiscaldrive-agent/agent.conf</code>
            </p>

            <div className="bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto">
              <pre className="text-green-400 text-sm font-mono">{`# FiscalDriveService API
fiscal.url=http://127.0.0.1:3448/rpc/api
fiscal.timeout.seconds=30

# Сервер мониторинга
server.url=https://fiscaldrive.sbg.network/api/v1/fiscal/snapshot
server.timeout.seconds=30
server.insecure=true

# Данные магазина (если не используется БД)
shop.inn=123456789
shop.number=1
shop.name=Магазин №1
pos.number=1

# Или читать из PostgreSQL
db.enabled=true
db.host=127.0.0.1
db.port=5432
db.name=catalog
db.user=postgres

# Интервалы проверки
interval.minutes=5
interval.heavy.minutes=30

# Логирование
log.path=/var/log/sbg-fiscaldrive-agent.log
log.level=INFO`}</pre>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">Параметр</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">Описание</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded">fiscal.url</code></td>
                    <td className="py-2 px-3">URL JSON-RPC API FiscalDriveService</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded">server.url</code></td>
                    <td className="py-2 px-3">URL сервера мониторинга</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded">server.insecure</code></td>
                    <td className="py-2 px-3">Отключить проверку SSL (для самоподписанных сертификатов)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded">shop.inn</code></td>
                    <td className="py-2 px-3">ИНН/СТИР организации (9-12 цифр)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded">db.enabled</code></td>
                    <td className="py-2 px-3">Читать данные магазина из PostgreSQL</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded">interval.minutes</code></td>
                    <td className="py-2 px-3">Интервал отправки данных (по умолчанию 5 мин)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Пароль БД:</strong> Хранится в отдельном файле <code className="bg-blue-100 px-1 rounded">/etc/sbg-fiscaldrive-agent/secrets</code>
              </p>
            </div>
          </section>

          {/* Section 4: Agent Commands */}
          <section id="agent-commands" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Команды управления</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">TinyCore Linux:</h3>
                <div className="bg-gray-900 rounded-lg p-3 space-y-2">
                  <code className="block text-green-400 text-sm">/etc/init.d/sbg-fiscaldrive-agent start</code>
                  <code className="block text-green-400 text-sm">/etc/init.d/sbg-fiscaldrive-agent stop</code>
                  <code className="block text-green-400 text-sm">/etc/init.d/sbg-fiscaldrive-agent restart</code>
                  <code className="block text-green-400 text-sm">/etc/init.d/sbg-fiscaldrive-agent status</code>
                  <code className="block text-green-400 text-sm">/etc/init.d/sbg-fiscaldrive-agent log</code>
                </div>
                <p className="text-sm text-gray-600 mt-2">Не забудьте: <code className="bg-gray-100 px-1 rounded">filetool.sh -b</code></p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Ubuntu / Debian:</h3>
                <div className="bg-gray-900 rounded-lg p-3 space-y-2">
                  <code className="block text-green-400 text-sm">systemctl start sbg-fiscaldrive-agent</code>
                  <code className="block text-green-400 text-sm">systemctl stop sbg-fiscaldrive-agent</code>
                  <code className="block text-green-400 text-sm">systemctl restart sbg-fiscaldrive-agent</code>
                  <code className="block text-green-400 text-sm">systemctl status sbg-fiscaldrive-agent</code>
                  <code className="block text-green-400 text-sm">journalctl -u sbg-fiscaldrive-agent -f</code>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Отладка:</h3>
              <div className="bg-gray-900 rounded-lg p-3 space-y-2">
                <code className="block text-green-400 text-sm"># Проверить конфиг</code>
                <code className="block text-yellow-400 text-sm">sbg-fiscaldrive-agent -config /etc/sbg-fiscaldrive-agent/agent.conf -check</code>
                <code className="block text-green-400 text-sm mt-2"># Запустить один раз вручную</code>
                <code className="block text-yellow-400 text-sm">sbg-fiscaldrive-agent -config /etc/sbg-fiscaldrive-agent/agent.conf -once</code>
              </div>
            </div>
          </section>

          {/* Section 5: Portal */}
          <section id="portal" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Портал клиента</h2>
            
            <p className="text-gray-700 mb-4">
              Портал доступен по адресу: <Link href="/portal/login" className="text-blue-600 hover:underline">fiscaldrive.sbg.network/portal</Link>
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Возможности:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Просмотр состояния всех терминалов</li>
                  <li>• Текущие алерты по каждой кассе</li>
                  <li>• История уведомлений</li>
                  <li>• Настройка Telegram уведомлений</li>
                  <li>• Тестовая отправка уведомлений</li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Для входа нужен токен:</h4>
                <p className="text-sm text-gray-700 mb-2">Токен выдаётся администратором при регистрации организации.</p>
                <p className="text-sm text-gray-600">Формат: <code className="bg-gray-200 px-1 rounded">FM-XXXX-XXXX-XXXX</code></p>
              </div>
            </div>
          </section>

          {/* Section 6: Telegram */}
          <section id="telegram" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Telegram уведомления</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0">1</span>
                <div>
                  <p className="font-medium text-gray-900">Войдите в портал клиента</p>
                  <p className="text-sm text-gray-600">Используйте токен доступа</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0">2</span>
                <div>
                  <p className="font-medium text-gray-900">Перейдите в раздел «Telegram»</p>
                  <p className="text-sm text-gray-600">Нажмите «Подключить Telegram»</p>
                </div>
              </div>

              <div className="flex items-start">
                <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0">3</span>
                <div>
                  <p className="font-medium text-gray-900">Откройте бота в Telegram</p>
                  <p className="text-sm text-gray-600">Нажмите /start и отправьте код подключения</p>
                </div>
              </div>

              <div className="flex items-start">
                <span className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0">✓</span>
                <div>
                  <p className="font-medium text-gray-900">Готово!</p>
                  <p className="text-sm text-gray-600">Уведомления будут приходить при алертах уровня WARN и выше</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Несколько получателей:</strong> Можно подключить неограниченное количество Telegram аккаунтов к одной подписке.
              </p>
            </div>
          </section>

          {/* Section 7: Alerts */}
          <section id="alerts" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Уровни алертов</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center p-3 bg-gray-100 rounded-lg">
                <span className="px-3 py-1 bg-blue-500 text-white rounded font-bold text-sm mr-4">INFO</span>
                <span className="text-gray-700">Информационное сообщение. Уведомления не отправляются.</span>
              </div>
              <div className="flex items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <span className="px-3 py-1 bg-yellow-500 text-white rounded font-bold text-sm mr-4">WARN</span>
                <span className="text-gray-700">Предупреждение. Требует внимания в ближайшее время.</span>
              </div>
              <div className="flex items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                <span className="px-3 py-1 bg-orange-500 text-white rounded font-bold text-sm mr-4">DANGER</span>
                <span className="text-gray-700">Опасно. Требуется скорое вмешательство.</span>
              </div>
              <div className="flex items-center p-3 bg-red-50 rounded-lg border border-red-200">
                <span className="px-3 py-1 bg-red-600 text-white rounded font-bold text-sm mr-4">CRITICAL</span>
                <span className="text-gray-700">Критично! Требуется немедленное действие.</span>
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 mb-3">Пороги срабатывания:</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">Метрика</th>
                    <th className="text-center py-2 px-3 font-semibold text-blue-600">INFO</th>
                    <th className="text-center py-2 px-3 font-semibold text-yellow-600">WARN</th>
                    <th className="text-center py-2 px-3 font-semibold text-orange-600">DANGER</th>
                    <th className="text-center py-2 px-3 font-semibold text-red-600">CRITICAL</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b">
                    <td className="py-2 px-3">Z-отчётов осталось</td>
                    <td className="text-center py-2 px-3">≤50</td>
                    <td className="text-center py-2 px-3">≤30</td>
                    <td className="text-center py-2 px-3">≤15</td>
                    <td className="text-center py-2 px-3">≤5</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Неотправленных документов</td>
                    <td className="text-center py-2 px-3">≥1</td>
                    <td className="text-center py-2 px-3">≥5</td>
                    <td className="text-center py-2 px-3">≥10</td>
                    <td className="text-center py-2 px-3">≥20</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Память ФМ заполнена</td>
                    <td className="text-center py-2 px-3">≥5%</td>
                    <td className="text-center py-2 px-3">≥10%</td>
                    <td className="text-center py-2 px-3">≥20%</td>
                    <td className="text-center py-2 px-3">≥30%</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Нет связи с ОФД</td>
                    <td className="text-center py-2 px-3">—</td>
                    <td className="text-center py-2 px-3">≥1 час</td>
                    <td className="text-center py-2 px-3">≥4 часа</td>
                    <td className="text-center py-2 px-3">≥12 часов</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 8: Troubleshooting */}
          <section id="troubleshooting" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Решение проблем</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-red-600 mb-2">Failed to start</h4>
                <p className="text-sm text-gray-700 mb-2">Запустите агент вручную для диагностики:</p>
                <code className="block bg-gray-200 px-2 py-1 rounded text-sm">/opt/sbg-fiscaldrive-agent/sbg-fiscaldrive-agent -config /etc/sbg-fiscaldrive-agent/agent.conf</code>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-red-600 mb-2">TLS certificate error</h4>
                <p className="text-sm text-gray-700 mb-2">Добавьте в конфиг:</p>
                <code className="block bg-gray-200 px-2 py-1 rounded text-sm">server.insecure=true</code>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-red-600 mb-2">shopINN is empty / invalid</h4>
                <p className="text-sm text-gray-700 mb-2">Укажите данные вручную в конфиге или проверьте подключение к БД.</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-red-600 mb-2">Connection refused (FiscalDriveService)</h4>
                <p className="text-sm text-gray-700 mb-2">Проверьте что FiscalDriveService запущен:</p>
                <code className="block bg-gray-200 px-2 py-1 rounded text-sm">curl http://127.0.0.1:3448/rpc/api</code>
              </div>
            </div>
          </section>

          {/* Support */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Нужна помощь?</h3>
            <p className="mb-4 text-blue-100">Свяжитесь с технической поддержкой</p>
            <a
              href="https://t.me/sbg_support"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.015-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.1.154.234.169.358.015.124.034.354.019.546z"/>
              </svg>
              Telegram: @sbg_support
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
