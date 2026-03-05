import React, { useState } from 'react';
import { FileText, Download, Shield, LogOut, Settings, LayoutDashboard, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../app/components/ui/card';
import { Badge } from '../app/components/ui/badge';
import { Button } from '../app/components/ui/button';
import { Sidebar, SidebarBody, SidebarLink } from '../app/components/ui/sidebar-custom';
import { mockFiles } from '../lib/mock-data';
import { formatRelativeTime, formatFileSize, getFileIcon } from '../lib/utils';
import { useAuth } from '../lib/auth-context';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { UserSettings } from './UserSettings';

export function UserDashboard() {
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  
  const sanitizedFiles = mockFiles.filter((f) => f.status === 'sanitized');

  const handleDownload = (fileName: string) => {
    toast.success(`Downloading sanitized version of "${fileName}"`);
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
    {
      label: 'Logout',
      href: '#',
      icon: <LogOut className="h-5 w-5 shrink-0" />,
      onClick: () => logout(),
    },
  ];

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
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Staff Dashboard</h1>
              <p className="text-slate-600 dark:text-slate-300 mt-1">Access your sanitized files</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Available Files
                  </CardTitle>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{sanitizedFiles.length}</div>
                  <p className="text-xs text-slate-600 mt-1">Sanitized and ready to download</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total PII Removed
                  </CardTitle>
                  <Shield className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {sanitizedFiles.reduce((sum, f) => sum + f.entityCount, 0)}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Entities detected and sanitized</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-indigo-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Recent Files
                  </CardTitle>
                  <FileText className="h-5 w-5 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {sanitizedFiles.filter((f) => {
                      const date = new Date(f.sanitizedAt || '');
                      const now = new Date();
                      const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
                      return diffDays <= 7;
                    }).length}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Sanitized in last 7 days</p>
                </CardContent>
              </Card>
            </div>

            {/* Info Card */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-900">Sanitized Files Only</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      As a staff member, you have access to sanitized versions of files only. 
                      All PII has been automatically detected and removed to ensure safe data sharing.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Sanitized Files */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Sanitized Files</CardTitle>
                <CardDescription>Your latest available files</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sanitizedFiles.slice(0, 5).map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <span className="text-3xl flex-shrink-0">{getFileIcon(file.mimeType)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {file.originalName}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-slate-500">
                              {formatFileSize(file.size)}
                            </p>
                            <span className="text-slate-300">•</span>
                            <p className="text-xs text-slate-500">
                              {formatRelativeTime(file.sanitizedAt || file.uploadedAt)}
                            </p>
                            {file.entityCount > 0 && (
                              <>
                                <span className="text-slate-300">•</span>
                                <Badge variant="secondary" className="text-xs">
                                  {file.entityCount} PII removed
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toast.info('File details view coming soon')}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleDownload(file.originalName)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'files':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Files</h1>
              <p className="text-slate-600 dark:text-slate-300 mt-1">Access your sanitized files</p>
            </div>

            {/* Available Sanitized Files */}
            <Card>
              <CardHeader>
                <CardTitle>My Files ({sanitizedFiles.length})</CardTitle>
                <CardDescription>Download your sanitized documents</CardDescription>
              </CardHeader>
              <CardContent>
                {sanitizedFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No files available</h3>
                    <p className="text-slate-600 dark:text-slate-300 max-w-md">
                      You don't have any sanitized files yet. Files will appear here after they are processed by an administrator.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">{sanitizedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <span className="text-2xl flex-shrink-0">{getFileIcon(file.mimeType)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {file.originalName}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatFileSize(file.size)} • {formatRelativeTime(file.sanitizedAt || file.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast.info('File details view coming soon')}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleDownload(file.originalName)}
                          >
                            <Download className="w-4 h-4 mr-2" />
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

      case 'settings':
        return <UserSettings />;

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
                  active={link.label.toLowerCase() === activeView}
                />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: user?.name || 'Staff User',
                href: '#',
                icon: (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {user?.name?.charAt(0).toUpperCase() || 'S'}
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
