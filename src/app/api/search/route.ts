/**
 * Single Search API Route
 * Uses service layer for separation of concerns
 * Single Responsibility: Only handles HTTP request/response
 * Dependency Inversion: Uses service container for all dependencies
 */

import { NextResponse } from "next/server";
import { getServiceContainer, HPCSARecord } from "@/lib/services";

export interface HPCSAResult extends HPCSARecord {}

export interface SearchResponse {
  results: HPCSAResult[];
  message: string | null;
  error?: string;
}

/**
 * Handle single search POST request
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { registrationNumber } = await request.json();

    // Validation: Check registration number exists
    if (!registrationNumber) {
      return NextResponse.json(
        { error: "Registration number is required" },
        { status: 400 },
      );
    }

    // Get service from container (Dependency Injection via container)
    const container = getServiceContainer();
    const hpcsaService = container.getHPCSAService();

    console.log(`🔍 Searching for: ${registrationNumber}`);

    // Search using service
    const results = await hpcsaService.searchSingle(registrationNumber);

    if (results.length === 0) {
      return NextResponse.json({
        results: [],
        message: "No results found",
      });
    }

    console.log(`✅ Found ${results.length} record(s)`);

    return NextResponse.json({
      results,
      message: null,
    });
  } catch (error) {
    console.error("Error during HPCSA search:", error);
    return NextResponse.json(
      {
        error: "Failed to search HPCSA registration",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
