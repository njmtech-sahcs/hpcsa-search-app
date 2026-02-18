/**
 * Service Container
 * Central composition root for all services
 * Dependency Injection: All dependencies are properly injected
 */

import {
  ServiceContainer,
  FileParserRegistry,
  FileTypeDetector,
  RegistrationExtractor,
  RegistrationExtractorErrorFormatter,
  HPCSAAPIService,
  BatchProcessor,
  HPCSAApiConfig,
  FieldMappings,
} from "./types";
import {
  createFileParserRegistry,
  createFileTypeDetector,
} from "./file-parser-service";
import {
  createRegistrationExtractorService,
  createRegistrationExtractorErrorFormatter,
  defaultFieldMappings,
} from "./registration-extractor-service";
import { createHPCSAService } from "./hpcsa-service";
import { createBatchProcessorService } from "./batch-processor-service";

/**
 * Service Container Configuration
 */
export interface ContainerConfig {
  apiConfig?: Partial<HPCSAApiConfig>;
  fieldMappings?: FieldMappings;
  supportedFileExtensions?: string[];
}

/**
 * Service Container Implementation
 * Composition Root: All dependencies are composed here
 */
export class ServiceContainerImpl implements ServiceContainer {
  private fileParserRegistry: FileParserRegistry;
  private fileTypeDetector: FileTypeDetector;
  private registrationExtractor: RegistrationExtractor;
  private registrationExtractorErrorFormatter: RegistrationExtractorErrorFormatter;
  private hpcsaService: HPCSAAPIService;
  private batchProcessor: BatchProcessor;

  constructor(config: ContainerConfig = {}) {
    // Step 1: Create low-level services first

    // File type detector
    this.fileTypeDetector = createFileTypeDetector(
      config.supportedFileExtensions,
    );

    // File parser registry (depends on file type detector)
    this.fileParserRegistry = createFileParserRegistry(this.fileTypeDetector);

    // Registration extractor (can have custom field mappings)
    const fieldMappings = config.fieldMappings || defaultFieldMappings;
    this.registrationExtractor =
      createRegistrationExtractorService(fieldMappings);
    this.registrationExtractorErrorFormatter =
      createRegistrationExtractorErrorFormatter(fieldMappings);

    // HPCSA API service
    this.hpcsaService = createHPCSAService(config.apiConfig);

    // Batch processor (depends on HPCSA service)
    this.batchProcessor = createBatchProcessorService(this.hpcsaService);
  }

  getFileParserRegistry(): FileParserRegistry {
    return this.fileParserRegistry;
  }

  getFileTypeDetector(): FileTypeDetector {
    return this.fileTypeDetector;
  }

  getRegistrationExtractor(): RegistrationExtractor {
    return this.registrationExtractor;
  }

  getRegistrationExtractorErrorFormatter(): RegistrationExtractorErrorFormatter {
    return this.registrationExtractorErrorFormatter;
  }

  getHPCSAService(): HPCSAAPIService {
    return this.hpcsaService;
  }

  getBatchProcessor(): BatchProcessor {
    return this.batchProcessor;
  }
}

/**
 * Singleton instance for application-wide use
 * Lazy initialization
 */
let containerInstance: ServiceContainerImpl | null = null;

/**
 * Get or create the service container
 * Uses singleton pattern for consistent service instances
 */
export function getServiceContainer(
  config?: ContainerConfig,
): ServiceContainer {
  if (!containerInstance) {
    containerInstance = new ServiceContainerImpl(config);
  }
  return containerInstance;
}

/**
 * Create a new service container instance
 * Use this for testing or when you need isolated instances
 */
export function createServiceContainer(
  config?: ContainerConfig,
): ServiceContainer {
  return new ServiceContainerImpl(config);
}

/**
 * Reset the singleton instance
 * Useful for testing
 */
export function resetServiceContainer(): void {
  containerInstance = null;
}
