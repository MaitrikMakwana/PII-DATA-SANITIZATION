import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, LogOut, Settings, LayoutDashboard, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Sidebar, SidebarBody, SidebarLink } from '../app/components/ui/sidebar-custom';
import { Spinner } from '../app/components/ui/spinner';
import { formatRelativeTime, formatFileSize, getFileIcon } from '../lib/utils';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth-context';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { UserSettings } from './UserSettings';
import { userFilesApi, type ApiFile } from '../lib/api';

export function UserDashboard() {
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [files, setFiles] = useState<ApiFile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    userFilesApi.list()
      .then(({ files: f }) => setFiles(f))
      .catch(() => toast.error('Failed to load files'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const sanitizedFiles = files.filter(f => f.status === 'SANITIZED');

  const handleDownload = async (file: ApiFile) => {
    toast.info(`Preparing download for "${file.originalName}"...`);
  };

  const links = [
    {
      label: 'Dashboard',
      href: '#',
      icon: <LayoutDashboard className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveView('dashboard'),
    },
    {
      label: 'Files',
      href: '#',
      icon: <FileText className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveView('files'),
    },
    {
      label: 'Settings',
      href: '#',
      icon: <Settings className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveView('settings'),
    },
  ];

  const Logo = () => (
    <a href="#" className="relative z-20 flex items-center space-x-2 py-1">
      <img src="/logo.png" alt="Pii Sanitize" className="h-10 w-10 shrink-0 object-contain" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-bold text-lg whitespace-pre text-white"
      >
        Pii Sanitize
      </motion.span>
    </a>
  );

  const LogoIcon = () => (
    <a href="#" className="relative z-20 flex items-center justify-center py-1">
      <img src="/logo.png" alt="Pii Sanitize" className="h-10 w-10 shrink-0 object-contain" />
    </a>
  );

  const recentCount = sanitizedFiles.filter((f) => {
    const date = new Date(f.sanitizedAt || f.createdAt);
    const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  }).length;

  /* ── shared dark-glass helpers ─────────────────── */
  const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={cn('bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl', className)}>{children}</div>
  );
  const GH = ({ children }: { children: React.ReactNode }) => (
    <div className="px-6 py-4 border-b border-slate-700/50">{children}</div>
  );
  const GC = ({ children }: { children: React.ReactNode }) => (
    <div className="p-6">{children}</div>
  );

  /* ── skeleton ──────────────────────────────────── */
  const Skeleton = ({ rows = 5 }: { rows?: number }) => (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 animate-pulse">
          <div className="h-10 w-10 rounded-xl bg-slate-700/60 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-700/60 rounded-full w-1/3" />
            <div className="h-2 bg-slate-700/40 rounded-full w-1/2" />
          </div>
          <div className="h-8 w-24 rounded-lg bg-slate-700/40" />
        </div>
      ))}
    </div>
  );

  const StatSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-2xl border border-slate-700/40 bg-slate-800/30 p-5 animate-pulse flex items-center gap-4">
          <div className="h-9 w-9 rounded-xl bg-slate-700/60 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 bg-slate-700/50 rounded-full w-2/3" />
            <div className="h-7 bg-slate-700/60 rounded-lg w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Staff Dashboard</h1>
                <p className="text-slate-400 mt-1 text-sm">Access your sanitized files and data</p>
              </div>
              <button onClick={load} disabled={loading}
                className="px-3 h-9 rounded-xl border border-slate-600/50 text-slate-300 text-sm hover:bg-slate-800/60 transition-all flex items-center gap-2">
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </button>
            </div>

            {/* Stats */}
            {loading ? <StatSkeleton /> : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Available Files',  value: sanitizedFiles.length,                                                 color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 className="h-5 w-5" /> },
                  { label: 'Total PII Removed', value: sanitizedFiles.reduce((s, f) => s + (f.entityCount ?? 0), 0),        color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20',       icon: <ShieldCheck className="h-5 w-5" /> },
                  { label: 'Recent Files',      value: recentCount,                                                          color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20',   icon: <FileText className="h-5 w-5" /> },
                ].map(s => (
                  <div key={s.label} className={`rounded-2xl border p-5 flex items-center gap-4 ${s.bg}`}>
                    <div className={`${s.color} opacity-80`}>{s.icon}</div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info banner */}
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-cyan-300">Sanitized Files Only</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  As a staff member you have access to sanitized versions only. All PII has been automatically detected and removed to ensure safe data sharing.
                </p>
              </div>
            </div>

            {/* Recent files */}
            <GlassCard>
              <GH>
                <h3 className="text-base font-semibold text-white">Recent Sanitized Files</h3>
                <p className="text-sm text-slate-400 mt-0.5">Your latest available files</p>
              </GH>
              <GC>
                {loading ? <Skeleton rows={4} /> : sanitizedFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                      <FileText className="h-7 w-7 text-slate-600" />
                    </div>
                    <p className="text-slate-500 text-sm">No files available yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sanitizedFiles.slice(0, 5).map((file) => (
                      <div key={file.id} className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 hover:bg-slate-800/60 transition-all">
                        <span className="text-2xl shrink-0">{getFileIcon(file.mimeType)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{file.originalName}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-slate-500">{formatFileSize(file.sizeBytes)}</span>
                            <span className="text-slate-700">•</span>
                            <span className="text-xs text-slate-500">{formatRelativeTime(file.sanitizedAt || file.createdAt)}</span>
                            {(file.entityCount ?? 0) > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                {file.entityCount} PII removed
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleDownload(file)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-medium hover:opacity-90 transition-all">
                            <Download className="h-3.5 w-3.5" /> Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GC>
            </GlassCard>
          </div>
        );

      case 'files':
        return (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">My Files</h1>
                <p className="text-slate-400 mt-1 text-sm">Download your sanitized documents</p>
              </div>
              <button onClick={load} disabled={loading}
                className="px-3 h-9 rounded-xl border border-slate-600/50 text-slate-300 text-sm hover:bg-slate-800/60 transition-all flex items-center gap-2">
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </button>
            </div>

            <GlassCard>
              <GH>
                <h3 className="text-base font-semibold text-white">All Files</h3>
                <p className="text-sm text-slate-400 mt-0.5">{sanitizedFiles.length} file{sanitizedFiles.length !== 1 ? 's' : ''} available</p>
              </GH>
              <GC>
                {loading ? <Skeleton rows={6} /> : sanitizedFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                      <FileText className="h-7 w-7 text-slate-600" />
                    </div>
                    <p className="text-slate-500 text-sm">No sanitized files yet</p>
                    <p className="text-slate-600 text-xs max-w-xs text-center">Files will appear here once an administrator processes and sanitizes them.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sanitizedFiles.map((file) => (
                      <div key={file.id} className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 hover:bg-slate-800/60 transition-all">
                        <span className="text-2xl shrink-0">{getFileIcon(file.mimeType)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{file.originalName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatFileSize(file.sizeBytes)} • {formatRelativeTime(file.sanitizedAt || file.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleDownload(file)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-medium hover:opacity-90 transition-all">
                            <Download className="h-3.5 w-3.5" /> Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GC>
            </GlassCard>
          </div>
        );

      case 'settings':
        return <UserSettings />;

      default:
        return null;
    }
  };

  return (
    <div className="flex w-full h-screen overflow-hidden bg-[#060d1a]">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink
                  key={idx}
                  link={link}
                  active={link.label.toLowerCase() === activeView}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <SidebarLink
              link={{
                label: user?.name || 'Staff User',
                href: '#',
                icon: (
                  <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {user?.avatarUrl
                      ? <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                      : (user?.name?.charAt(0).toUpperCase() || 'S')
                    }
                  </div>
                ),
              }}
            />
            <button
              onClick={(e) => { e.preventDefault(); logout(); }}
              className={cn(
                'flex items-center py-3 rounded-xl transition-all duration-200 w-full border border-transparent',
                'text-red-400 hover:bg-red-500/10 hover:border-red-500/20',
                open ? 'gap-3 px-3' : 'justify-center px-1',
              )}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {open && <span className="text-sm font-medium whitespace-pre">Logout</span>}
            </button>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 md:p-10">
          {loading && activeView !== 'settings' ? (
            <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
          ) : renderContent()}
        </div>
      </div>
    </div>
  );
}
