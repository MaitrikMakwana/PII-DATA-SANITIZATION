import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, FileText, Users, Settings, LogOut, Clock, CheckCircle2,
  XCircle, AlertTriangle, Upload, Download, ScrollText, Pause, Play, Trash2,
  RefreshCw, Search, UserPlus, Eye, EyeOff, Pencil, KeyRound, Copy, Check,
} from 'lucide-react';
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from '../app/components/ui/sidebar-custom';
import { Spinner } from '../app/components/ui/spinner';
import { NoiseBackground } from '../app/components/ui/noise-background';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { SettingsPage } from './SettingsPage';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth-context';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  statsApi, adminFilesApi, adminUsersApi, auditApi,
  type AdminStats, type ApiFile, type ApiUser, type ApiAuditLog,
} from '../lib/api';

const COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6366f1'];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function formatDate(iso: string) { return new Date(iso).toLocaleString(); }
function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Design tokens
const dInput = "w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all";
const dSelect = "bg-slate-800/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400/50 transition-all";
const dRow = "flex items-center justify-between p-4 bg-slate-800/40 border border-slate-700/30 rounded-xl hover:bg-slate-800/60 transition-colors";
const dGhost = "p-2 border border-slate-600/50 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all disabled:opacity-50";
const dOutline = "px-4 h-10 rounded-xl border border-slate-600/50 text-slate-300 text-sm hover:bg-slate-800/60 transition-all disabled:opacity-50 flex items-center gap-2";

// Glass card
const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl', className)}>
    {children}
  </div>
);
const GH = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('px-6 pt-6 pb-3', className)}>{children}</div>
);
const GC = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('px-6 pb-6', className)}>{children}</div>
);

// Action badge — different colour per action type
function ActionBadge({ action }: { action: string }) {
  const a = action.toLowerCase();
  let cls = 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  if (a.includes('login'))    cls = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  else if (a.includes('logout'))   cls = 'bg-orange-500/20 text-orange-300 border-orange-500/30';
  else if (a.includes('upload'))   cls = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
  else if (a.includes('download')) cls = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  else if (a.includes('delete'))   cls = 'bg-red-500/20 text-red-300 border-red-500/30';
  else if (a.includes('create') || a.includes('add')) cls = 'bg-violet-500/20 text-violet-300 border-violet-500/30';
  else if (a.includes('update') || a.includes('edit') || a.includes('reset')) cls = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
  else if (a.includes('scan') || a.includes('process') || a.includes('sanitiz')) cls = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
  else if (a.includes('rescan'))   cls = 'bg-pink-500/20 text-pink-300 border-pink-500/30';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

// Status badge
function StatusBadge({ status }: { status: ApiFile['status'] }) {
  const map: Record<ApiFile['status'], string> = {
    PENDING:    'bg-slate-700/60 text-slate-300 border-slate-600/50',
    PROCESSING: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    SANITIZED:  'bg-green-500/20 text-green-300 border-green-500/30',
    ERROR:      'bg-red-500/20 text-red-300 border-red-500/30',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', map[status])}>
      {status}
    </span>
  );
}

// Noise CTA button
function NoiseCta({ children, onClick, disabled, className }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string;
}) {
  return (
    <NoiseBackground
      containerClassName={cn('p-[2px] rounded-xl', className)}
      gradientColors={['rgb(99, 102, 241)', 'rgb(139, 92, 246)', 'rgb(168, 85, 247)']}
    >
      <button onClick={onClick} disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#070709] text-white text-sm font-semibold hover:bg-slate-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
        {children}
      </button>
    </NoiseBackground>
  );
}

