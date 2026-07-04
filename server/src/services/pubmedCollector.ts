/**
 * PubMed API 자동 논문 수집 서비스
 * Evidence DB를 자동으로 확장하기 위해 PubMed에서 관련 논문을 검색합니다.
 * 
 * Rate Limiting: NCBI 정책 준수 (API Key 있을 때 10 req/s, 없을 때 3 req/s)
 */

import { EvidencePaper } from './evidenceDB.js';

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const RATE_LIMIT_MS = 350; // 3 req/s without API key

interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  abstract: string;
  doi?: string;
  meshTerms?: string[];
}

interface SearchQuery {
  terms: string;
  category: string;
  relatedCodes: string[];
  minDate?: string;  // YYYY/MM/DD
  maxResults?: number;
}

class PubMedCollectorService {
  private apiKey: string | null = process.env.PUBMED_API_KEY || null;
  private lastRequestTime = 0;

  /**
   * PubMed 검색 및 논문 수집
   */
  async searchAndCollect(query: SearchQuery): Promise<EvidencePaper[]> {
    const pmids = await this.search(query.terms, query.maxResults || 5, query.minDate || '2000/01/01');
    if (pmids.length === 0) return [];

    const articles = await this.fetchDetails(pmids);
    return articles.map(article => this.convertToEvidence(article, query));
  }

  /**
   * PubMed 검색 (ID 목록 반환)
   */
  private async search(terms: string, maxResults: number, minDate: string): Promise<string[]> {
    await this.rateLimit();

    const params = new URLSearchParams({
      db: 'pubmed',
      term: terms,
      retmax: maxResults.toString(),
      sort: 'relevance',
      mindate: minDate,
      datetype: 'pdat',
      retmode: 'json',
      ...(this.apiKey ? { api_key: this.apiKey } : {}),
    });

    try {
      const response = await fetch(`${PUBMED_BASE}/esearch.fcgi?${params}`);
      if (!response.ok) throw new Error(`PubMed search failed: ${response.status}`);
      const data = await response.json();
      return data.esearchresult?.idlist || [];
    } catch (error: any) {
      console.error(`[PubMed] Search error: ${error.message}`);
      return [];
    }
  }

