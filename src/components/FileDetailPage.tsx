import React from 'react';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  AlertCircle,
  Shield,
  Clock,
  FileText,
} from 'lucide-react';
import { Button } from '../app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../app/components/ui/card';
import { Badge } from '../app/components/ui/badge';
import { Progress } from '../app/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../app/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../app/components/ui/table';
import { mockFiles } from '../lib/mock-data';
import {
  formatFileSize,
  formatDate,
  getFileIcon,
  getStatusColor,
  getRiskColor,
} from '../lib/utils';
import { useAuth } from '../lib/auth-context';
import { toast } from 'sonner';

interface FileDetailPageProps {
  fileId: string;
  onBack: () => void;
}

export function FileDetailPage({ fileId, onBack }: FileDetailPageProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const file = mockFiles.find((f) => f.id === fileId);

  if (!file) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900">File not found</h2>
          <p className="text-slate-600 mt-2">The requested file does not exist.</p>
          <Button onClick={onBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const entityData = Object.entries(file.entitiesByType).map(([type, count]) => ({
    type,
    count,
    confidence: 0.85 + Math.random() * 0.14, // Mock confidence
    strategy: getDefaultStrategy(type),
  }));

  const totalEntities = Object.values(file.entitiesByType).reduce(
    (sum, count) => sum + count,
    0
  );

  const mockOriginalText = `John Doe
Email: john.doe@example.com
Phone: +91-9876543210
Aadhaar: 1234-5678-9012
PAN: ABCDE1234F
Address: 123 Main Street, Mumbai, Maharashtra 400001`;

  const mockSanitizedText = `[NAME_REDACTED]
Email: [EMAIL_REDACTED]
Phone: [PHONE_REDACTED]
Aadhaar: [AADHAAR_REDACTED]
PAN: [PAN_REDACTED]
Address: [ADDRESS_REDACTED]`;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getFileIcon(file.mimeType)}</span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{file.originalName}</h1>
              <p className="text-sm text-slate-600">{formatFileSize(file.size)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {file.status === 'sanitized' && (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  toast.success(`Downloading sanitized version of "${file.originalName}"`)
                }
              >
                <Download className="w-4 h-4 mr-2" />
                Download Sanitized
              </Button>
              {isAdmin && (
                <Button
                  onClick={() =>
                    toast.success(`Downloading original version of "${file.originalName}"`)
                  }
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Original
                </Button>
              )}
            </>
          )}
          {isAdmin && file.status === 'sanitized' && (
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-scan
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(file.status)} style={{ fontSize: '0.875rem' }}>
              {file.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              PII Entities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{file.entityCount}</div>
            <p className="text-xs text-slate-600 mt-1">{Object.keys(file.entitiesByType).length} types detected</p>
          </CardContent>
        </Card>

        {file.riskScore && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Risk Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={getRiskColor(file.riskScore)} style={{ fontSize: '0.875rem' }}>
                {file.riskScore.toUpperCase()}
              </Badge>
            </CardContent>
          </Card>
        )}

        {file.processingDuration && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Processing Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {file.processingDuration}s
              </div>
              <p className="text-xs text-slate-600 mt-1">Analysis duration</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* File Info */}
      <Card>
        <CardHeader>
          <CardTitle>File Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-600">Uploaded By</p>
              <p className="text-sm font-medium text-slate-900 mt-1">
                {file.uploaderName}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Upload Date</p>
              <p className="text-sm font-medium text-slate-900 mt-1">
                {formatDate(file.uploadedAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">MIME Type</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{file.mimeType}</p>
            </div>
            {file.sanitizedAt && (
              <div>
                <p className="text-sm text-slate-600">Sanitized At</p>
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {formatDate(file.sanitizedAt)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Entity Analysis */}
      {file.entityCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>PII Entity Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Masking Strategy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entityData.map((entity) => (
                  <TableRow key={entity.type}>
                    <TableCell>
                      <Badge variant="outline">{entity.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{entity.count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(entity.count / totalEntities) * 100}
                          className="w-24"
                        />
                        <span className="text-sm text-slate-600">
                          {((entity.count / totalEntities) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          entity.confidence > 0.9
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }
                      >
                        {(entity.confidence * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entity.strategy}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {file.status === 'sanitized' && (
        <Card>
          <CardHeader>
            <CardTitle>File Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={isAdmin ? 'comparison' : 'sanitized'}>
              <TabsList>
                {isAdmin && <TabsTrigger value="comparison">Comparison</TabsTrigger>}
                <TabsTrigger value="sanitized">Sanitized</TabsTrigger>
                {isAdmin && <TabsTrigger value="original">Original</TabsTrigger>}
              </TabsList>

              {isAdmin && (
                <TabsContent value="comparison" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-red-600" />
                        <h4 className="font-medium text-slate-900">Original</h4>
                        <Badge variant="outline" className="text-red-600">
                          Contains PII
                        </Badge>
                      </div>
                      <pre className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm font-mono overflow-x-auto">
                        {mockOriginalText}
                      </pre>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-green-600" />
                        <h4 className="font-medium text-slate-900">Sanitized</h4>
                        <Badge variant="outline" className="text-green-600">
                          Safe to Share
                        </Badge>
                      </div>
                      <pre className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm font-mono overflow-x-auto">
                        {mockSanitizedText}
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              )}

              <TabsContent value="sanitized">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <h4 className="font-medium text-slate-900">Sanitized Version</h4>
                  <Badge variant="outline" className="text-green-600">
                    Safe to Share
                  </Badge>
                </div>
                <pre className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm font-mono overflow-x-auto">
                  {mockSanitizedText}
                </pre>
              </TabsContent>

              {isAdmin && (
                <TabsContent value="original">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <h4 className="font-medium text-slate-900">Original Version</h4>
                    <Badge variant="outline" className="text-red-600">
                      Contains PII
                    </Badge>
                  </div>
                  <pre className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm font-mono overflow-x-auto">
                    {mockOriginalText}
                  </pre>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {file.status === 'error' && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Processing Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">{file.errorMsg || 'An unknown error occurred'}</p>
            {isAdmin && (
              <Button variant="outline" className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Processing
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getDefaultStrategy(type: string): string {
  const strategies: Record<string, string> = {
    EMAIL: 'redact',
    PHONE: 'mask',
    AADHAAR: 'tokenize',
    PAN: 'tokenize',
    ADDRESS: 'redact',
    DOB: 'mask',
    NAME: 'redact',
    CVV: 'redact',
    IP: 'hash',
    UPI: 'tokenize',
  };
  return strategies[type] || 'redact';
}