// Modal primitives
const MOverlay = ({ children }: { children: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    {children}
  </div>
);
const MCard = ({ children, wide }: { children: React.ReactNode; wide?: boolean }) => (
  <div className={cn(
    'mx-4 bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden',
    wide ? 'w-full max-w-lg' : 'w-full max-w-md',
  )}>{children}</div>
);
const MHead = ({ children }: { children: React.ReactNode }) => <div className="px-8 pt-8 pb-4">{children}</div>;
const MBody = ({ children }: { children: React.ReactNode }) => <div className="px-8 pb-8">{children}</div>;

// Skeleton primitive
const Sk = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse bg-slate-800/70 rounded-xl', className)} />
);

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2"><Sk className="h-8 w-56" /><Sk className="h-4 w-40" /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between items-center"><Sk className="h-4 w-24" /><Sk className="h-9 w-9 rounded-xl" /></div>
            <Sk className="h-9 w-16" /><Sk className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 space-y-3">
            <Sk className="h-5 w-48" /><Sk className="h-4 w-36" /><Sk className="h-64 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 space-y-3">
            <Sk className="h-5 w-40" /><Sk className="h-4 w-32" />
            {Array.from({ length: 5 }).map((_, j) => <Sk key={j} className="h-14 w-full" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-slate-700/30">
          <Sk className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2"><Sk className="h-4 w-1/3" /><Sk className="h-3 w-1/2" /></div>
          <Sk className="h-6 w-20 rounded-full" />
          <Sk className="h-6 w-16 rounded-full" />
          <Sk className="h-8 w-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// DashboardView
function DashboardView() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsApi.get().then(setStats).catch(() => toast.error('Failed to load dashboard stats')).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!stats)  return <p className="text-slate-400 text-center py-20">Failed to load stats</p>;

  const pieData = stats.piiDetectionsByType.slice(0, 7).map((item, i) => ({
    name: item.type, value: item.count, color: COLORS[i % COLORS.length],
  }));

  const statCards = [
    { label: 'Total Files',  value: stats.totalFiles,                           icon: FileText,     grad: 'from-blue-500 to-cyan-500',    note: 'All uploaded files' },
    { label: 'Sanitized',    value: stats.sanitizedFiles,                       icon: CheckCircle2, grad: 'from-green-500 to-emerald-500', note: `${stats.totalFiles > 0 ? ((stats.sanitizedFiles/stats.totalFiles)*100).toFixed(0) : 0}% completion` },
    { label: 'Processing',   value: stats.processingFiles + stats.pendingFiles, icon: Clock,        grad: 'from-amber-500 to-orange-500',  note: `${stats.processingFiles} active, ${stats.pendingFiles} queued` },
    { label: 'Failed',       value: stats.failedFiles,                          icon: XCircle,      grad: 'from-red-500 to-rose-500',      note: 'Requires attention' },
  ];

  const ttStyle = { backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '12px', color: '#f1f5f9' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 mt-1">Monitor your PII sanitization operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map(({ label, value, icon: Icon, grad, note }) => (
          <GlassCard key={label}>
            <GH>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-400 font-medium">{label}</p>
                <div className={cn('h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', grad)}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white">{value}</div>
              <p className="text-xs text-slate-500 mt-1">{note}</p>
            </GH>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard>
          <GH>
            <h3 className="text-base font-semibold text-white">PII Detections by Type</h3>
            <p className="text-sm text-slate-400 mt-0.5">Aggregated across all sanitized files</p>
          </GH>
          <GC>
            {stats.piiDetectionsByType.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-16">No PII data yet</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.piiDetectionsByType.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="type" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-35} textAnchor="end" height={70} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={ttStyle} />
                    <Bar dataKey="count" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </GC>
        </GlassCard>

        <GlassCard>
          <GH>
            <h3 className="text-base font-semibold text-white">PII Distribution</h3>
            <p className="text-sm text-slate-400 mt-0.5">Entity type breakdown</p>
          </GH>
          <GC>
            {pieData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-16">No PII data yet</p>
            ) : (
              <div className="h-64"><ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={ttStyle} />
                </PieChart>
              </ResponsiveContainer></div>
            )}
          </GC>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard>
          <GH>
            <h3 className="text-base font-semibold text-white">Recent Activity</h3>
            <p className="text-sm text-slate-400 mt-0.5">Latest system events</p>
          </GH>
          <GC>
            {stats.recentActivity.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No activity yet</p>
            ) : (
              <div className="space-y-2">
                {stats.recentActivity.slice(0, 8).map((log) => (
                  <div key={log.id} className={dRow}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{log.user?.email ?? 'System'}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{log.file?.originalName ?? log.action}</p>
                    </div>
                    <div className="ml-3 text-right shrink-0">
                      <ActionBadge action={log.action} />
                      <p className="text-xs text-slate-500 mt-1">{formatRelative(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GC>
        </GlassCard>

        <GlassCard>
          <GH>
            <h3 className="text-base font-semibold text-white">High Risk Files</h3>
            <p className="text-sm text-slate-400 mt-0.5">Files with most PII detections</p>
          </GH>
          <GC>
            {stats.topRiskFiles.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No sanitized files yet</p>
            ) : (
              <div className="space-y-2">
                {stats.topRiskFiles.map((file) => (
                  <div key={file.id} className={cn(dRow, 'gap-3')}>
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{file.originalName}</p>
                      <p className="text-xs text-slate-500">{file.entityCount ?? 0} PII entities</p>
                    </div>
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                      file.riskScore === 'high' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                    )}>{file.riskScore.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </GC>
        </GlassCard>
      </div>
    </div>
  );
}

// FilesView
function FilesView() {
  const [files, setFiles] = useState<ApiFile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminFilesApi.list({ search: search || undefined, status: statusFilter || undefined, limit: 50 })
      .then(({ files: f, total: t }) => { setFiles(f); setTotal(t); })
      .catch(() => toast.error('Failed to load files'))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    let success = 0;
    for (const file of Array.from(e.target.files)) {
      const fd = new FormData();
      fd.append('file', file);
      try { await adminFilesApi.upload(fd); success++; }
      catch (err: unknown) { toast.error(`Failed: ${file.name} — ${err instanceof Error ? err.message : 'error'}`); }
    }
    if (success > 0) toast.success(`Uploaded ${success} file(s) — processing started`);
    e.target.value = '';
    setUploading(false);
    load();
  };

  const handleDelete = async (file: ApiFile) => {
    if (!confirm(`Delete "${file.originalName}"?`)) return;
    try { await adminFilesApi.delete(file.id); toast.success(`${file.originalName} deleted`); load(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Delete failed'); }
  };

  const handleRescan = async (file: ApiFile) => {
    try { await adminFilesApi.rescan(file.id); toast.success(`${file.originalName} re-queued`); load(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Rescan failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">File Management</h1>
          <p className="text-slate-400 mt-1">Upload and manage files for PII sanitization</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} disabled={loading} className={dGhost}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
          <NoiseCta onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            Upload Files
          </NoiseCta>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} className={cn(dInput, 'pl-9')} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={dSelect}>
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="SANITIZED">Sanitized</option>
          <option value="ERROR">Error</option>
        </select>
      </div>

      <GlassCard>
        <GH><h3 className="text-base font-semibold text-white">All Files ({total})</h3></GH>
        <GC>
          {loading ? (
            <TableSkeleton rows={6} />
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">No files yet</h3>
              <p className="text-slate-500 mb-6">Upload files to start PII detection</p>
              <NoiseCta onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload Files
              </NoiseCta>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className={cn(dRow, 'gap-3')}>
                  <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{file.originalName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatBytes(file.sizeBytes)} · {file.uploader?.email ?? file.uploadedBy} · {formatRelative(file.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {file.entityCount != null && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {file.entityCount} PII
                      </span>
                    )}
                    <StatusBadge status={file.status} />
                    {file.status === 'ERROR' && (
                      <button onClick={() => handleRescan(file)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-all">
                        <RefreshCw className="h-3 w-3" /> Rescan
                      </button>
                    )}
                    <button onClick={() => handleDelete(file)}
                      className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
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
}

// UsersView
function UsersView() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' });
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editUser, setEditUser] = useState<ApiUser | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'USER' });
  const [saving, setSaving] = useState(false);
  const [resetUser, setResetUser] = useState<ApiUser | null>(null);
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleteUser, setDeleteUser] = useState<ApiUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminUsersApi.list({ search: search || undefined })
      .then(({ users: u, total: t }) => { setUsers(u); setTotal(t); })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true);
    try {
      await adminUsersApi.create(form);
      toast.success(`User ${form.email} created — welcome email sent`);
      setForm({ name: '', email: '', password: '', role: 'USER' });
      setShowForm(false); load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to create user'); }
    finally { setCreating(false); }
  };

  const openEdit = (user: ApiUser) => { setEditUser(user); setEditForm({ name: user.name, email: user.email, role: user.role }); };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editUser) return; setSaving(true);
    try {
      const updated = await adminUsersApi.update(editUser.id, editForm);
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...updated } : u));
      toast.success(`${editForm.email} updated`); setEditUser(null);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to update user'); }
    finally { setSaving(false); }
  };

  const openReset = (user: ApiUser) => { setResetUser(user); setNewPassword(''); setShowNewPassword(true); setCopied(false); };

  const handleReset = async () => {
    if (!resetUser) return; setResetting(true);
    try {
      const res = await adminUsersApi.resetPassword(resetUser.id);
      setNewPassword(res.tempPassword); toast.success('Password reset');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to reset password'); setResetUser(null); }
    finally { setResetting(false); }
  };

  const handleCopy = () => navigator.clipboard.writeText(newPassword).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });

  const handleToggle = async (user: ApiUser) => {
    try {
      const updated = await adminUsersApi.toggleStatus(user.id);
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      toast.success(`${user.email} ${updated.isActive ? 'activated' : 'deactivated'}`);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to update user'); }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await adminUsersApi.delete(deleteUser.id);
      toast.success(`${deleteUser.email} deleted`);
      setDeleteUser(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const fLabel = "text-sm font-medium text-slate-300 mb-1.5 block";
  const pBtn = "flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-all";
  const cBtn = "px-5 h-11 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-all";

  return (
    <div className="space-y-6">

      {deleteUser && (
        <MOverlay>
          <MCard>
            <MHead>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Delete User</h2>
                  <p className="text-sm text-slate-400 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
            </MHead>
            <MBody>
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-slate-300">You are about to permanently delete:</p>
                  <p className="text-base font-semibold text-white mt-1">{deleteUser.name}</p>
                  <p className="text-sm text-slate-400">{deleteUser.email}</p>
                </div>
                <p className="text-sm text-slate-500">All files, activity logs, and data associated with this account will be removed.</p>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center justify-center gap-2 flex-1 h-11 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 font-semibold text-sm hover:bg-red-500/30 disabled:opacity-60 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />{deleting ? 'Deleting...' : 'Yes, Delete User'}
                  </button>
                  <button onClick={() => setDeleteUser(null)} className="px-5 h-11 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-all">Cancel</button>
                </div>
              </div>
            </MBody>
          </MCard>
        </MOverlay>
      )}

      {editUser && (
        <MOverlay>
          <MCard>
            <MHead>
              <h2 className="text-xl font-bold text-white">Edit User</h2>
              <p className="text-sm text-slate-400 mt-1">{editUser.email}</p>
            </MHead>
            <MBody>
              <form onSubmit={handleEdit} className="space-y-4">
                <div><label className={fLabel}>Full Name</label><input className={dInput} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required /></div>
                <div><label className={fLabel}>Email</label><input type="email" className={dInput} value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} required /></div>
                <div>
                  <label className={fLabel}>Role</label>
                  <select className={cn(dSelect, 'w-full')} value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
                    <option value="USER">User</option><option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className={pBtn}>{saving ? 'Saving...' : 'Save Changes'}</button>
                  <button type="button" onClick={() => setEditUser(null)} className={cBtn}>Cancel</button>
                </div>
              </form>
            </MBody>
          </MCard>
        </MOverlay>
      )}

      {resetUser && (
        <MOverlay>
          <MCard>
            <MHead>
              <h2 className="text-xl font-bold text-white">Reset Password</h2>
              <p className="text-sm text-slate-400 mt-1">{resetUser.name} — {resetUser.email}</p>
            </MHead>
            <MBody>
              {!newPassword ? (
                <div className="space-y-5">
                  <p className="text-sm text-slate-400">A new random password will be generated and emailed to the user.</p>
                  <div className="flex gap-3">
                    <button onClick={handleReset} disabled={resetting}
                      className="flex items-center gap-2 flex-1 h-11 justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-all">
                      <KeyRound className="h-4 w-4" />{resetting ? 'Resetting...' : 'Generate & Reset'}
                    </button>
                    <button onClick={() => setResetUser(null)} className={cBtn}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                    Password reset. A welcome email has been sent.
                  </div>
                  <div>
                    <label className={fLabel}>New Password</label>
                    <div className="relative">
                      <input readOnly value={showNewPassword ? newPassword : '\u2022'.repeat(newPassword.length)} className={cn(dInput, 'pr-20 font-mono')} />
                      <div className="absolute right-2 top-2 flex gap-1">
                        <button type="button" onClick={() => setShowNewPassword(v => !v)} className="p-1.5 text-slate-400 hover:text-slate-200">
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button type="button" onClick={handleCopy} className="p-1.5 text-slate-400 hover:text-slate-200">
                          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setResetUser(null)} className="w-full h-11 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-all">Done</button>
                </div>
              )}
            </MBody>
          </MCard>
        </MOverlay>
      )}

      {showForm && (
        <MOverlay>
          <MCard wide>
            <MHead>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Create New User</h2>
                  <p className="text-sm text-slate-400 mt-1">Fill in the details below.</p>
                </div>
                <button onClick={() => { setShowForm(false); setForm({ name: '', email: '', password: '', role: 'USER' }); }}
                  className="text-slate-500 hover:text-slate-200 transition-colors">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </MHead>
            <MBody>
              <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={fLabel}>Full Name</label><input placeholder="John Doe" className={dInput} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
                <div><label className={fLabel}>Email</label><input type="email" placeholder="john@example.com" className={dInput} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
                <div>
                  <label className={fLabel}>Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={8} className={cn(dInput, 'pr-10')} />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300" tabIndex={-1}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={fLabel}>Role</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={cn(dSelect, 'w-full')}>
                    <option value="USER">User</option><option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex gap-3 pt-2 border-t border-slate-700/50">
                  <button type="submit" disabled={creating} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-all">
                    {creating ? 'Creating...' : 'Create User'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setForm({ name: '', email: '', password: '', role: 'USER' }); }}
                    className="px-5 h-12 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-all">Cancel</button>
                </div>
              </form>
            </MBody>
          </MCard>
        </MOverlay>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff & Users</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage platform accounts, roles, and access control</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={load} disabled={loading} className={dGhost} title="Refresh">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <NoiseCta onClick={() => setShowForm(true)}>
            <UserPlus className="h-4 w-4" /> New User
          </NoiseCta>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Users',  value: total,                                    color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20'       },
          { label: 'Active',       value: users.filter(u => u.isActive).length,     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Admins',       value: users.filter(u => u.role === 'ADMIN').length, color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20'   },
          { label: 'Inactive',     value: users.filter(u => !u.isActive).length,    color: 'text-slate-400',   bg: 'bg-slate-700/30 border-slate-600/30'     },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search ─────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <input
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={cn(dInput, 'pl-9')}
        />
      </div>

      {/* ── User list ──────────────────────────────────────── */}
      <GlassCard>
        <GH>
          <h3 className="text-base font-semibold text-white">All Members</h3>
          <p className="text-sm text-slate-400 mt-0.5">{total} account{total !== 1 ? 's' : ''} total</p>
        </GH>
        <GC>
          {loading ? (
            <TableSkeleton rows={6} />
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-14 w-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                <Users className="h-7 w-7 text-slate-600" />
              </div>
              <p className="text-slate-500 text-sm">No users found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => {
                const isAdmin = user.role === 'ADMIN';
                const avatarGrad = isAdmin ? 'from-violet-500 to-purple-600' : 'from-cyan-500 to-blue-600';
                return (
                  <div key={user.id} className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 hover:bg-slate-800/60 transition-all">

                    {/* Avatar */}
                    <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white font-bold text-base shrink-0 shadow-lg`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-100">{user.name}</p>
                        {isAdmin ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">Admin</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">User</span>
                        )}
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
                          user.isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-700/60 text-slate-400 border-slate-600/50',
                        )}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', user.isActive ? 'bg-emerald-400' : 'bg-slate-500')} />
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{user.email}</p>
                      {user.createdAt && (
                        <p className="text-xs text-slate-600 mt-0.5">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(user)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600/50 text-slate-300 text-xs hover:bg-slate-700/60 hover:text-white transition-all"
                        title="Edit user"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => openReset(user)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/10 transition-all"
                        title="Reset password"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggle(user)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all',
                          user.isActive
                            ? 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10'
                            : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10',
                        )}
                      >
                        {user.isActive
                          ? <><Pause className="h-3.5 w-3.5" /> Suspend</>
                          : <><Play  className="h-3.5 w-3.5" /> Activate</>}
                      </button>
                      <button
                        onClick={() => setDeleteUser(user)}
                        className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete user"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GC>
      </GlassCard>
    </div>
  );
}

// AuditView
function AuditView() {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    auditApi.list({ page, limit: 20, action: actionFilter || undefined })
      .then(({ logs: l, total: t }) => { setLogs(l); setTotal(t); })
      .catch(() => toast.error('Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [page, actionFilter]);

  useEffect(() => { auditApi.actions().then(setActions).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await auditApi.exportCsv();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url); toast.success('Audit logs exported');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const pages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
          <p className="text-slate-400 mt-1">Complete audit trail of all platform activities</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} disabled={loading} className={dGhost}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></button>
          <button onClick={handleExport} disabled={exporting} className={dOutline}>
            <Download className="h-4 w-4" />{exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }} className={dSelect}>
        <option value="">All actions</option>
        {actions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
      </select>

      <GlassCard>
        <GH><h3 className="text-base font-semibold text-white">Events ({total})</h3></GH>
        <GC>
          {loading ? (
            <TableSkeleton rows={8} />
          ) : logs.length === 0 ? (
            <p className="text-center text-slate-500 py-12">No audit logs yet</p>
          ) : (
            <>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className={cn(dRow, 'gap-3')}>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(log.user?.email ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{log.user?.email ?? 'System'}</p>
                      <p className="text-xs text-slate-500">{log.ipAddress} &middot; {formatDate(log.createdAt)}</p>
                      {log.file && <p className="text-xs text-slate-600 truncate">File: {log.file.originalName}</p>}
                    </div>
                    <div className="ml-4 shrink-0">
                      <ActionBadge action={log.action} />
                    </div>
                  </div>
                ))}
              </div>
              {pages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className={dOutline}>Previous</button>
                  <span className="text-sm text-slate-400">Page {page} of {pages}</span>
                  <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className={dOutline}>Next</button>
                </div>
              )}
            </>
          )}
        </GC>
      </GlassCard>
    </div>
  );
}

// AdminDashboard shell
export function AdminDashboard() {
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');

  const links = [
    { label: 'Dashboard',  href: '#', icon: <LayoutDashboard className="h-5 w-5 shrink-0" />, onClick: () => setActiveView('dashboard') },
    { label: 'Files',      href: '#', icon: <FileText        className="h-5 w-5 shrink-0" />, onClick: () => setActiveView('files')     },
    { label: 'Users',      href: '#', icon: <Users           className="h-5 w-5 shrink-0" />, onClick: () => setActiveView('users')     },
    { label: 'Audit Logs', href: '#', icon: <ScrollText      className="h-5 w-5 shrink-0" />, onClick: () => setActiveView('audit')     },
    { label: 'Settings',   href: '#', icon: <Settings        className="h-5 w-5 shrink-0" />, onClick: () => setActiveView('settings')  },
  ];

  const LogoutButton = () => {
    const { open, animate } = useSidebar();
    return (
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); logout(); }}
        className={cn(
          'group/logout flex items-center py-3 rounded-xl transition-all duration-200 w-full border border-transparent',
          open || !animate ? 'gap-3 px-3' : 'justify-center px-1',
          'text-red-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-300'
        )}
      >
        <LogOut className="h-5 w-5 shrink-0" />
        <motion.span
          animate={{
            display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
          className="text-sm font-medium whitespace-nowrap overflow-hidden"
        >
          Logout
        </motion.span>
      </a>
    );
  };

  const Logo = () => (
    <a href="#" className="relative z-20 flex items-center space-x-2 py-1">
      <img src="/logo.png" alt="Pii Sanitize" className="h-10 w-10 shrink-0 object-contain" />
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-lg whitespace-pre text-white">
        Pii Sanitize
      </motion.span>
    </a>
  );

  const LogoIcon = () => (
    <a href="#" className="relative z-20 flex items-center justify-center py-1">
      <img src="/logo.png" alt="Pii Sanitize" className="h-10 w-10 shrink-0 object-contain" />
    </a>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView />;
      case 'files':     return <FilesView />;
      case 'users':     return <UsersView />;
      case 'audit':     return <AuditView />;
      case 'settings':  return <SettingsPage />;
      default:          return null;
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
                  active={
                    (link.label === 'Dashboard'  && activeView === 'dashboard') ||
                    (link.label === 'Files'      && activeView === 'files')     ||
                    (link.label === 'Users'      && activeView === 'users')     ||
                    (link.label === 'Audit Logs' && activeView === 'audit')     ||
                    (link.label === 'Settings'   && activeView === 'settings')
                  }
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <SidebarLink
              link={{
                label: user?.name ?? 'Admin',
                href: '#',
                icon: (
                  <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {user?.avatarUrl
                      ? <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                      : (user?.name ?? 'A').charAt(0).toUpperCase()
                    }
                  </div>
                ),
              }}
            />
            <LogoutButton />
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-10">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