  /**
   * PubMed 논문 상세 정보 조회
   */
  private async fetchDetails(pmids: string[]): Promise<PubMedArticle[]> {
    await this.rateLimit();

    const params = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'json',
      rettype: 'abstract',
      ...(this.apiKey ? { api_key: this.apiKey } : {}),
    });

    try {
      const response = await fetch(`${PUBMED_BASE}/efetch.fcgi?${params}`);
      if (!response.ok) throw new Error(`PubMed fetch failed: ${response.status}`);

      // XML 파싱이 필요하지만 간소화를 위해 esummary 사용
      const summaryParams = new URLSearchParams({
        db: 'pubmed',
        id: pmids.join(','),
        retmode: 'json',
        ...(this.apiKey ? { api_key: this.apiKey } : {}),
      });

      await this.rateLimit();
      const summaryResponse = await fetch(`${PUBMED_BASE}/esummary.fcgi?${summaryParams}`);
      const summaryData = await summaryResponse.json();

      const articles: PubMedArticle[] = [];
      const results = summaryData.result || {};

      for (const pmid of pmids) {
        const article = results[pmid];
        if (!article) continue;

        articles.push({
          pmid,
          title: article.title || '',
          authors: (article.authors || []).map((a: any) => a.name).slice(0, 3).join(', ') + (article.authors?.length > 3 ? ' et al.' : ''),
          journal: article.fulljournalname || article.source || '',
          year: parseInt(article.pubdate?.split(' ')[0]) || new Date().getFullYear(),
          abstract: article.abstract || '(Abstract not available via API - full text retrieval needed)',
          doi: article.elocationid?.replace('doi: ', '') || undefined,
        });
      }

      return articles;
    } catch (error: any) {
      console.error(`[PubMed] Fetch error: ${error.message}`);
      return [];
    }
  }

  /**
   * PubMed 논문을 Evidence DB 형식으로 변환
   */
  private convertToEvidence(article: PubMedArticle, query: SearchQuery): EvidencePaper {
    // 근거 수준 추정 (제목 기반)
    const titleLower = article.title.toLowerCase();
    let evidenceLevel: EvidencePaper['evidenceLevel'] = 'review';
    if (titleLower.includes('meta-analysis') || titleLower.includes('systematic review')) evidenceLevel = 'meta-analysis';
    else if (titleLower.includes('randomized') || titleLower.includes('rct')) evidenceLevel = 'rct';
    else if (titleLower.includes('cohort') || titleLower.includes('prospective')) evidenceLevel = 'cohort';
    else if (titleLower.includes('guideline') || titleLower.includes('recommendation')) evidenceLevel = 'guideline';
    else if (titleLower.includes('case-control')) evidenceLevel = 'case-control';

    // 스코어 계산 (근거 수준 기반)
    const levelScores: Record<string, number> = { 'meta-analysis': 0.95, guideline: 0.92, rct: 0.88, cohort: 0.82, 'case-control': 0.75, review: 0.70 };
    const relevanceScore = levelScores[evidenceLevel] || 0.70;
    const accuracyScore = relevanceScore - 0.05 + Math.random() * 0.1;

    // 한국인 대상 여부
    const population = (titleLower.includes('korean') || titleLower.includes('korea') || titleLower.includes('east asian')) ? '한국인/동아시아인' : undefined;

    return {
      id: `pubmed-${article.pmid}`,
      pmid: article.pmid,
      doi: article.doi,
      title: article.title,
      authors: article.authors,
      journal: article.journal,
      year: article.year,
      abstract: article.abstract,
      keyFindings: [], // LLM으로 추출 필요
      relevanceScore: Math.min(relevanceScore, 1),
      accuracyScore: Math.min(accuracyScore, 1),
      combinedScore: Math.min(relevanceScore * 0.6 + accuracyScore * 0.4, 1),
      category: query.category,
      relatedCodes: query.relatedCodes,
      evidenceLevel,
      population,
    };
  }

  /**
   * Rate Limiting
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < RATE_LIMIT_MS) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * 사전 정의된 검색 쿼리 목록 (자동 수집용)
   */
  getDefaultQueries(): SearchQuery[] {
    return [
      { terms: 'HbA1c cardiovascular risk meta-analysis', category: '혈당', relatedCodes: ['FBS', 'HBA1C', 'DTC_T2DM'], minDate: '2020/01/01' },
      { terms: 'blood pressure reduction lifestyle intervention systematic review', category: '혈압', relatedCodes: ['BP_SYS', 'BP_DIA', 'DTC_HTN'], minDate: '2020/01/01' },
      { terms: 'LDL cholesterol statin cardiovascular meta-analysis', category: '이상지질혈증', relatedCodes: ['TC', 'LDL', 'HDL', 'TG'], minDate: '2020/01/01' },
      { terms: 'sleep duration cardiometabolic risk meta-analysis', category: '수면', relatedCodes: ['DTC_SLEEP', 'DTC_INSOMNIA'], minDate: '2020/01/01' },
      { terms: 'physical activity step count mortality meta-analysis', category: '활동량', relatedCodes: ['DTC_AEROBIC'], minDate: '2020/01/01' },
      { terms: 'vitamin D deficiency health outcomes Korean', category: '영양소', relatedCodes: ['DTC_VITD'], minDate: '2018/01/01' },
      { terms: 'polygenic risk score type 2 diabetes Korean', category: '유전체', relatedCodes: ['DTC_T2DM', 'DTC_FBS'], minDate: '2018/01/01' },
      { terms: 'genetic risk hypertension lifestyle modification', category: '유전체', relatedCodes: ['DTC_HTN', 'DTC_BP'], minDate: '2018/01/01' },
    ];
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }
}

export const pubmedCollector = new PubMedCollectorService();
