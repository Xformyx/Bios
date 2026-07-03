/**
 * LLM 제공자 관리 서비스
 * OpenAI, Google Gemini, Ollama (Local LLM) 지원
 */

export type LLMProviderType = 'openai' | 'gemini' | 'ollama';

export interface LLMConfig {
  provider: LLMProviderType;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modifiedAt: string;
  details?: {
    format: string;
    family: string;
    parameterSize: string;
    quantizationLevel: string;
  };
}

export interface OllamaPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  percent?: number;
}

// 기본 설정
const DEFAULT_CONFIG: LLMConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 1500,
};

class LLMProviderService {
  private config: LLMConfig = { ...DEFAULT_CONFIG };
  private ollamaBaseUrl: string = 'http://localhost:11434';

  // ============================================================
  // 설정 관리
  // ============================================================

  getConfig(): LLMConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<LLMConfig>): LLMConfig {
    this.config = { ...this.config, ...newConfig };
    console.log(`[LLM] Provider changed to: ${this.config.provider} (${this.config.model})`);
    return this.config;
  }

  setOllamaBaseUrl(url: string): void {
    this.ollamaBaseUrl = url.replace(/\/$/, '');
  }

  getOllamaBaseUrl(): string {
    return this.ollamaBaseUrl;
  }

  // ============================================================
  // 통합 Chat Completion API
  // ============================================================

  async chatCompletion(messages: Array<{ role: string; content: string }>): Promise<string> {
    switch (this.config.provider) {
      case 'openai':
        return this.openaiChat(messages);
      case 'gemini':
        return this.geminiChat(messages);
      case 'ollama':
        return this.ollamaChat(messages);
      default:
        throw new Error(`지원하지 않는 LLM 제공자: ${this.config.provider}`);
    }
  }

  // ============================================================
  // OpenAI
  // ============================================================

  private async openaiChat(messages: Array<{ role: string; content: string }>): Promise<string> {
    const baseUrl = this.config.baseUrl || process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API Key가 설정되지 않았습니다. 설정 페이지에서 입력해주세요.');
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        messages,
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API 오류: ${response.status} - ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // ============================================================
  // Google Gemini
  // ============================================================

  private async geminiChat(messages: Array<{ role: string; content: string }>): Promise<string> {
    const apiKey = this.config.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API Key가 설정되지 않았습니다. 설정 페이지에서 입력해주세요.');
    }

    const model = this.config.model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Gemini 형식으로 변환
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // system 메시지를 첫 user 메시지에 합침
    const systemMsg = messages.find(m => m.role === 'system');
    if (systemMsg && contents.length > 0) {
      contents[0].parts.unshift({ text: `[System Instructions]\n${systemMsg.content}\n\n` });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: this.config.temperature ?? 0.7,
          maxOutputTokens: this.config.maxTokens ?? 1500,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Gemini API 오류: ${response.status} - ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // ============================================================
  // Ollama (Local LLM)
  // ============================================================

  private async ollamaChat(messages: Array<{ role: string; content: string }>): Promise<string> {
    const url = `${this.ollamaBaseUrl}/api/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model || 'llama3.1',
        messages,
        stream: false,
        options: {
          temperature: this.config.temperature ?? 0.7,
          num_predict: this.config.maxTokens ?? 1500,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama 오류: ${response.status} - Ollama가 실행 중인지 확인하세요. (${this.ollamaBaseUrl})`);
    }

    const data = await response.json();
    return data.message?.content || '';
  }

  // ============================================================
  // Ollama 모델 관리
  // ============================================================

  /** 설치된 모델 목록 조회 */
  async ollamaListModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);
      if (!response.ok) throw new Error(`Ollama 연결 실패: ${response.status}`);
      const data = await response.json();
      return (data.models || []).map((m: any) => ({
        name: m.name,
        size: m.size,
        digest: m.digest,
        modifiedAt: m.modified_at,
        details: m.details,
      }));
    } catch (error: any) {
      throw new Error(`Ollama 서버에 연결할 수 없습니다 (${this.ollamaBaseUrl}). Ollama가 실행 중인지 확인하세요.`);
    }
  }

  /** 모델 다운로드 (Pull) */
  async ollamaPullModel(modelName: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: false }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `모델 다운로드 실패: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, message: `모델 '${modelName}' 다운로드가 완료되었습니다.` };
    } catch (error: any) {
      throw new Error(`모델 다운로드 실패: ${error.message}`);
    }
  }

  /** 모델 삭제 */
  async ollamaDeleteModel(modelName: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`모델 삭제 실패: ${response.status}`);
      }

      return { success: true, message: `모델 '${modelName}'이 삭제되었습니다.` };
    } catch (error: any) {
      throw new Error(`모델 삭제 실패: ${error.message}`);
    }
  }

  /** 모델 상세 정보 조회 */
  async ollamaModelInfo(modelName: string): Promise<any> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) throw new Error(`모델 정보 조회 실패: ${response.status}`);
      return await response.json();
    } catch (error: any) {
      throw new Error(`모델 정보 조회 실패: ${error.message}`);
    }
  }

  /** Ollama 서버 상태 확인 */
  async ollamaHealthCheck(): Promise<{ running: boolean; version?: string; url: string }> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/version`);
      if (response.ok) {
        const data = await response.json();
        return { running: true, version: data.version, url: this.ollamaBaseUrl };
      }
      return { running: false, url: this.ollamaBaseUrl };
    } catch {
      return { running: false, url: this.ollamaBaseUrl };
    }
  }

  /** 사용 가능한 모델 목록 (추천) */
  getRecommendedModels(): Array<{ name: string; description: string; size: string; category: string }> {
    return [
      { name: 'llama3.1:8b', description: 'Meta Llama 3.1 8B - 범용 대화 모델', size: '~4.7GB', category: '범용' },
      { name: 'llama3.1:70b', description: 'Meta Llama 3.1 70B - 고성능 대화 모델', size: '~40GB', category: '범용' },
      { name: 'gemma2:9b', description: 'Google Gemma 2 9B - 경량 고성능', size: '~5.4GB', category: '범용' },
      { name: 'gemma2:27b', description: 'Google Gemma 2 27B - 고성능', size: '~16GB', category: '범용' },
      { name: 'qwen2.5:7b', description: 'Alibaba Qwen 2.5 7B - 다국어 지원', size: '~4.4GB', category: '다국어' },
      { name: 'qwen2.5:14b', description: 'Alibaba Qwen 2.5 14B - 다국어 고성능', size: '~8.9GB', category: '다국어' },
      { name: 'mistral:7b', description: 'Mistral 7B - 빠른 추론', size: '~4.1GB', category: '범용' },
      { name: 'deepseek-r1:8b', description: 'DeepSeek R1 8B - 추론 특화', size: '~4.9GB', category: '추론' },
      { name: 'llama3.1:8b-ko', description: 'Llama 3.1 한국어 파인튜닝', size: '~4.7GB', category: '한국어' },
      { name: 'phi3:medium', description: 'Microsoft Phi-3 Medium - 경량', size: '~7.9GB', category: '경량' },
    ];
  }
}

export const llmProvider = new LLMProviderService();
