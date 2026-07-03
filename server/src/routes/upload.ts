import { Router, Response } from 'express';
import multer from 'multer';
import { store } from '../utils/store.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const uploadRouter = Router();
uploadRouter.use(authenticateToken);

// 파일 업로드 설정
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다. PDF, JPEG, PNG, WebP만 가능합니다.'));
    }
  },
});

// 건강검진 PDF/이미지 업로드 및 OCR 처리
uploadRouter.post('/checkup', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일을 선택해주세요.' });
    }

    // OCR 시뮬레이션 (실제 구현에서는 Tesseract, Google Vision API, 또는 자체 OCR 서비스 사용)
    // MVP에서는 업로드된 파일을 기반으로 시뮬레이션된 검진 결과를 생성
    const ocrResult = simulateOCR(req.file.originalname);

    const checkup = {
      id: crypto.randomUUID(),
      userId: req.userId!,
      checkupDate: new Date().toISOString().split('T')[0],
      source: 'upload' as const,
      observations: ocrResult.observations,
      createdAt: new Date().toISOString(),
    };

    const checkups = store.healthCheckups.get(req.userId!) || [];
    checkups.push(checkup);
    store.healthCheckups.set(req.userId!, checkups);

    store.addAuditLog({
      userId: req.userId!,
      action: 'CREATE',
      resource: 'HealthCheckup',
      resourceId: checkup.id,
      details: `검진 PDF 업로드: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB)`,
    });

    res.status(201).json({
      message: '검진 결과가 성공적으로 업로드되었습니다.',
      checkup,
      ocrConfidence: ocrResult.confidence,
      extractedItems: ocrResult.observations.length,
      warnings: ocrResult.warnings,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '파일 처리 중 오류가 발생했습니다.' });
  }
});

// OCR 시뮬레이션 함수
function simulateOCR(filename: string) {
  // 실제 구현에서는 OCR 엔진을 통해 PDF/이미지에서 수치를 추출
  // MVP에서는 현실적인 검진 데이터를 시뮬레이션
  const observations = [
    { id: crypto.randomUUID(), code: 'BMI', display: '체질량지수(BMI)', value: 24.5 + Math.random() * 5, unit: 'kg/m²', status: 'caution' as const, referenceRange: { low: 18.5, high: 24.9 }, category: '비만' },
    { id: crypto.randomUUID(), code: 'BP_SYS', display: '수축기 혈압', value: 120 + Math.floor(Math.random() * 25), unit: 'mmHg', status: 'normal' as const, referenceRange: { low: 90, high: 130 }, category: '혈압' },
    { id: crypto.randomUUID(), code: 'BP_DIA', display: '이완기 혈압', value: 75 + Math.floor(Math.random() * 15), unit: 'mmHg', status: 'normal' as const, referenceRange: { low: 60, high: 85 }, category: '혈압' },
    { id: crypto.randomUUID(), code: 'FBS', display: '공복혈당', value: 90 + Math.floor(Math.random() * 30), unit: 'mg/dL', status: 'normal' as const, referenceRange: { low: 70, high: 99 }, category: '당뇨' },
    { id: crypto.randomUUID(), code: 'TC', display: '총콜레스테롤', value: 180 + Math.floor(Math.random() * 60), unit: 'mg/dL', status: 'normal' as const, referenceRange: { low: 0, high: 200 }, category: '이상지질혈증' },
    { id: crypto.randomUUID(), code: 'LDL', display: 'LDL 콜레스테롤', value: 100 + Math.floor(Math.random() * 60), unit: 'mg/dL', status: 'normal' as const, referenceRange: { low: 0, high: 130 }, category: '이상지질혈증' },
    { id: crypto.randomUUID(), code: 'HDL', display: 'HDL 콜레스테롤', value: 40 + Math.floor(Math.random() * 30), unit: 'mg/dL', status: 'normal' as const, referenceRange: { low: 60, high: 100 }, category: '이상지질혈증' },
    { id: crypto.randomUUID(), code: 'TG', display: '중성지방', value: 100 + Math.floor(Math.random() * 100), unit: 'mg/dL', status: 'normal' as const, referenceRange: { low: 0, high: 150 }, category: '이상지질혈증' },
    { id: crypto.randomUUID(), code: 'AST', display: 'AST(SGOT)', value: 20 + Math.floor(Math.random() * 25), unit: 'U/L', status: 'normal' as const, referenceRange: { low: 0, high: 40 }, category: '간기능' },
    { id: crypto.randomUUID(), code: 'ALT', display: 'ALT(SGPT)', value: 20 + Math.floor(Math.random() * 30), unit: 'U/L', status: 'normal' as const, referenceRange: { low: 0, high: 35 }, category: '간기능' },
    { id: crypto.randomUUID(), code: 'HBA1C', display: '당화혈색소(HbA1c)', value: 5.0 + Math.random() * 1.2, unit: '%', status: 'normal' as const, referenceRange: { low: 4.0, high: 5.6 }, category: '당뇨' },
    { id: crypto.randomUUID(), code: 'CREATININE', display: '크레아티닌', value: 0.7 + Math.random() * 0.5, unit: 'mg/dL', status: 'normal' as const, referenceRange: { low: 0.5, high: 1.2 }, category: '신장기능' },
  ];

  // 상태 재계산
  for (const obs of observations) {
    if (obs.referenceRange) {
      if (obs.value > obs.referenceRange.high * 1.5) obs.status = 'critical';
      else if (obs.value > obs.referenceRange.high * 1.2) obs.status = 'warning';
      else if (obs.value > obs.referenceRange.high || obs.value < obs.referenceRange.low) obs.status = 'caution';
      else obs.status = 'normal';
    }
    // 값 반올림
    obs.value = Math.round(obs.value * 10) / 10;
  }

  return {
    observations,
    confidence: 0.85 + Math.random() * 0.1,
    warnings: ['OCR 추출 결과를 확인해주세요. 일부 수치가 정확하지 않을 수 있습니다.', '원본 문서를 보관하시기 바랍니다.'],
  };
}
