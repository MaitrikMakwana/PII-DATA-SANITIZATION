import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, Bell, Eye, EyeOff, Save, Loader2, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { profileApi } from '../lib/api';
import { useAuth } from '../lib/auth-context';

// ── Design tokens (mirror admin theme) ────────────────────
const dInput = 'w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all';
const dLabel = 'text-sm font-medium text-slate-300 mb-1.5 block';
const dBtn   = 'flex items-center gap-2 px-4 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const dCard  = 'bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl';

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

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'security',      label: 'Security',      icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
] as const;
type TabId = typeof TABS[number]['id'];

// ── Profile Tab ───────────────────────────────────────────
function ProfileTab() {
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', role: '', createdAt: '' });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    profileApi.get()
      .then(u => {
        setForm({ name: u.name, email: u.email, role: u.role, createdAt: u.createdAt });
        setAvatarUrl(u.avatarUrl ?? null);
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
    <div className={`${dCard} p-6 animate-pulse`}>
      <div className="h-5 bg-slate-700/60 rounded-full w-1/4 mb-2" />
      <div className="h-3 bg-slate-700/40 rounded-full w-1/3 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-slate-700/50 rounded-full w-1/3" />
            <div className="h-10 bg-slate-800/60 rounded-xl border border-slate-600/30" />
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-6 pt-4 border-t border-slate-700/50">
        <div className="h-10 w-32 rounded-xl bg-slate-700/40" />
      </div>
    </div>
  );

  return (
    <div className={`${dCard} p-6`}>
      <h3 className="text-lg font-semibold text-slate-100 mb-1">Profile Information</h3>
      <p className="text-sm text-slate-500 mb-6">Update your display name and view account details.</p>

      {/* ── Avatar row ── */}
      <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-700/50">
        <div className="relative shrink-0">
          <div className="h-20 w-20 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            {avatarUrl
              ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              : <span className="text-white font-bold text-2xl">{form.name?.charAt(0).toUpperCase() || 'S'}</span>
            }
          </div>
          {uploading && (
            <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-slate-200">{form.name || 'Staff'}</p>
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
  );
}

// ── Security Tab ──────────────────────────────────────────
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
  );
}

// ── Notifications Tab ─────────────────────────────────────
function NotificationsTab() {
  const [prefs, setPrefs] = useState({ emailAlerts: true, uploadComplete: true, weeklyReport: false });
  const items: Array<{ key: keyof typeof prefs; label: string; desc: string }> = [
    { key: 'emailAlerts',    label: 'Email Alerts',       desc: 'Receive email notifications for important events' },
    { key: 'uploadComplete', label: 'File Ready Alerts',  desc: 'Get notified when your sanitized file is ready to download' },
    { key: 'weeklyReport',   label: 'Weekly Summary',     desc: 'Receive a weekly summary of your file activity' },
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

// ── Main ──────────────────────────────────────────────────
export function UserSettings() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const renderTab = () => {
    switch (activeTab) {
      case 'profile':       return <ProfileTab />;
      case 'security':      return <SecurityTab />;
      case 'notifications': return <NotificationsTab />;
    }
  };

  return (
    <div className="space-y-6 text-slate-200">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1 text-sm">Manage your account preferences.</p>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 p-1.5 bg-slate-900/60 border border-slate-700/50 rounded-2xl w-fit">
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

      {renderTab()}
    </div>
  );
}

