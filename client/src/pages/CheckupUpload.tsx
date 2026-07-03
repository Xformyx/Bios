import { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../hooks/useApi';

export default function CheckupUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const data = await api.uploadCheckup(file);
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(e.message || '업로드 중 오류가 발생했습니다.');
    }
    setUploading(false);
  };

  const statusLabels: Record<string, string> = {
    normal: '정상',
    caution: '주의',
    warning: '경고',
    critical: '위험',
  };

  const statusStyles: Record<string, string> = {
    normal: 'bg-green-100 text-green-800',
    caution: 'bg-yellow-100 text-yellow-800',
    warning: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">건강검진 업로드</h1>
        <p className="text-gray-500 mt-1">건강검진 결과 PDF 또는 이미지를 업로드하면 OCR로 수치를 자동 추출합니다.</p>
      </div>

      {/* Upload Area */}
      <div className="card">
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            file ? 'border-primary-300 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile) setFile(droppedFile);
          }}
        >
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <FileText className="w-12 h-12 text-primary-600" />
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <button onClick={() => setFile(null)} className="text-sm text-red-600 hover:underline">파일 제거</button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-gray-400" />
              <p className="font-medium text-gray-700">파일을 드래그하거나 클릭하여 업로드</p>
              <p className="text-sm text-gray-500">PDF, JPEG, PNG, WebP (최대 20MB)</p>
            </div>
          )}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ position: 'absolute', top: 0, left: 0 }}
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) setFile(selected);
            }}
          />
        </div>

        {file && !result && (
          <div className="mt-4 flex justify-center">
            <button onClick={handleUpload} disabled={uploading} className="btn-primary disabled:opacity-50">
              {uploading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  OCR 분석 중...
                </span>
              ) : '검진 결과 분석 시작'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
      </div>

      {/* OCR Results */}
      {result && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h2 className="text-lg font-semibold">분석 완료</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500">추출 항목</p>
                <p className="text-xl font-bold text-primary-600">{result.extractedItems}개</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500">OCR 신뢰도</p>
                <p className="text-xl font-bold text-primary-600">{(result.ocrConfidence * 100).toFixed(0)}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500">검진일</p>
                <p className="text-xl font-bold text-primary-600">{result.checkup.checkupDate}</p>
              </div>
            </div>
            {result.warnings && result.warnings.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium mb-1">안내사항</p>
                {result.warnings.map((w: string, i: number) => (
                  <p key={i} className="text-sm text-yellow-700">• {w}</p>
                ))}
              </div>
            )}
          </div>

          {/* Extracted Observations Table */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">추출된 검사 수치</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">검사 항목</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">측정값</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">참조 범위</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">판정</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">카테고리</th>
                  </tr>
                </thead>
                <tbody>
                  {result.checkup.observations.map((obs: any) => (
                    <tr key={obs.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{obs.display}</td>
                      <td className="py-3 px-4 text-right font-mono">{obs.value} {obs.unit}</td>
                      <td className="py-3 px-4 text-right text-gray-500">
                        {obs.referenceRange ? `${obs.referenceRange.low} ~ ${obs.referenceRange.high}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[obs.status]}`}>
                          {statusLabels[obs.status]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{obs.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
