import React, { useState } from 'react';
import { Search, Download, Filter, Calendar } from 'lucide-react';
import { Button } from '../app/components/ui/button';
import { Input } from '../app/components/ui/input';
import { Card, CardContent } from '../app/components/ui/card';
import { Badge } from '../app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../app/components/ui/table';
import { mockAuditLogs } from '../lib/mock-data';
import { formatDate } from '../lib/utils';
import { toast } from 'sonner';

export function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredLogs = mockAuditLogs.filter((log) => {
    const matchesSearch =
      log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.fileName && log.fileName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const actions = Array.from(new Set(mockAuditLogs.map((log) => log.action)));

  const getActionBadgeColor = (action: string) => {
    const colors: Record<string, string> = {
      LOGIN: 'bg-blue-100 text-blue-700',
      UPLOAD: 'bg-green-100 text-green-700',
      DOWNLOAD_ORIGINAL: 'bg-purple-100 text-purple-700',
      DOWNLOAD_SANITIZED: 'bg-indigo-100 text-indigo-700',
      SCAN_COMPLETE: 'bg-emerald-100 text-emerald-700',
      ACCESS_DENIED: 'bg-red-100 text-red-700',
    };
    return colors[action] || 'bg-slate-100 text-slate-700';
  };

  const handleExport = () => {
    toast.success('Audit logs exported successfully');
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-600 mt-1">
            Complete audit trail of all platform activities
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by user, action, or file..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={actionFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setActionFilter('all')}
                size="sm"
              >
                All Actions
              </Button>
              {actions.slice(0, 5).map((action) => (
                <Button
                  key={action}
                  variant={actionFilter === action ? 'default' : 'outline'}
                  onClick={() => setActionFilter(action)}
                  size="sm"
                >
                  {action.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{mockAuditLogs.length}</div>
            <p className="text-sm text-slate-600 mt-1">Total Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">
              {mockAuditLogs.filter((l) => l.action === 'LOGIN').length}
            </div>
            <p className="text-sm text-slate-600 mt-1">Login Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">
              {mockAuditLogs.filter((l) => l.action.includes('DOWNLOAD')).length}
            </div>
            <p className="text-sm text-slate-600 mt-1">Downloads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">
              {mockAuditLogs.filter((l) => l.action === 'ACCESS_DENIED').length}
            </div>
            <p className="text-sm text-slate-600 mt-1">Access Denied</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>File</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <Filter className="w-12 h-12 opacity-20" />
                      <p>No audit logs found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50">
                    <TableCell className="text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatDate(log.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{log.userEmail}</p>
                        <p className="text-xs text-slate-500">ID: {log.userId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionBadgeColor(log.action)}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.fileName ? (
                        <div>
                          <p className="text-sm font-medium text-slate-900">{log.fileName}</p>
                          <p className="text-xs text-slate-500">ID: {log.fileId}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono text-xs">
                      {log.ipAddress}
                    </TableCell>
                    <TableCell>
                      {log.metadata ? (
                        <div className="text-xs text-slate-600">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span>{' '}
                              {String(value)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Filter className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">Audit Log Information</h3>
              <p className="text-sm text-blue-700 mt-1">
                All sensitive actions are logged for compliance and security monitoring. 
                Logs are immutable and retained for 90 days. Export logs regularly for 
                long-term archival and compliance reporting.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
