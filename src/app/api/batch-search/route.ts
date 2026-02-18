/**
 * Batch Search API Route
 * Uses service layer for separation of concerns
 * Single Responsibility: Only handles HTTP request/response
 * Dependency Inversion: Uses service container for all dependencies
 */

import { NextResponse } from "next/server";
import { getServiceContainer } from "@/lib/services";

export interface BatchSearchResult {
  registration: string;
  name: string;
  city: string;
  status: string;
  found: boolean;
}

export interface BatchSearchResponse {
  results: BatchSearchResult[];
  activeCount: number;
  inactiveCount: number;
  notFoundCount: number;
  totalProcessed: number;
}

/**
 * Handle batch search POST request
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    // Validation: Check file exists
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Get services from container (Dependency Injection via container)
    const container = getServiceContainer();
    const fileParserRegistry = container.getFileParserRegistry();
    const fileTypeDetector = container.getFileTypeDetector();
    const registrationExtractor = container.getRegistrationExtractor();
    const errorFormatter = container.getRegistrationExtractorErrorFormatter();
    const batchProcessor = container.getBatchProcessor();

    // Validate file type
    if (!fileParserRegistry.isSupported(file.name)) {
      return NextResponse.json(
        {
          error: "Unsupported file type. Supported formats: .csv, .xlsx, .xls",
        },
        { status: 400 },
      );
    }

    // Get file type and parser
    const fileType = fileTypeDetector.detect(file.name);
    if (fileType === "unknown") {
      return NextResponse.json(
        { error: "Unable to determine file type" },
        { status: 400 },
      );
    }

    const parser = fileParserRegistry.getParserForFile(file.name);
    if (!parser) {
      return NextResponse.json(
        { error: `No parser available for ${fileType} files` },
        { status: 400 },
      );
    }

    // Step 1: Parse file
    const arrayBuffer = await file.arrayBuffer();
    const parseResult = await parser.parse(arrayBuffer);

    // Step 2: Extract registration numbers
    const extractResult = registrationExtractor.extract(parseResult.data, {
      fileType,
    });

    // Validation: Check registration numbers found
    if (extractResult.registrationNumbers.length === 0) {
      return NextResponse.json(
        {
          error: errorFormatter.getErrorMessage(
            fileType,
            extractResult.skippedCount,
            extractResult.totalRows,
          ),
          details: {
            totalRows: extractResult.totalRows,
            skipped: extractResult.skippedCount,
          },
        },
        { status: 400 },
      );
    }

    // Step 3: Process batch
    const serviceResponse = await batchProcessor.process(
      extractResult.registrationNumbers,
    );

    // Map service response to API response format
    const apiResponse: BatchSearchResponse = {
      results: serviceResponse.results,
      activeCount: serviceResponse.statistics.activeCount,
      inactiveCount: serviceResponse.statistics.inactiveCount,
      notFoundCount: serviceResponse.statistics.notFoundCount,
      totalProcessed: serviceResponse.statistics.totalProcessed,
    };

    return NextResponse.json(apiResponse);
  } catch (error) {
    console.error("Error processing batch search:", error);
    return NextResponse.json(
      {
        error: "Failed to process file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
