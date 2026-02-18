/**
 * Core types and interfaces for the HPCSA Search application
 * Following SOLID principles throughout
 */

// ============================================================================
// Domain Types
// ============================================================================

export interface HPCSARecord {
  name: string;
  registration: string;
  city: string;
  status: string;
}

export interface BatchSearchResult extends HPCSARecord {
  found: boolean;
  professionalCouncilName?: string;
  timeInSession?: string;
}

export interface BatchStatistics {
  activeCount: number;
  inactiveCount: number;
  notFoundCount: number;
  totalProcessed: number;
}

export interface BatchSearchResponse {
  results: BatchSearchResult[];
  statistics: BatchStatistics;
}

// ============================================================================
// File Parser Interface (ISP - focused interface)
// ============================================================================

export interface FileParseResult {
  data: Record<string, unknown>[];
  fileType: "csv" | "excel";
}

/**
 * File Parser Interface - Single responsibility for parsing
 */
export interface FileParser {
  /**
   * Parse a file buffer into structured data
   */
  parse(arrayBuffer: ArrayBuffer): Promise<FileParseResult>;
}

/**
 * File type detection strategy
 */
export interface FileTypeDetector {
  /**
   * Detect file type from filename
   */
  detect(fileName: string): "csv" | "excel" | "unknown";

  /**
   * Check if file type is supported
   */
  isSupported(fileName: string): boolean;
}

/**
 * File Parser Registry for Open/Closed Principle
 * Allows adding new parsers without modifying existing code
 */
export interface FileParserRegistry {
  /**
   * Register a parser for a specific file type
   */
  register(fileType: string, parser: FileParser): void;

  /**
   * Get parser for file type
   */
  getParser(fileType: string): FileParser | null;

  /**
   * Get parser for file name (auto-detects type)
   */
  getParserForFile(fileName: string): FileParser | null;

  /**
   * Check if file type is supported
   */
  isSupported(fileName: string): boolean;
}

// ============================================================================
// Registration Extractor Interfaces (ISP - segregated interfaces)
// ============================================================================

export interface ExtractRegistrationOptions {
  fileType: "csv" | "excel";
}

export interface ExtractRegistrationResult {
  registrationNumbers: string[];
  skippedCount: number;
  totalRows: number;
}

/**
 * Field mappings configuration for registration extraction
 */
export interface FieldMappings {
  csv: {
    attended: string[];
    timeInSession: string[];
    professionalCouncilName: string[];
    registration: string[];
  };
  excel: {
    attended?: string[];
    timeInSession?: string[];
    professionalCouncilName?: string[];
    registration: string[];
  };
}

/**
 * Core extraction interface - Single responsibility
 */
export interface RegistrationExtractor {
  /**
   * Extract registration numbers from parsed file data
   */
  extract(
    data: Record<string, unknown>[],
    options: ExtractRegistrationOptions,
  ): ExtractRegistrationResult;
}

/**
 * Error message formatting - separated concern
 */
export interface RegistrationExtractorErrorFormatter {
  /**
   * Get error message for missing registration numbers
   */
  getErrorMessage(
    fileType: "csv" | "excel",
    skippedCount: number,
    totalRows: number,
  ): string;
}

// ============================================================================
// HPCSA API Service Interface (ISP - focused interface)
// ============================================================================

export interface SearchOptions {
  timeoutMs?: number;
  maxRetries?: number;
}

export interface BatchSearchOptions extends SearchOptions {
  batchSize?: number;
  maxConcurrent?: number;
  delayBetweenBatchesMs?: number;
  onProgress?: (completed: number, total: number) => void;
}

export interface HPCSAAPIService {
  /**
   * Search for a single registration number
   */
  searchSingle(
    registrationNumber: string,
    options?: SearchOptions,
  ): Promise<HPCSARecord[]>;

  /**
   * Search for multiple registration numbers in batch
   */
  searchBatch(
    registrationNumbers: string[],
    options?: BatchSearchOptions,
  ): Promise<BatchSearchResult[]>;
}

// ============================================================================
// Batch Processor Interface
// ============================================================================

export interface BatchProcessorConfig {
  batchSize?: number;
  maxConcurrentRequests?: number;
  delayBetweenBatchesMs?: number;
}

export interface BatchProcessor {
  /**
   * Process a batch of registration numbers
   */
  process(
    registrationNumbers: string[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<BatchSearchResponse>;
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface HPCSAApiConfig {
  apiUrl: string;
  timeoutMs: number;
  maxRetries: number;
  batchSize: number;
  maxConcurrentRequests: number;
  delayBetweenBatchesMs: number;
}

// ============================================================================
// Service Container Types
// ============================================================================

export interface ServiceContainer {
  getFileParserRegistry(): FileParserRegistry;
  getFileTypeDetector(): FileTypeDetector;
  getRegistrationExtractor(): RegistrationExtractor;
  getRegistrationExtractorErrorFormatter(): RegistrationExtractorErrorFormatter;
  getHPCSAService(): HPCSAAPIService;
  getBatchProcessor(): BatchProcessor;
}
