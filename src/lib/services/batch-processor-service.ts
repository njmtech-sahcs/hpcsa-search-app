/**
 * Batch Processor Service
 * Single Responsibility Principle: Handles batch processing orchestration
 * Dependency Inversion Principle: Depends on HPCSAAPIService abstraction
 */

import {
  HPCSAAPIService,
  BatchSearchResult,
  BatchSearchResponse,
  BatchStatistics,
  BatchProcessor,
  BatchProcessorConfig,
  BatchSearchOptions,
} from "./types";

/**
 * Batch Processor Service Implementation
 * Orchestrates batch processing workflow
 */
export class BatchProcessorService implements BatchProcessor {
  private hpcsaService: HPCSAAPIService;
  private config: Required<BatchProcessorConfig>;

  constructor(
    hpcsaService: HPCSAAPIService,
    config: BatchProcessorConfig = {},
  ) {
    // Dependency Injection: HPCSA service is injected
    this.hpcsaService = hpcsaService;
    this.config = {
      batchSize: config.batchSize ?? 20,
      maxConcurrentRequests: config.maxConcurrentRequests ?? 10,
      delayBetweenBatchesMs: config.delayBetweenBatchesMs ?? 100,
    };
  }

  /**
   * Process a batch of registration numbers
   */
  async process(
    registrationNumbers: string[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<BatchSearchResponse> {
    const searchOptions: BatchSearchOptions = {
      batchSize: this.config.batchSize,
      maxConcurrent: this.config.maxConcurrentRequests,
      delayBetweenBatchesMs: this.config.delayBetweenBatchesMs,
      onProgress,
    };

    console.log(
      `Starting batch processing of ${registrationNumbers.length} registrations ` +
        `(batch size: ${this.config.batchSize}, concurrent requests: ${this.config.maxConcurrentRequests})`,
    );

    const results = await this.hpcsaService.searchBatch(
      registrationNumbers,
      searchOptions,
    );

    const statistics = this.calculateStatistics(results);

    console.log(
      `Batch processing complete: ${results.length} results ` +
        `(${statistics.activeCount} active, ${statistics.inactiveCount} inactive, ${statistics.notFoundCount} not found)`,
    );

    return {
      results,
      statistics,
    };
  }

  /**
   * Calculate batch statistics
   * Single Responsibility: Statistics calculation extracted to own method
   */
  private calculateStatistics(results: BatchSearchResult[]): BatchStatistics {
    const activeCount = results.filter(
      (r) => r.found && r.status.toLowerCase() === "active",
    ).length;

    const inactiveCount = results.filter(
      (r) => r.found && r.status.toLowerCase() !== "active",
    ).length;

    const notFoundCount = results.filter((r) => !r.found).length;

    return {
      activeCount,
      inactiveCount,
      notFoundCount,
      totalProcessed: results.length,
    };
  }
}

/**
 * Factory function to create batch processor service
 */
export function createBatchProcessorService(
  hpcsaService: HPCSAAPIService,
  config?: BatchProcessorConfig,
): BatchProcessor {
  return new BatchProcessorService(hpcsaService, config);
}
