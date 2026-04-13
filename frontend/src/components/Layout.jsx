import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, FileText, Users, Building2, UserCheck,
  Settings, LogOut, Menu, X, ChevronLeft, Briefcase, Clock, CalendarDays, TrendingUp, BarChart2, Plus, ClipboardCheck, Award
} from 'lucide-react';

const navItems = [
  { path: '/dashboard',       label: 'لوحة التحكم',   icon: LayoutDashboard, roles: ['admin', 'employee', 'partner'] },
  { path: '/requests',        label: 'الطلبات',       icon: FileText,        roles: ['admin', 'employee', 'partner'] },
  { path: '/commissions',     label: 'عمولاتي',        icon: Award,           roles: ['partner'] },
  { path: '/attendance',      label: 'الحضور',         icon: Clock,           roles: ['employee'] },
  { path: '/attendance-admin',label: 'سجل الحضور',   icon: CalendarDays,    roles: ['admin'] },
  { path: '/performance',     label: 'تحليل الأداء',  icon: TrendingUp,      roles: ['admin'] },
  { path: '/reports',         label: 'التقارير',        icon: BarChart2,       roles: ['admin'] },
  { path: '/eligibility',     label: 'أهلية المنشأة',  icon: ClipboardCheck,  roles: ['admin', 'employee', 'partner'] },
  { path: '/brokers',         label: 'الوسطاء',        icon: UserCheck,       roles: ['admin', 'employee'] },
  { path: '/companies',       label: 'جهات التمويل', icon: Building2,       roles: ['admin'] },
  { path: '/users',           label: 'المستخدمون',   icon: Users,           roles: ['admin'] },
  { path: '/settings',        label: 'الإعدادات',      icon: Settings,        roles: ['admin'] },
];

export default function Layout({ children }) {
  const { user, logout, authFetch } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const canCreateRequest = ['admin', 'employee', 'partner'].includes(user?.role);
  const [missingCount, setMissingCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingUsers, setPendingUsers] = useState(0);
  const [newUserToast, setNewUserToast] = useState(false);
  const prevPendingRef = React.useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };
  const handleNewRequest = () => { navigate('/requests?new=1'); };

  useEffect(() => {
    const isStaff = ['employee', 'partner'].includes(user?.role);
    if (!isStaff) {
      setMissingCount(0);
      return;
    }

    let mounted = true;
    const loadMissingCount = async () => {
      try {
        const res = await authFetch('/api/requests');
        const data = res.ok ? await res.json() : [];
        if (!mounted) return;
        const count = Array.isArray(data) ? data.filter(r => r.status === 'missing').length : 0;
        setMissingCount(count);
      } catch (_) {
        if (mounted) setMissingCount(0);
      }
    };

    loadMissingCount();
    const timer = setInterval(loadMissingCount, 30000);
    return () => { mounted = false; clearInterval(timer); };
  }, [user?.role, location.pathname]);

  // Badge: رسائل غير مقروءة (للجميع)
  useEffect(() => {
    let mounted = true;
    const loadUnread = async () => {
      try {
        const res = await authFetch('/api/requests/messages/unread-count');
        if (res.ok && mounted) {
          const data = await res.json();
          setUnreadMessages(data.count || 0);
        }
      } catch (_) {}
    };
    loadUnread();
    const t = setInterval(loadUnread, 20000);
    return () => { mounted = false; clearInterval(t); };
  }, [location.pathname]);

  // Badge: مستخدمون بانتظار الموافقة (للأدمن فقط)
  useEffect(() => {
    if (user?.role !== 'admin') return;
    let mounted = true;
    const loadPending = async () => {
      try {
        const res = await authFetch('/api/admin/users/pending-count');
        if (res.ok && mounted) {
          const data = await res.json();
          const newCount = data.count || 0;
          setPendingUsers(prev => {
            // إذا زاد العدد أظهر إشعاراً
            if (prevPendingRef.current !== null && newCount > prevPendingRef.current) {
              setNewUserToast(true);
              setTimeout(() => setNewUserToast(false), 6000);
            }
            prevPendingRef.current = newCount;
            return newCount;
          });
        }
      } catch (_) {}
    };
    loadPending();
    const t = setInterval(loadPending, 15000);
    return () => { mounted = false; clearInterval(t); };
  }, [user?.role, location.pathname]);

  const allowed = navItems.filter(n => n.roles.includes(user?.role));

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full ${mobile ? '' : ''}`}>
      {/* الشعار */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="select-none flex-shrink-0">
          <img src="/logo.svg" alt="JenanBiz" style={{ height: 54, filter: 'brightness(0) invert(1)' }} />
        </div>
        <div className="mr-1">
          <div className="text-white/70 text-xs">مرحباً،</div>
          <div className="text-white font-semibold text-sm truncate max-w-[130px]">{user?.name}</div>
          <div className="text-sky-300 text-xs">{user?.role === 'admin' ? 'مدير' : user?.role === 'employee' ? 'موظف' : 'شريك'}</div>
        </div>
      </div>

      {/* القائمة */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {allowed.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.path === '/requests' && missingCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                  {missingCount}
                </span>
              )}
              {item.path === '/requests' && unreadMessages > 0 && (
                <span className="min-w-[18px] h-4.5 px-1 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center ml-1" title="رسائل غير مقروءة">
                  {unreadMessages}
                </span>
              )}
              {item.path === '/users' && pendingUsers > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-yellow-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse" title="بانتظار الموافقة">
                  {pendingUsers}
                </span>
              )}
              {active && <ChevronLeft size={14} className="mr-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50" dir="rtl">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:w-64 flex-col flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #0d1b35 0%, #1e3a8a 100%)' }}>
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-64 z-50"
            style={{ background: 'linear-gradient(180deg, #0d1b35 0%, #1e3a8a 100%)' }}>
            <Sidebar mobile />
            <button onClick={() => setOpen(false)} className="absolute top-4 left-4 text-white/60 hover:text-white">
              <X size={20} />
            </button>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setOpen(true)} className="text-gray-600">
            <Menu size={22} />
          </button>
          <img src="/logo.svg" alt="JenanBiz" style={{ height: 36 }} />
          <div className="flex items-center gap-2" dir="ltr">
            {canCreateRequest && (
              <button
                onClick={handleNewRequest}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                <Plus size={13} />
                <span>طلب جديد</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold hover:bg-red-100"
            >
              <LogOut size={13} />
              <span>خروج</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="hidden lg:flex items-center mb-4">
            <div className="mr-auto flex items-center gap-2" dir="ltr">
              {canCreateRequest && (
                <button
                  onClick={handleNewRequest}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm"
                >
                  <Plus size={15} />
                  <span>رفع طلب جديد</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold hover:bg-red-100"
              >
                <LogOut size={15} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
          {children}
        </main>
      </div>

      {/* Toast إشعار مستخدم جديد */}
      {newUserToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl cursor-pointer"
          style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)', minWidth: 280 }}
          onClick={() => { setNewUserToast(false); navigate('/users'); }}
          dir="rtl"
        >
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">طلب تسجيل جديد</div>
            <div className="text-blue-200 text-xs mt-0.5">يوجد مستخدم بانتظار موافقتك — اضغط للمراجعة</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setNewUserToast(false); }} className="mr-auto text-white/60 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
