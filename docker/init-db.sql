-- ============================================================
-- MyHealth Market Lite - Database Initialization
-- 건강정보 고속도로 연동 및 FHIR R4 호환 스키마
-- ============================================================

-- 확장 모듈
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 사용자 및 인증
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    birth_date DATE,
    gender VARCHAR(10),
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- 동의 관리 (FHIR Consent 호환)
-- ============================================================

CREATE TABLE consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    category VARCHAR(50) NOT NULL,
    purpose TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    provider_id VARCHAR(100),
    fhir_consent_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consents_user ON consents(user_id);
CREATE INDEX idx_consents_status ON consents(status);

-- ============================================================
-- 건강검진 결과
-- ============================================================

CREATE TABLE health_checkups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    checkup_date DATE NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'upload',
    report_url TEXT,
    fhir_diagnostic_report_id VARCHAR(255),
    ocr_confidence DECIMAL(4,3),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkups_user ON health_checkups(user_id);
CREATE INDEX idx_checkups_date ON health_checkups(checkup_date);

-- ============================================================
-- 검사 수치 (FHIR Observation 호환)
-- ============================================================

CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    checkup_id UUID REFERENCES health_checkups(id),
    code VARCHAR(50) NOT NULL,
    display VARCHAR(200) NOT NULL,
    value DECIMAL(10,3) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'normal',
    category VARCHAR(50),
    reference_range_low DECIMAL(10,3),
    reference_range_high DECIMAL(10,3),
    effective_date DATE,
    fhir_observation_id VARCHAR(255),
    loinc_code VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_observations_user ON observations(user_id);
CREATE INDEX idx_observations_code ON observations(code);
CREATE INDEX idx_observations_date ON observations(effective_date);

-- ============================================================
-- 웨어러블 데이터
-- ============================================================

CREATE TABLE wearable_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    source VARCHAR(30) NOT NULL DEFAULT 'manual',
    date DATE NOT NULL,
    steps INTEGER,
    sleep_hours DECIMAL(4,2),
    heart_rate_avg INTEGER,
    heart_rate_min INTEGER,
    heart_rate_max INTEGER,
    active_minutes INTEGER,
    calories_burned INTEGER,
    weight DECIMAL(5,2),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    blood_glucose DECIMAL(5,1),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wearable_user_date ON wearable_data(user_id, date);

-- ============================================================
-- 건강 목표 (FHIR CarePlan 호환)
-- ============================================================

CREATE TABLE health_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    fhir_careplan_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE weekly_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES health_goals(id),
    week INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_missions_goal ON weekly_missions(goal_id);

-- ============================================================
-- AI 코치 대화 기록
-- ============================================================

CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(30),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_user ON ai_messages(user_id);
CREATE INDEX idx_ai_messages_created ON ai_messages(created_at);

-- ============================================================
-- 병원 제출용 리포트
-- ============================================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    sections JSONB NOT NULL,
    pdf_url TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_user ON reports(user_id);

-- ============================================================
-- 감사 로그 (FHIR AuditEvent 호환, 불변)
-- ============================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    details TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_resource ON audit_logs(resource);

-- 감사로그는 삭제/수정 불가 (불변성 보장)
REVOKE UPDATE, DELETE ON audit_logs FROM myhealth;

-- ============================================================
-- 건강정보 고속도로 연동 상태
-- ============================================================

CREATE TABLE myhealthway_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    patient_fhir_id VARCHAR(255),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    scope TEXT,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
);

CREATE INDEX idx_mhw_user ON myhealthway_connections(user_id);

-- ============================================================
-- FHIR 리소스 캐시 (건강정보 고속도로에서 수신한 원본)
-- ============================================================

CREATE TABLE fhir_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    resource_type VARCHAR(50) NOT NULL,
    fhir_id VARCHAR(255) NOT NULL,
    resource_json JSONB NOT NULL,
    source VARCHAR(100) DEFAULT 'myhealthway',
    received_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, resource_type, fhir_id)
);

CREATE INDEX idx_fhir_user_type ON fhir_resources(user_id, resource_type);
CREATE INDEX idx_fhir_resource_json ON fhir_resources USING GIN(resource_json);

-- ============================================================
-- 초기 데이터
-- ============================================================

-- 데모 사용자 (비밀번호: demo1234)
INSERT INTO users (id, email, password_hash, name, birth_date, gender) VALUES
    ('00000000-0000-0000-0000-000000000001', 'demo@myhealth.kr', 
     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
     '김건강', '1985-03-15', 'male');

COMMENT ON TABLE users IS '사용자 정보 (FHIR Patient 매핑)';
COMMENT ON TABLE consents IS '동의 관리 (FHIR Consent 매핑)';
COMMENT ON TABLE observations IS '검사 수치 (FHIR Observation 매핑)';
COMMENT ON TABLE health_goals IS '건강 목표 (FHIR CarePlan 매핑)';
COMMENT ON TABLE audit_logs IS '감사 로그 (FHIR AuditEvent 매핑, 불변)';
COMMENT ON TABLE fhir_resources IS '건강정보 고속도로 수신 FHIR 리소스 원본 캐시';
