import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, FileText, Users, Building2, UserCheck,
  Settings, LogOut, Menu, X, ChevronLeft, Briefcase, Clock, CalendarDays, TrendingUp, BarChart2, Plus, ClipboardCheck, Award, Bell, Store, CheckCheck, Trash2
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
  { path: '/establishments',  label: 'المنشآت',        icon: Store,           roles: ['admin'] },
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
  const [notifications, setNotifications] = React.useState([]);
  const [unreadNotif, setUnreadNotif] = React.useState(0);
  const [showNotifPanel, setShowNotifPanel] = React.useState(false);
  const [newNotifToast, setNewNotifToast] = React.useState(null);
  const [expandedNotifId, setExpandedNotifId] = React.useState(null);
  const [notifPanelStyle, setNotifPanelStyle] = React.useState({ top: 70, right: 16 });
  const notifRef = React.useRef(null);
  const prevUnreadRef = React.useRef(null);

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

  // Notifications polling
  React.useEffect(() => {
    let mounted = true;
    const loadNotifs = async () => {
      try {
        const res = await authFetch('/api/notifications');
        if (res.ok && mounted) {
          const data = await res.json();
          const arr = Array.isArray(data) ? data : [];
          const unread = arr.filter(n => !n.is_read).length;
          // إظهار toast عند وصول تنبيه جديد
          if (prevUnreadRef.current !== null && unread > prevUnreadRef.current) {
            const newest = arr.find(n => !n.is_read);
            if (newest) {
              setNewNotifToast(newest);
              setTimeout(() => setNewNotifToast(null), 6000);
            }
          }
          prevUnreadRef.current = unread;
          setNotifications(arr);
          setUnreadNotif(unread);
        }
      } catch (_) {}
    };
    loadNotifs();
    const t = setInterval(loadNotifs, 15000);
    return () => { mounted = false; clearInterval(t); };
  }, [location.pathname]);

  // Close notif panel on outside click
  React.useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifPanel(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await authFetch('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications(n => n.map(x => ({ ...x, is_read: true })));
      setUnreadNotif(0);
    } catch (_) {}
  };

  const markRead = async (id) => {
    try {
      await authFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
      setUnreadNotif(prev => Math.max(0, prev - 1));
    } catch (_) {}
  };

  const deleteNotif = async (id) => {
    try {
      await authFetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications(n => n.filter(x => x.id !== id));
      setUnreadNotif(prev => {
        const was = notifications.find(x => x.id === id);
        return was && !was.is_read ? Math.max(0, prev - 1) : prev;
      });
    } catch (_) {}
  };

  const toggleNotifPanel = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const isMobile = window.innerWidth < 1024;
    setNotifPanelStyle({
      top: rect.bottom + 10,
      right: isMobile ? 16 : Math.max(16, window.innerWidth - rect.right),
    });
    setShowNotifPanel(prev => !prev);
  };

  const openNotification = async (notif) => {
    if (!notif.is_read) await markRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
      setShowNotifPanel(false);
      return;
    }
    setExpandedNotifId(prev => prev === notif.id ? null : notif.id);
  };

  const notifTypeIcon = (type) => {
    switch(type) {
      case 'message': return '💬';
      case 'update':  return '🔄';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      default:        return '🔔';
    }
  };

  const allowed = navItems.filter(n => n.roles.includes(user?.role));

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full ${mobile ? '' : ''}`}>
      {/* الشعار */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="select-none flex-shrink-0" style={{ lineHeight: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <span style={{ color: 'white', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 'bold', fontSize: 30 }}>J</span>
            <span style={{ color: 'white', fontFamily: 'Georgia, serif', fontWeight: 'bold', fontSize: 17 }}>enan</span>
          </div>
          <div style={{ color: '#60a5fa', fontFamily: 'Georgia, serif', fontWeight: 'bold', fontStyle: 'italic', fontSize: 14, textAlign: 'center' }}>BIZ</div>
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 1, lineHeight: 1 }}>
            <span style={{ color: '#1a1a2e', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 'bold', fontSize: 26 }}>J</span>
            <span style={{ color: '#1a1a2e', fontFamily: 'Georgia, serif', fontWeight: 'bold', fontSize: 15 }}>enan</span>
            <span style={{ color: '#4a6cf5', fontFamily: 'Georgia, serif', fontWeight: 'bold', fontStyle: 'italic', fontSize: 13 }}>BIZ</span>
          </div>
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
            <div className="relative">
              <button
                onClick={toggleNotifPanel}
                className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
              >
                <Bell size={16} />
                {unreadNotif > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                    {unreadNotif > 9 ? '9+' : unreadNotif}
                  </span>
                )}
              </button>
            </div>
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
              <div className="relative">
                <button
                  onClick={toggleNotifPanel}
                  className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
                  title="التنبيهات"
                >
                  <Bell size={18} />
                  {unreadNotif > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                      {unreadNotif > 9 ? '9+' : unreadNotif}
                    </span>
                  )}
                </button>
              </div>
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

      {/* Notification Bell Panel */}
      {showNotifPanel && (
        <div
          ref={notifRef}
          className="fixed z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          style={{ maxHeight: '80vh', top: notifPanelStyle.top, right: notifPanelStyle.right }}
          dir="rtl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #0d1b35, #1e3a8a)' }}>
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-white" />
              <span className="text-white font-bold text-sm">التنبيهات</span>
              {unreadNotif > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{unreadNotif}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadNotif > 0 && (
                <button onClick={markAllRead} title="تحديد الكل كمقروء" className="text-blue-200 hover:text-white transition-colors">
                  <CheckCheck size={16} />
                </button>
              )}
              <button onClick={() => setShowNotifPanel(false)} className="text-white/60 hover:text-white"><X size={16} /></button>
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Bell size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد تنبيهات</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={n.is_read ? "flex items-start gap-3 px-4 py-3 border-b border-gray-100 transition-colors hover:bg-gray-50" : "flex items-start gap-3 px-4 py-3 border-b border-gray-100 bg-blue-50/60 transition-colors hover:bg-blue-100/50"}
                  onClick={() => openNotification(n)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base bg-gray-100">
                    {notifTypeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                    {n.body && <p className={`text-xs text-gray-400 mt-0.5 ${expandedNotifId === n.id ? '' : 'line-clamp-2'}`}>{n.body}</p>}
                    <p className="text-[10px] text-gray-300 mt-1">{new Date(n.created_at).toLocaleString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {n.link && <span className="text-[11px] font-semibold text-blue-600">عرض التفاصيل</span>}
                      {!n.link && n.body && <span className="text-[11px] font-semibold text-blue-600">{expandedNotifId === n.id ? 'إخفاء التفاصيل' : 'إظهار التفاصيل'}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    <button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }} className="text-gray-300 hover:text-red-400 transition-colors mt-1">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Toast تنبيه جديد */}
      {newNotifToast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-4 rounded-2xl shadow-2xl cursor-pointer animate-bounce-once"
          style={{ background: 'linear-gradient(135deg, #0d1b35, #1e3a8a)', minWidth: 280, maxWidth: 340 }}
          onClick={() => { setNewNotifToast(null); setShowNotifPanel(true); }}
          dir="rtl"
        >
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-lg">
            {notifTypeIcon(newNotifToast.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm">تنبيه جديد</div>
            <div className="text-blue-200 text-xs mt-0.5 truncate">{newNotifToast.title}</div>
            {newNotifToast.body && <div className="text-blue-300 text-[11px] mt-0.5 line-clamp-1">{newNotifToast.body}</div>}
          </div>
          <button onClick={(e) => { e.stopPropagation(); setNewNotifToast(null); }} className="text-white/60 hover:text-white flex-shrink-0">
            <X size={15} />
          </button>
        </div>
      )}

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
