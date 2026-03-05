import React, { useState } from 'react';
import { 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Eye,
  MoreVertical,
  RefreshCw,
  X
} from 'lucide-react';
import { Button } from '../app/components/ui/button';
import { Input } from '../app/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../app/components/ui/card';
import { Badge } from '../app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../app/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../app/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../app/components/ui/dialog';
import { Label } from '../app/components/ui/label';
import { mockFiles } from '../lib/mock-data';
import { formatFileSize, formatDate, getFileIcon, getStatusColor, getRiskColor } from '../lib/utils';
import { useAuth } from '../lib/auth-context';
import { FileMetadata } from '../types';
import { toast } from 'sonner';

interface FilesPageProps {
  onViewFile: (fileId: string) => void;
}

export function FilesPage({ onViewFile }: FilesPageProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const filteredFiles = mockFiles.filter((file) => {
    // For regular users, only show sanitized files
    if (!isAdmin && file.status !== 'sanitized') {
      return false;
    }

    const matchesSearch = file.originalName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || file.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpload = () => {
    if (selectedFile) {
      toast.success(`File "${selectedFile.name}" uploaded successfully`);
      setUploadDialogOpen(false);
      setSelectedFile(null);
    }
  };

  const handleDownload = (file: FileMetadata, type: 'original' | 'sanitized') => {
    if (type === 'original' && !isAdmin) {
      toast.error('Access denied: Only admins can download original files');
      return;
    }
    toast.success(`Downloading ${type} version of "${file.originalName}"`);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isAdmin ? 'File Manager' : 'Sanitized Files'}
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdmin
              ? 'Upload, manage, and process files for PII detection'
              : 'Access sanitized files safe for sharing'}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setUploadDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search files..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'sanitized' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('sanitized')}
                size="sm"
              >
                Sanitized
              </Button>
              {isAdmin && (
                <>
                  <Button
                    variant={statusFilter === 'processing' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('processing')}
                    size="sm"
                  >
                    Processing
                  </Button>
                  <Button
                    variant={statusFilter === 'error' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('error')}
                    size="sm"
                  >
                    Failed
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PII Count</TableHead>
                {isAdmin && <TableHead>Risk</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <FileText className="w-12 h-12 opacity-20" />
                      <p>No files found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredFiles.map((file) => (
                  <TableRow key={file.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
                        <div>
                          <p className="font-medium text-slate-900">{file.originalName}</p>
                          <p className="text-xs text-slate-500">{file.mimeType}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {formatFileSize(file.size)}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      <div>
                        <p className="text-sm">{formatDate(file.uploadedAt)}</p>
                        <p className="text-xs text-slate-500">by {file.uploaderName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(file.status)}>
                        {file.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {file.entityCount > 0 ? (
                        <Badge variant="secondary">{file.entityCount}</Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {file.riskScore ? (
                          <Badge className={getRiskColor(file.riskScore)}>
                            {file.riskScore.toUpperCase()}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewFile(file.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {file.status === 'sanitized' && (
                            <DropdownMenuItem
                              onClick={() => handleDownload(file, 'sanitized')}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download Sanitized
                            </DropdownMenuItem>
                          )}
                          {isAdmin && file.status === 'sanitized' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDownload(file, 'original')}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Original
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Re-scan
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Upload a file for PII detection and sanitization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  id="file"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label
                  htmlFor="file"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-12 h-12 text-slate-400" />
                  <p className="text-sm text-slate-600">
                    Click to browse or drag and drop
                  </p>
                  <p className="text-xs text-slate-500">
                    Supports: CSV, JSON, PDF, DOCX, TXT, SQL, Images
                  </p>
                </label>
              </div>
              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getFileIcon(selectedFile.type)}</span>
                    <div>
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Upload & Scan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
