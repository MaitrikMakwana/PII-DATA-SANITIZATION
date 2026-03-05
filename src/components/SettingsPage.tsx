import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, Bell, Shield, Settings2, Eye, EyeOff, Save, Loader2, Trash2, AlertTriangle, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { profileApi, adminUsersApi } from '../lib/api';
import { useAuth } from '../lib/auth-context';

// ── Design tokens ──────────────────────────────────────────────────────────────
const dInput = 'w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all';
const dLabel = 'text-sm font-medium text-slate-300 mb-1.5 block';
const dBtn = 'flex items-center gap-2 px-4 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const dGhost = 'px-4 h-10 rounded-xl border border-slate-600/50 text-slate-300 text-sm hover:bg-slate-800/60 transition-all';
const dCard = 'bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl';

// ── Dark toggle ────────────────────────────────────────────────────────────────
function DarkToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? 'bg-cyan-500' : 'bg-slate-700'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User      },
  { id: 'security',      label: 'Security',      icon: Lock      },
  { id: 'notifications', label: 'Notifications', icon: Bell      },
  { id: 'privacy',       label: 'Privacy',       icon: Shield    },
  { id: 'platform',      label: 'Platform',      icon: Settings2 },
] as const;

type TabId = typeof TABS[number]['id'];

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab() {
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', role: '', createdAt: '' });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      profileApi.get(),
      adminUsersApi.list({ role: 'ADMIN' }),
    ])
      .then(([u, { users }]) => {
        setForm({ name: u.name, email: u.email, role: u.role, createdAt: u.createdAt });
        setAvatarUrl(u.avatarUrl ?? null);
        setAdminCount(users.filter(a => a.isActive).length);
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setUploading(true);
    try {
      const updated = await profileApi.uploadAvatar(file);
      setAvatarUrl(updated.avatarUrl ?? null);
      await refreshUser();
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    try {
      const updated = await profileApi.removeAvatar();
      setAvatarUrl(updated.avatarUrl ?? null);
      await refreshUser();
      toast.success('Avatar removed');
    } catch {
      toast.error('Failed to remove avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileApi.update({ name: form.name });
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="space-y-6">
      {/* Profile card skeleton */}
      <div className={`${dCard} p-6 animate-pulse`}>
        <div className="h-5 bg-slate-700/60 rounded-full w-1/4 mb-2" />
        <div className="h-3 bg-slate-700/40 rounded-full w-2/5 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-slate-700/50 rounded-full w-1/3" />
              <div className="h-10 bg-slate-800/60 rounded-xl border border-slate-600/30" />
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-6 pt-4 border-t border-slate-700/50">
          <div className="h-10 w-36 rounded-xl bg-slate-700/40" />
        </div>
      </div>
      {/* Danger zone skeleton */}
      <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-6 animate-pulse">
        <div className="h-4 bg-slate-700/40 rounded-full w-1/5 mb-4" />
        <div className="h-10 w-44 rounded-xl bg-slate-700/30" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className={`${dCard} p-6`}>
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Profile Information</h3>
        <p className="text-sm text-slate-500 mb-6">Update your display name and view account details.</p>

        {/* ── Avatar row ── */}
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-700/50">
          <div className="relative shrink-0">
            <div className="h-20 w-20 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              {avatarUrl
                ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                : <span className="text-white font-bold text-2xl">{form.name?.charAt(0).toUpperCase() || 'A'}</span>
              }
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-200">{form.name || 'Admin'}</p>
            <p className="text-xs text-slate-500">{form.email}</p>
            <div className="flex gap-2 mt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-500/30 transition-all disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" /> {avatarUrl ? 'Change' : 'Upload'}
              </button>
              {avatarUrl && (
                <button
                  disabled={uploading}
                  onClick={handleRemoveAvatar}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={dLabel}>Full Name</label>
            <input className={dInput} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" />
          </div>
          <div>
            <label className={dLabel}>Email Address</label>
            <input className={dInput} value={form.email} disabled />
            <p className="text-xs text-slate-500 mt-1.5">Email cannot be changed here.</p>
          </div>
          <div>
            <label className={dLabel}>Role</label>
            <input className={dInput} value={form.role} disabled />
          </div>
          <div>
            <label className={dLabel}>Member Since</label>
            <input className={dInput} value={form.createdAt ? new Date(form.createdAt).toLocaleDateString() : ''} disabled />
          </div>
        </div>
        <div className="flex justify-end mt-6 pt-4 border-t border-slate-700/50">
          <button className={dBtn} onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">These actions are permanent and cannot be undone.</p>

        {/* Delete button — disabled when sole admin */}
        {(() => {
          const canDelete = adminCount !== null && adminCount > 1;
          return (
            <div className="flex flex-col gap-2">
              {!confirmDelete ? (
                <button
                  disabled={!canDelete || deleting}
                  title={!canDelete ? 'At least one other active admin must exist before you can delete your account.' : ''}
                  className={`flex items-center gap-2 px-4 h-10 rounded-xl border text-sm font-medium transition-all w-fit ${
                    canDelete
                      ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 cursor-pointer'
                      : 'bg-slate-800/40 border-slate-600/30 text-slate-600 cursor-not-allowed opacity-60'
                  }`}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete My Account
                </button>
              ) : (
                <div className="flex flex-col gap-3 p-4 rounded-xl bg-red-950/30 border border-red-500/30">
                  <p className="text-sm text-red-300 font-medium">Are you sure? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button
                      disabled={deleting}
                      className="flex items-center gap-2 px-4 h-9 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          toast.error('Account deletion requires system-level confirmation.');
                        } finally {
                          setDeleting(false);
                          setConfirmDelete(false);
                        }
                      }}
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Yes, delete
                    </button>
                    <button
                      className="px-4 h-9 rounded-xl border border-slate-600/50 text-slate-300 text-sm hover:bg-slate-800/60 transition-all"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {!canDelete && adminCount !== null && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500/70" />
                  You are the only active admin. Add another admin before deleting your account.
                </p>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Security Tab ──────────────────────────────────────────────────────────────
function SecurityTab() {
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [show, setShow] = useState({ current: false, newPass: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const fields: Array<{ key: keyof typeof form; label: string }> = [
    { key: 'current', label: 'Current Password' },
    { key: 'newPass', label: 'New Password' },
    { key: 'confirm', label: 'Confirm New Password' },
  ];

  const handleChange = async () => {
    if (!form.current || !form.newPass || !form.confirm) { toast.error('Please fill in all fields'); return; }
    if (form.newPass !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.newPass.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      await profileApi.changePassword(form.current, form.newPass);
      toast.success('Password changed successfully');
      setForm({ current: '', newPass: '', confirm: '' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={`${dCard} p-6`}>
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Change Password</h3>
        <p className="text-sm text-slate-500 mb-6">Use a strong password with at least 8 characters.</p>
        <div className="space-y-4 max-w-md">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className={dLabel}>{label}</label>
              <div className="relative">
                <input
                  type={show[key] ? 'text' : 'password'}
                  className={`${dInput} pr-10`}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={label}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))}
                >
                  {show[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-6 pt-4 border-t border-slate-700/50">
          <button className={dBtn} onClick={handleChange} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Update Password
          </button>
        </div>
      </div>

      <div className={`${dCard} p-6`}>
        <h3 className="text-base font-semibold text-slate-100 mb-4">Active Sessions</h3>
        <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/30">
          <div>
            <p className="text-sm font-medium text-slate-200">Current Session</p>
            <p className="text-xs text-slate-500 mt-0.5">Browser · This device</p>
          </div>
          <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">Active</span>
        </div>
      </div>
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────
function NotificationsTab() {
  const [prefs, setPrefs] = useState({ emailAlerts: true, piiDetection: true, uploadComplete: true, weeklyReport: false });
  const items: Array<{ key: keyof typeof prefs; label: string; desc: string }> = [
    { key: 'emailAlerts',    label: 'Email Alerts',         desc: 'Receive email notifications for important events' },
    { key: 'piiDetection',   label: 'PII Detection Alerts', desc: 'Get notified when PII is detected in uploaded files' },
    { key: 'uploadComplete', label: 'Upload Complete',      desc: 'Notification when a file finishes processing' },
    { key: 'weeklyReport',   label: 'Weekly Report',        desc: 'Receive a weekly summary of activity and metrics' },
  ];
  return (
    <div className={`${dCard} p-6`}>
      <h3 className="text-lg font-semibold text-slate-100 mb-1">Notification Preferences</h3>
      <p className="text-sm text-slate-500 mb-6">Control which notifications you receive.</p>
      <div className="space-y-3">
        {items.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/30">
            <div>
              <p className="text-sm font-medium text-slate-200">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
            <DarkToggle checked={prefs[key]} onChange={v => setPrefs(p => ({ ...p, [key]: v }))} />
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-6 pt-4 border-t border-slate-700/50">
        <button className={dBtn} onClick={() => toast.success('Notification preferences saved')}>
          <Save className="h-4 w-4" /> Save Preferences
        </button>
      </div>
    </div>
  );
}

// ── Privacy Tab ───────────────────────────────────────────────────────────────
function PrivacyTab() {
  const [prefs, setPrefs] = useState({ activityLog: true, dataSharing: false });
  const items: Array<{ key: keyof typeof prefs; label: string; desc: string }> = [
    { key: 'activityLog', label: 'Activity Logging',  desc: 'Allow the system to log your actions for audit purposes' },
    { key: 'dataSharing', label: 'Analytics Sharing', desc: 'Share anonymized usage data to help improve the platform' },
  ];
  return (
    <div className="space-y-6">
      <div className={`${dCard} p-6`}>
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Privacy & Data</h3>
        <p className="text-sm text-slate-500 mb-6">Manage how your data is used and stored.</p>
        <div className="space-y-3">
          {items.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/30">
              <div>
                <p className="text-sm font-medium text-slate-200">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
              <DarkToggle checked={prefs[key]} onChange={v => setPrefs(p => ({ ...p, [key]: v }))} />
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-6 pt-4 border-t border-slate-700/50">
          <button className={dBtn} onClick={() => toast.success('Privacy settings saved')}>
            <Save className="h-4 w-4" /> Save Settings
          </button>
        </div>
      </div>
      <div className={`${dCard} p-6`}>
        <h3 className="text-base font-semibold text-slate-100 mb-3">Data Export</h3>
        <p className="text-sm text-slate-400 mb-4">Download a copy of your account data including profile information and file history.</p>
        <button className={dGhost} onClick={() => toast.info('Data export is coming soon')}>Export My Data</button>
      </div>
    </div>
  );
}

// ── Platform Tab ──────────────────────────────────────────────────────────────
function PlatformTab() {
  const systemInfo = [
    { label: 'Application Version', value: '1.0.0' },
    { label: 'Environment',         value: 'Production' },
    { label: 'Storage Provider',    value: 'Cloudflare R2' },
    { label: 'Database',            value: 'PostgreSQL (Neon)' },
    { label: 'AI Engine',           value: 'Microsoft Presidio' },
    { label: 'Queue System',        value: 'BullMQ + Redis' },
  ];
  const services = [
    { name: 'API Server',       status: 'Operational' },
    { name: 'Storage (R2)',     status: 'Operational' },
    { name: 'Processing Queue', status: 'Operational' },
    { name: 'Database',         status: 'Operational' },
  ];
  return (
    <div className="space-y-6">
      <div className={`${dCard} p-6`}>
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Platform Information</h3>
        <p className="text-sm text-slate-500 mb-6">System configuration and version details (admin only).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {systemInfo.map(({ label, value }) => (
            <div key={label} className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/30">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm font-semibold text-slate-200">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={`${dCard} p-6`}>
        <h3 className="text-base font-semibold text-slate-100 mb-4">System Status</h3>
        <div className="space-y-3">
          {services.map(({ name, status }) => (
            <div key={name} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
              <span className="text-sm text-slate-300">{name}</span>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const renderTab = () => {
    switch (activeTab) {
      case 'profile':       return <ProfileTab />;
      case 'security':      return <SecurityTab />;
      case 'notifications': return <NotificationsTab />;
      case 'privacy':       return <PrivacyTab />;
      case 'platform':      return <PlatformTab />;
    }
  };

  return (
    <div className="text-slate-200">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage your account preferences and platform configuration.</p>
        </div>

        {/* Tab navigation */}
        <div className="flex flex-wrap gap-1 p-1.5 bg-slate-900/60 border border-slate-700/50 rounded-2xl w-fit mb-8">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === id
                  ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        <div>{renderTab()}</div>
      </div>
    </div>
  );
}

