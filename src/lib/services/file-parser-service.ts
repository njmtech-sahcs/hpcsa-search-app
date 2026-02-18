/**
 * File Parser Service
 * Single Responsibility Principle: Handles only file parsing
 * Strategy Pattern: Different parsing strategies for CSV and Excel
 * Open/Closed Principle: Registry pattern allows adding new parsers without modification
 */

import * as XLSX from "xlsx";
import {
  FileParser,
  FileParseResult,
  FileParserRegistry,
  FileTypeDetector,
} from "./types";

/**
 * CSV Parser Strategy
 * Handles Zoom-style reports with metadata headers
 */
export class CSVFileParser implements FileParser {
  async parse(arrayBuffer: ArrayBuffer): Promise<FileParseResult> {
    const textDecoder = new TextDecoder("utf-8");
    const csvText = textDecoder.decode(arrayBuffer);
    const workbook = XLSX.read(csvText, { type: "string" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get raw CSV data to find the actual header row
    const rawSheet = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
    }) as any[][];

    // Find the row containing "Attendee Details" or the header row with required fields
    let headerRowIndex = 0;
    for (let i = 0; i < rawSheet.length; i++) {
      const rowStr = rawSheet[i].join(" ").toLowerCase();
      if (
        rowStr.includes("attendee details") ||
        (rowStr.includes("attended") &&
          rowStr.includes("professional council number"))
      ) {
        headerRowIndex = i + 1; // Data starts after the header row
        break;
      }
    }

    // Parse with the correct header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      range: headerRowIndex,
    }) as Record<string, unknown>[];

    return {
      data: jsonData,
      fileType: "csv",
    };
  }
}

/**
 * Excel Parser Strategy
 * Standard Excel parsing without metadata handling
 */
export class ExcelFileParser implements FileParser {
  async parse(arrayBuffer: ArrayBuffer): Promise<FileParseResult> {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<
      string,
      unknown
    >[];

    return {
      data: jsonData,
      fileType: "excel",
    };
  }
}

/**
 * File Type Detector Implementation
 */
export class DefaultFileTypeDetector implements FileTypeDetector {
  private supportedExtensions: string[];

  constructor(supportedExtensions: string[] = [".csv", ".xlsx", ".xls"]) {
    this.supportedExtensions = supportedExtensions;
  }

  detect(fileName: string): "csv" | "excel" | "unknown" {
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.endsWith(".csv")) return "csv";
    if (lowerFileName.endsWith(".xlsx") || lowerFileName.endsWith(".xls"))
      return "excel";
    return "unknown";
  }

  isSupported(fileName: string): boolean {
    const lowerFileName = fileName.toLowerCase();
    return this.supportedExtensions.some((ext) => lowerFileName.endsWith(ext));
  }
}

/**
 * File Parser Registry Implementation
 * Open/Closed Principle: Register new parsers without modifying existing code
 */
export class FileParserRegistryImpl implements FileParserRegistry {
  private parsers: Map<string, FileParser>;
  private fileTypeDetector: FileTypeDetector;

  constructor(
    fileTypeDetector: FileTypeDetector,
    initialParsers?: Map<string, FileParser>,
  ) {
    // Dependency Injection: Both dependencies are injected
    this.fileTypeDetector = fileTypeDetector;
    this.parsers = initialParsers || new Map();
  }

  /**
   * Register a parser for a specific file type
   */
  register(fileType: string, parser: FileParser): void {
    this.parsers.set(fileType, parser);
  }

  /**
   * Get parser for file type
   */
  getParser(fileType: string): FileParser | null {
    return this.parsers.get(fileType) || null;
  }

  /**
   * Get parser for file name (auto-detects type)
   */
  getParserForFile(fileName: string): FileParser | null {
    const fileType = this.fileTypeDetector.detect(fileName);
    if (fileType === "unknown") return null;
    return this.getParser(fileType);
  }

  /**
   * Check if file type is supported
   */
  isSupported(fileName: string): boolean {
    const fileType = this.fileTypeDetector.detect(fileName);
    if (fileType === "unknown") return false;
    return this.parsers.has(fileType);
  }
}

/**
 * Factory function to create file parser registry with default parsers
 */
export function createFileParserRegistry(
  fileTypeDetector?: FileTypeDetector,
): FileParserRegistry {
  const detector = fileTypeDetector || new DefaultFileTypeDetector();
  const registry = new FileParserRegistryImpl(detector);

  // Register default parsers
  registry.register("csv", new CSVFileParser());
  registry.register("excel", new ExcelFileParser());

  return registry;
}

/**
 * Factory function to create file type detector
 */
export function createFileTypeDetector(
  supportedExtensions?: string[],
): FileTypeDetector {
  return new DefaultFileTypeDetector(supportedExtensions);
}
