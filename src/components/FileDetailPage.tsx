import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  AlertCircle,
  Shield,
  FileText,
} from 'lucide-react';
import { Spinner } from '../app/components/ui/spinner';
import { cn } from '../lib/utils';
import { formatFileSize, formatDate, getFileIcon } from '../lib/utils';
import { useAuth } from '../lib/auth-context';
import { toast } from 'sonner';
import { adminFilesApi, userFilesApi, type ApiFile } from '../lib/api';

interface FileDetailPageProps {
  fileId: string;
  onBack: () => void;
}

const dOutline = "px-4 h-10 rounded-xl border border-slate-600/50 text-slate-300 text-sm hover:bg-slate-800/60 transition-all disabled:opacity-50 flex items-center gap-2";

const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl', className)}>{children}</div>
);
const GH = ({ children }: { children: React.ReactNode }) => <div className="px-6 pt-6 pb-3">{children}</div>;
const GC = ({ children }: { children: React.ReactNode }) => <div className="px-6 pb-6">{children}</div>;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:    'bg-slate-700/60 text-slate-300 border-slate-600/50',
    PROCESSING: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    SANITIZED:  'bg-green-500/20 text-green-300 border-green-500/30',
    ERROR:      'bg-red-500/20 text-red-300 border-red-500/30',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', map[status] || map.PENDING)}>
      {status}
    </span>
  );
}

function RiskBadge({ entityCount }: { entityCount: number | null }) {
  if (!entityCount) return <span className="text-xs text-slate-500">Low</span>;
  const risk = entityCount > 20 ? 'HIGH' : entityCount > 5 ? 'MEDIUM' : 'LOW';
  const cls = risk === 'HIGH' ? 'bg-red-500/20 text-red-300 border-red-500/30'
    : risk === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    : 'bg-green-500/20 text-green-300 border-green-500/30';
  return <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', cls)}>{risk}</span>;
}

export function FileDetailPage({ fileId, onBack }: FileDetailPageProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';
  const [file, setFile] = useState<ApiFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const fetcher = isAdmin ? adminFilesApi.get(fileId) : userFilesApi.get(fileId);
    fetcher
      .then(setFile)
      .catch(() => toast.error('Failed to load file details'))
      .finally(() => setLoading(false));
  }, [fileId, isAdmin]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!file) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-slate-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white">File not found</h2>
        <p className="text-slate-400 mt-2">The requested file does not exist.</p>
        <button onClick={onBack} className={cn(dOutline, 'mt-4 mx-auto')}>Go Back</button>
      </div>
    );
  }

  const entitiesByType = (file.entitiesByType || {}) as Record<string, number>;
  const entityData = Object.entries(entitiesByType).map(([type, count]) => ({
    type,
    count,
    pct: file.entityCount ? ((count / file.entityCount) * 100).toFixed(1) : '0',
  }));
  entityData.sort((a, b) => b.count - a.count);

  const handleDownloadSanitized = async () => {
    setDownloading('sanitized');
    try {
      if (isAdmin) await adminFilesApi.downloadSanitized(file.id, file.originalName);
      else await userFilesApi.downloadSanitized(file.id, file.originalName);
      toast.success('Download started');
    } catch { toast.error('Download failed'); }
    finally { setDownloading(null); }
  };

  const handleDownloadOriginal = async () => {
    setDownloading('original');
    try { await adminFilesApi.downloadOriginal(file.id, file.originalName); toast.success('Download started'); }
    catch { toast.error('Download failed'); }
    finally { setDownloading(null); }
  };

  const handleRescan = async () => {
    try { await adminFilesApi.rescan(file.id); toast.success('Rescan queued'); }
    catch { toast.error('Rescan failed'); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className={dOutline}><ArrowLeft className="w-4 h-4" /> Back</button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getFileIcon(file.mimeType)}</span>
            <div>
              <h1 className="text-2xl font-bold text-white">{file.originalName}</h1>
              <p className="text-sm text-slate-400">{formatFileSize(file.sizeBytes)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {file.status === 'SANITIZED' && (
            <>
              <button onClick={handleDownloadSanitized} disabled={downloading === 'sanitized'} className={cn(dOutline, 'text-green-400 border-green-500/30 hover:bg-green-500/10')}>
                {downloading === 'sanitized' ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />} Sanitized
              </button>
              {isAdmin && (
                <button onClick={handleDownloadOriginal} disabled={downloading === 'original'} className={cn(dOutline, 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10')}>
                  {downloading === 'original' ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />} Original
                </button>
              )}
            </>
          )}
          {isAdmin && (file.status === 'ERROR' || file.status === 'SANITIZED') && (
            <button onClick={handleRescan} className={cn(dOutline, 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10')}>
              <RefreshCw className="w-4 h-4" /> Re-scan
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard>
          <div className="p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</p>
            <StatusBadge status={file.status} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">PII Entities</p>
            <p className="text-2xl font-bold text-white">{file.entityCount ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">{Object.keys(entitiesByType).length} types detected</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Risk Score</p>
            <RiskBadge entityCount={file.entityCount} />
          </div>
        </GlassCard>
        {file.processingTimeMs && (
          <GlassCard>
            <div className="p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Processing Time</p>
              <p className="text-2xl font-bold text-white">{(file.processingTimeMs / 1000).toFixed(1)}s</p>
            </div>
          </GlassCard>
        )}
      </div>

      {/* File Info */}
      <GlassCard>
        <GH><h3 className="text-base font-semibold text-white">File Information</h3></GH>
        <GC>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Uploaded By</p>
              <p className="text-sm font-medium text-slate-200 mt-1">{file.uploader?.name || file.uploadedBy}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Upload Date</p>
              <p className="text-sm font-medium text-slate-200 mt-1">{formatDate(file.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">MIME Type</p>
              <p className="text-sm font-medium text-slate-200 mt-1">{file.mimeType}</p>
            </div>
            {file.sanitizedAt && (
              <div>
                <p className="text-xs text-slate-500">Sanitized At</p>
                <p className="text-sm font-medium text-slate-200 mt-1">{formatDate(file.sanitizedAt)}</p>
              </div>
            )}
          </div>
        </GC>
      </GlassCard>

      {/* Entity Analysis */}
      {entityData.length > 0 && (
        <GlassCard>
          <GH>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" /> PII Entity Analysis
            </h3>
          </GH>
          <GC>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-3 px-4 text-xs text-slate-500 uppercase tracking-wide">Entity Type</th>
                    <th className="text-left py-3 px-4 text-xs text-slate-500 uppercase tracking-wide">Count</th>
                    <th className="text-left py-3 px-4 text-xs text-slate-500 uppercase tracking-wide">Percentage</th>
                    <th className="text-left py-3 px-4 text-xs text-slate-500 uppercase tracking-wide">Masking</th>
                  </tr>
                </thead>
                <tbody>
                  {entityData.map((entity) => (
                    <tr key={entity.type} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {entity.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-medium">{entity.count}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-slate-800">
                            <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${entity.pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-400">{entity.pct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-slate-400">[{entity.type}]</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GC>
        </GlassCard>
      )}

      {/* Error state */}
      {file.status === 'ERROR' && (
        <GlassCard className="border-red-500/30">
          <div className="p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-red-300">Processing Error</h3>
              <p className="text-sm text-slate-400 mt-1">{file.lastError || 'An unknown error occurred during processing.'}</p>
              {isAdmin && (
                <button onClick={handleRescan} className={cn(dOutline, 'mt-3 text-amber-400 border-amber-500/30 hover:bg-amber-500/10')}>
                  <RefreshCw className="w-4 h-4" /> Retry Processing
                </button>
              )}
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
