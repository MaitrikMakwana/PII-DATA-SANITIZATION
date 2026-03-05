import React, { useState } from 'react';
import { 
  Shield,
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  LogOut,
  Mail,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Upload,
  ChevronRight,
  Download,
  ScrollText,
  Pause,
  Play,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../app/components/ui/card';
import { Badge } from '../app/components/ui/badge';
import { Input } from '../app/components/ui/input';
import { Label } from '../app/components/ui/label';
import { Button } from '../app/components/ui/button';
import { Sidebar, SidebarBody, SidebarLink } from '../app/components/ui/sidebar-custom';
import { ActionButton } from '../app/components/shared/ActionButton';
import { Spinner } from '../app/components/ui/spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { mockDashboardStats, mockFiles } from '../lib/mock-data';
import { SettingsPage } from './SettingsPage';
import { formatRelativeTime, getStatusColor, cn } from '../lib/utils';
import { useAuth } from '../lib/auth-context';
import { motion } from 'motion/react';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];

type FileStatus = 'uploading' | 'processing' | 'scanning' | 'completed' | 'failed';

interface FileQueueItem {
  id: string;
  name: string;
  size: number;
  status: FileStatus;
  progress: number;
}

export function AdminDashboard() {
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [staffUsers, setStaffUsers] = useState([
    { id: '1', email: 'john.doe@company.com', name: 'John Doe', status: 'active', createdAt: '2024-01-15' },
    { id: '2', email: 'jane.smith@company.com', name: 'Jane Smith', status: 'active', createdAt: '2024-02-20' },
    { id: '3', email: 'mike.wilson@company.com', name: 'Mike Wilson', status: 'paused', createdAt: '2024-03-01' },
  ]);
  
  const stats = mockDashboardStats;

  const pieData = stats.piiDetectionsByType.map((item, index) => ({
    name: item.type,
    value: item.count,
    color: COLORS[index % COLORS.length],
  }));

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
      label: 'Users',
      href: '#',
      icon: <Users className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveView('users'),
    },
    {
      label: 'Audit Logs',
      href: '#',
      icon: <ScrollText className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveView('audit'),
    },
    {
      label: 'Settings',
      href: '#',
      icon: <Settings className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveView('settings'),
    },
    {
      label: 'Logout',
      href: '#',
      icon: <LogOut className="h-5 w-5 shrink-0" />,
      onClick: () => logout(),
    },
  ];

  const handleSendCredentials = async () => {
    if (!newUserEmail) return;
    
    setIsSendingEmail(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add new user to the list
    const newUser = {
      id: Date.now().toString(),
      email: newUserEmail,
      name: newUserEmail.split('@')[0].replace('.', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      status: 'active' as 'active' | 'paused',
      createdAt: new Date().toISOString().split('T')[0],
    };
    
    setStaffUsers([...staffUsers, newUser]);
    setIsSendingEmail(false);
    setNewUserEmail('');
    
    toast.success(`Credentials sent to ${newUserEmail}`, {
      description: 'The staff member will receive login details via email',
    });
  };

  const handleToggleUserStatus = (userId: string) => {
    setStaffUsers(staffUsers.map(user => {
      if (user.id === userId) {
        const newStatus = user.status === 'active' ? 'paused' : 'active';
        toast.success(`User ${newStatus === 'active' ? 'activated' : 'paused'}`, {
          description: `${user.email} has been ${newStatus === 'active' ? 'activated' : 'paused'}`,
        });
        return { ...user, status: newStatus as 'active' | 'paused' };
      }
      return user;
    }));
  };

  const handleDeleteUser = (userId: string) => {
    const user = staffUsers.find(u => u.id === userId);
    if (user) {
      setStaffUsers(staffUsers.filter(u => u.id !== userId));
      toast.success('User deleted', {
        description: `${user.email} has been permanently deleted`,
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: FileQueueItem[] = Array.from(files).map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      status: 'uploading' as FileStatus,
      progress: 0,
    }));

    setFileQueue(prev => [...prev, ...newFiles]);

    toast.success(`${newFiles.length} file(s) added to queue`, {
      description: 'Files are being processed for PII detection',
    });

    // Simulate file processing
    newFiles.forEach((file, index) => {
      setTimeout(() => simulateFileProcessing(file.id), index * 500);
    });

    // Reset the input so the same file can be uploaded again
    event.target.value = '';
  };

  const simulateFileProcessing = (fileId: string) => {
    const statuses: FileStatus[] = ['uploading', 'processing', 'scanning', 'completed'];
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < statuses.length) {
        setFileQueue(prev =>
          prev.map(f =>
            f.id === fileId
              ? { ...f, status: statuses[currentStep], progress: (currentStep / statuses.length) * 100 }
              : f
          )
        );
      } else {
        // File processing complete
        setFileQueue(prev => {
          const file = prev.find(f => f.id === fileId);
          if (file) {
            toast.success(`${file.name} processed successfully`, {
              description: 'PII detection completed',
            });
          }
          return prev.map(f =>
            f.id === fileId
              ? { ...f, status: 'completed' as FileStatus, progress: 100 }
              : f
          );
        });
        
        // Remove from queue after 3 seconds
        setTimeout(() => {
          setFileQueue(prev => prev.filter(f => f.id !== fileId));
        }, 3000);
        
        clearInterval(interval);
      }
    }, 2000);
  };

  const getStatusBadge = (status: FileStatus) => {
    switch (status) {
      case 'uploading':
        return (
          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Spinner data-icon="inline-start" className="mr-1 h-3 w-3" />
            Uploading
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            <Spinner data-icon="inline-start" className="mr-1 h-3 w-3" />
            Processing
          </Badge>
        );
      case 'scanning':
        return (
          <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <Spinner data-icon="inline-start" className="mr-1 h-3 w-3" />
            Scanning
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
    }
  };

  const Logo = () => (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1"
    >
      <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
        <Shield className="h-6 w-6 text-white" />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-bold text-lg whitespace-pre text-slate-900 dark:text-white"
      >
        SecureData
      </motion.span>
    </a>
  );

  const LogoIcon = () => (
    <a
      href="#"
      className="relative z-20 flex items-center justify-center py-1"
    >
      <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
        <Shield className="h-6 w-6 text-white" />
      </div>
    </a>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-slate-600 dark:text-slate-300 mt-1">Monitor your PII sanitization operations</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total Files
                  </CardTitle>
                  <FileText className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{stats.totalFiles}</div>
                  <p className="text-xs text-slate-600 mt-1">All uploaded files</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Sanitized
                  </CardTitle>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{stats.sanitizedFiles}</div>
                  <p className="text-xs text-slate-600 mt-1">
                    {((stats.sanitizedFiles / stats.totalFiles) * 100).toFixed(0)}% completion rate
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Processing
                  </CardTitle>
                  <Clock className="h-5 w-5 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {stats.processingFiles + stats.pendingFiles}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {stats.processingFiles} active, {stats.pendingFiles} queued
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Failed
                  </CardTitle>
                  <XCircle className="h-5 w-5 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{stats.failedFiles}</div>
                  <p className="text-xs text-slate-600 mt-1">Requires attention</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>PII Detections by Type</CardTitle>
                  <CardDescription>Last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.piiDetectionsByType}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="type" 
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>PII Distribution</CardTitle>
                  <CardDescription>Entity type breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity and Top Risk Files */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest file processing updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.recentActivity.map((activity) => (
                      <div 
                        key={activity.id} 
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {activity.fileName}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatRelativeTime(activity.timestamp)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          {activity.entityCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {activity.entityCount} PII
                            </Badge>
                          )}
                          <Badge className={getStatusColor(activity.status)}>
                            {activity.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>High Risk Files</CardTitle>
                  <CardDescription>Files with most PII detections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.topRiskFiles.map((file) => (
                      <div 
                        key={file.id}
                        className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-amber-100 to-red-100 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {file.entityCount} PII entities detected
                          </p>
                        </div>
                        <Badge 
                          className={
                            file.riskScore === 'high' 
                              ? 'bg-red-100 text-red-700 hover:bg-red-100'
                              : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                          }
                        >
                          {file.riskScore.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'files':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">File Management</h1>
                <p className="text-slate-600 dark:text-slate-300 mt-1">Upload and manage files for PII sanitization</p>
              </div>
              <div>
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <label 
                  htmlFor="file-upload" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors font-medium text-sm"
                >
                  <Upload className="h-4 w-4" />
                  Upload Files
                </label>
              </div>
            </div>

            {fileQueue.length > 0 && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Upload Queue
                  </CardTitle>
                  <CardDescription>{fileQueue.length} file(s) processing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fileQueue.map((file) => (
                      <div
                        key={file.id}
                        className="bg-white rounded-lg border border-blue-200 overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <FileText className="h-8 w-8 text-blue-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {(file.size / 1024).toFixed(2)} KB • {Math.round(file.progress)}%
                              </p>
                            </div>
                          </div>
                          <div className="ml-4 shrink-0">
                            {getStatusBadge(file.status)}
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="h-1 bg-slate-200">
                          <div 
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>All Files ({mockFiles.length})</CardTitle>
                <CardDescription>Complete list of uploaded files</CardDescription>
              </CardHeader>
              <CardContent>
                {mockFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Upload className="h-16 w-16 text-slate-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No files uploaded yet</h3>
                    <p className="text-slate-600 mb-6 max-w-md">
                      Upload your files to start the PII detection and sanitization process
                    </p>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Button className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                        <Upload className="h-4 w-4" />
                        Force Upload
                      </Button>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mockFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <FileText className="h-8 w-8 text-blue-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {file.originalName}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatRelativeTime(file.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4 shrink-0">
                          <Badge className={
                            file.riskScore === 'high' ? 'bg-red-50 text-red-700' :
                            file.riskScore === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-green-50 text-green-700'
                          }>
                            {file.riskScore.toUpperCase()} RISK
                          </Badge>
                          <Badge variant="outline">{file.piiCount} PII items</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast.info('Download feature coming soon')}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
              <p className="text-slate-600 mt-1">Create and manage staff credentials</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Create New Staff User</CardTitle>
                <CardDescription>
                  Enter email address to send credentials directly to the new staff member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-email">Staff Email Address</Label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="user-email"
                          type="email"
                          placeholder="staff@company.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="pl-10"
                          disabled={isSendingEmail}
                        />
                      </div>
                      <ActionButton
                        variant="default"
                        icon={Send}
                        onClick={handleSendCredentials}
                        loading={isSendingEmail}
                        disabled={!newUserEmail || isSendingEmail}
                      >
                        Send Credentials
                      </ActionButton>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    System will automatically generate secure credentials and send them to the provided email address
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Staff Members ({staffUsers.length})</CardTitle>
                <CardDescription>Manage existing staff accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {staffUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                          <p className="text-xs text-slate-400 mt-1">Created: {user.createdAt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <Badge className={user.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}>
                          {user.status === 'active' ? 'Active' : 'Paused'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleUserStatus(user.id)}
                          className="gap-1"
                        >
                          {user.status === 'active' ? (
                            <>
                              <Pause className="h-3 w-3" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'audit':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Audit Logs</h1>
                <p className="text-slate-600 mt-1">Complete audit trail of all platform activities</p>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => toast.success('Audit logs exported', { description: 'CSV file downloaded successfully' })}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-slate-900">127</div>
                  <p className="text-sm text-slate-600 mt-1">Total Events</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-slate-900">45</div>
                  <p className="text-sm text-slate-600 mt-1">Login Events</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-slate-900">62</div>
                  <p className="text-sm text-slate-600 mt-1">File Uploads</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-slate-900">3</div>
                  <p className="text-sm text-slate-600 mt-1">Access Denied</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system events and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { user: 'admin@company.com', action: 'LOGIN', time: '2 minutes ago', ip: '192.168.1.1' },
                    { user: 'john.doe@company.com', action: 'UPLOAD', time: '15 minutes ago', ip: '192.168.1.45' },
                    { user: 'jane.smith@company.com', action: 'DOWNLOAD_SANITIZED', time: '1 hour ago', ip: '192.168.1.89' },
                    { user: 'admin@company.com', action: 'USER_CREATED', time: '2 hours ago', ip: '192.168.1.1' },
                    { user: 'mike.wilson@company.com', action: 'SCAN_COMPLETE', time: '3 hours ago', ip: '192.168.1.156' },
                  ].map((log, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                          {log.user.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{log.user}</p>
                          <p className="text-xs text-slate-500 mt-1">{log.ip} • {log.time}</p>
                        </div>
                      </div>
                      <Badge className={
                        log.action === 'LOGIN' ? 'bg-blue-50 text-blue-700' :
                        log.action === 'UPLOAD' ? 'bg-green-50 text-green-700' :
                        log.action === 'DOWNLOAD_SANITIZED' ? 'bg-purple-50 text-purple-700' :
                        log.action === 'USER_CREATED' ? 'bg-sky-50 text-sky-700' :
                        'bg-green-50 text-green-700'
                      }>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'settings':
        return <SettingsPage />;

      default:
        return null;
    }
  };

  return (
    <div className="flex w-full h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink 
                  key={idx} 
                  link={link} 
                  active={link.label.toLowerCase().replace(' ', '') === activeView || (link.label === 'Users' && activeView === 'users') || (link.label === 'Audit Logs' && activeView === 'audit')}
                />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: user?.name || 'Admin User',
                href: '#',
                icon: (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-10">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
