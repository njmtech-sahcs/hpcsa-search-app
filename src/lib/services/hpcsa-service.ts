/**
 * HPCSA API Service
 * Single Responsibility Principle: Handles only HPCSA API communication
 * Dependency Inversion Principle: Implements HPCSAAPIService interface
 */

import {
  HPCSAAPIService,
  HPCSARecord,
  BatchSearchResult,
  SearchOptions,
  BatchSearchOptions,
  HPCSAApiConfig,
} from "./types";

interface HPCSAApiResponse {
  data: any[][];
  headers: any[];
  error: string | null;
}

/**
 * Default API configuration
 */
const defaultConfig: HPCSAApiConfig = {
  apiUrl:
    process.env.HPCSA_API_URL ||
    "https://hpcsaonline.custhelp.com/cc/ReportController/getDataFromRnow",
  timeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || "15000", 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || "3", 10),
  batchSize: parseInt(process.env.BATCH_SIZE || "20", 10),
  maxConcurrentRequests: parseInt(
    process.env.MAX_CONCURRENT_REQUESTS || "5",
    10,
  ),
  delayBetweenBatchesMs: parseInt(process.env.REQUEST_DELAY_MS || "200", 10),
};

/**
 * HPCSA API Service Implementation
 */
export class HPCSAService implements HPCSAAPIService {
  private config: HPCSAApiConfig;

  constructor(config: Partial<HPCSAApiConfig> = {}) {
    // Dependency Injection: Configuration can be injected
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Search for a single registration number
   */
  async searchSingle(
    registrationNumber: string,
    options: SearchOptions = {},
  ): Promise<HPCSARecord[]> {
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;

    try {
      const result = await this.executeSearch(registrationNumber, timeoutMs);
      return this.parseSearchResults(result, registrationNumber);
    } catch (error) {
      console.error(
        `Error searching ${registrationNumber}:`,
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }
  }

  /**
   * Search for multiple registration numbers in batch
   */
  async searchBatch(
    registrationNumbers: string[],
    options: BatchSearchOptions = {},
  ): Promise<BatchSearchResult[]> {
    const {
      maxConcurrent = this.config.maxConcurrentRequests,
      delayBetweenBatchesMs = this.config.delayBetweenBatchesMs,
      timeoutMs = this.config.timeoutMs,
      onProgress,
    } = options;

    const results: BatchSearchResult[] = [];
    const totalBatches = Math.ceil(registrationNumbers.length / maxConcurrent);

    console.log(
      `Starting batch processing: ${registrationNumbers.length} registrations, ${maxConcurrent} concurrent`,
    );

    for (let i = 0; i < registrationNumbers.length; i += maxConcurrent) {
      const batch = registrationNumbers.slice(i, i + maxConcurrent);
      const batchNumber = Math.floor(i / maxConcurrent) + 1;

      console.log(
        `Processing batch ${batchNumber}/${totalBatches}: ${batch.length} registrations`,
      );

      const batchStartTime = Date.now();
      const batchResults = await Promise.all(
        batch.map((reg) => this.searchSingleAsBatchResult(reg, { timeoutMs })),
      );
      const batchDuration = Date.now() - batchStartTime;

      results.push(...batchResults);

      const successCount = batchResults.filter((r) => r.found).length;
      console.log(
        `Batch ${batchNumber} complete in ${batchDuration}ms: ${successCount}/${batch.length} found`,
      );

      onProgress?.(
        Math.min(i + maxConcurrent, registrationNumbers.length),
        registrationNumbers.length,
      );

      // Rate limiting: delay between batches
      if (i + maxConcurrent < registrationNumbers.length) {
        await this.delay(delayBetweenBatchesMs);
      }
    }

    const totalFound = results.filter((r) => r.found).length;
    console.log(
      `Batch processing complete: ${totalFound}/${registrationNumbers.length} found`,
    );

    return results;
  }

  /**
   * Execute the actual API request
   */
  private async executeSearch(
    registrationNumber: string,
    timeoutMs: number,
  ): Promise<HPCSAApiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `regNumber=${encodeURIComponent(registrationNumber)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Parse API response into HPCSARecord array
   */
  private parseSearchResults(
    result: HPCSAApiResponse,
    registrationNumber: string,
  ): HPCSARecord[] {
    if (result.error || !result.data || result.data.length === 0) {
      return [];
    }

    // Data columns: 0:Title, 1:Surname, 2:Fullname, 3:Registration, 4:City, 5:PostalCode, 6:Category, 7:Status
    return result.data.map((row) => ({
      name: `${row[0] || ""} ${row[1] || ""} ${row[2] || ""}`.trim(),
      // Normalize registration: remove spaces to match input format
      registration: (row[3] || registrationNumber)
        .toString()
        .replace(/\s+/g, ""),
      city: row[4] || "",
      status: row[7] || "",
    }));
  }

  /**
   * Convert single search result to batch result format
   * Includes single retry on failure for consistency
   */
  private async searchSingleAsBatchResult(
    registrationNumber: string,
    options: SearchOptions,
  ): Promise<BatchSearchResult> {
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;

    try {
      const result = await this.executeSearch(registrationNumber, timeoutMs);
      const records = this.parseSearchResults(result, registrationNumber);

      if (records.length === 0) {
        return {
          registration: registrationNumber,
          name: "",
          city: "",
          status: "",
          found: false,
        };
      }

      const record = records[0];
      return {
        ...record,
        found: true,
      };
    } catch (error) {
      // Single retry on error for consistency
      console.log(`Retry for ${registrationNumber} after error`);
      try {
        await this.delay(500);
        const result = await this.executeSearch(registrationNumber, timeoutMs);
        const records = this.parseSearchResults(result, registrationNumber);

        if (records.length === 0) {
          return {
            registration: registrationNumber,
            name: "",
            city: "",
            status: "",
            found: false,
          };
        }

        const record = records[0];
        return {
          ...record,
          found: true,
        };
      } catch (retryError) {
        console.error(
          `Error searching ${registrationNumber} (after retry):`,
          retryError instanceof Error ? retryError.message : String(retryError),
        );
        return {
          registration: registrationNumber,
          name: "",
          city: "",
          status: "",
          found: false,
        };
      }
    }
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create HPCSA service with default configuration
 */
export function createHPCSAService(
  config?: Partial<HPCSAApiConfig>,
): HPCSAAPIService {
  return new HPCSAService(config);
}
