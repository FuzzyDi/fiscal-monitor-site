import Link from 'next/link';
import { useRouter } from 'next/router';

export default function AdminLayout({ children }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('adminKey');
    router.push('/admin/login');
  };

  const isActive = (path) => {
    return router.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/admin/dashboard" className="text-xl font-bold text-gray-900">
                Fiscal Monitor - Админ
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/admin/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/admin/dashboard')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/state"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/admin/state')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  State
                </Link>
                <Link
                  href="/admin/registrations"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/admin/registrations')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Registrations
                </Link>
                <Link
                  href="/admin/tokens"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/admin/tokens')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Tokens
                </Link>
                <Link
                  href="/admin/telegram"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/admin/telegram')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Telegram
                </Link>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
