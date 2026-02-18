/**
 * Registration Extractor Service
 * Single Responsibility Principle: Handles only registration number extraction
 * Interface Segregation Principle: Split interfaces for extraction and error formatting
 * Open/Closed Principle: Field mappings can be extended via configuration
 */

import {
  RegistrationExtractor,
  RegistrationExtractorErrorFormatter,
  ExtractRegistrationOptions,
  ExtractRegistrationResult,
  FieldMappings,
} from "./types";

/**
 * Default field mappings
 */
export const defaultFieldMappings: FieldMappings = {
  csv: {
    attended: ["Attended", "attended", "ATTENDED", "Did Attend", "did_attend"],
    timeInSession: [
      "Time in Session (minutes)",
      "Time in Session",
      "time in session (minutes)",
      "time in session",
      "Time in Session (minutes)",
      "Duration (minutes)",
      "duration",
    ],
    professionalCouncilName: [
      "Professional council name",
      "professional council name",
      "Professional Council Name",
      "Council Name",
      "council name",
      "CouncilName",
    ],
    registration: [
      "Professional council number",
      "professional council number",
      "Professional Council Number",
      "Council Number",
      "council number",
      "CouncilNumber",
    ],
  },
  excel: {
    attended: ["Attended", "attended", "ATTENDED", "Did Attend", "did_attend"],
    timeInSession: [
      "Time in Session (minutes)",
      "Time in Session",
      "time in session (minutes)",
      "time in session",
      "Duration (minutes)",
      "duration",
    ],
    professionalCouncilName: [
      "Professional council name",
      "professional council name",
      "Professional Council Name",
      "Council Name",
      "council name",
      "CouncilName",
    ],
    registration: [
      "Registration number",
      "registration number",
      "Registration Number",
      "RegistrationNumber",
      "Registration",
      "registration",
      "RegNo",
      "regNo",
    ],
  },
};

/**
 * Registration Extractor Implementation
 * Single responsibility: Only extracts registration numbers
 */
export class RegistrationExtractorService implements RegistrationExtractor {
  private fieldMappings: FieldMappings;

  constructor(fieldMappings: FieldMappings = defaultFieldMappings) {
    // Dependency Injection: Field mappings can be customized
    this.fieldMappings = fieldMappings;
  }

  /**
   * Extract registration numbers from parsed file data
   */
  extract(
    data: Record<string, unknown>[],
    options: ExtractRegistrationOptions,
  ): ExtractRegistrationResult {
    const registrationNumbers: string[] = [];
    let skippedCount = 0;
    let skippedByAttendanceCount = 0;
    let skippedByCouncilCount = 0;
    // let skippedByTimeCount = 0;

    for (const row of data) {
      // Check 'Attended' field if configured for this file type
      const attendedFields = this.fieldMappings[options.fileType]?.attended;
      if (attendedFields && attendedFields.length > 0) {
        const shouldProcess = this.shouldProcessRow(row, attendedFields);
        if (!shouldProcess) {
          skippedByAttendanceCount++;
          skippedCount++;
          continue;
        }
      }

      // Check 'Professional council name' field - must be HPCSA (CSV files only)
      // Excel files don't have this column, so skip this check for them
      const councilNameFields =
        this.fieldMappings[options.fileType]?.professionalCouncilName;
      if (
        councilNameFields &&
        councilNameFields.length > 0 &&
        options.fileType === "csv"
      ) {
        const isHPCSA = this.isHPCSARegistered(row, councilNameFields);
        if (!isHPCSA) {
          skippedByCouncilCount++;
          skippedCount++;
          continue;
        }
      }

      // Check 'Time in Session' field if configured for this file type
      // COMMENTED OUT: No minimum time requirement
      // const timeInSessionFields = this.fieldMappings[options.fileType]?.timeInSession;
      // if (timeInSessionFields && timeInSessionFields.length > 0) {
      //   const meetsTimeRequirement = this.meetsTimeRequirement(row, timeInSessionFields, 45);
      //   if (!meetsTimeRequirement) {
      //     skippedByTimeCount++;
      //     skippedCount++;
      //     continue;
      //   }
      // }

      // Get registration number based on file type
      const regNumber = this.getRegistrationNumber(row, options.fileType);

      if (regNumber) {
        const regStr = regNumber.trim();
        if (regStr && !registrationNumbers.includes(regStr)) {
          registrationNumbers.push(regStr);
        }
      } else {
        skippedCount++;
      }
    }

    console.log(
      `Extraction complete: ${registrationNumbers.length} valid, ${skippedByAttendanceCount} skipped by attendance, ${skippedByCouncilCount} skipped by council`,
    );

    return {
      registrationNumbers,
      skippedCount,
      totalRows: data.length,
    };
  }

  /**
   * Check if a row should be processed based on 'Attended' field
   */
  private shouldProcessRow(
    row: Record<string, unknown>,
    attendedFields: string[],
  ): boolean {
    const attendedValue = this.getFieldValue(row, attendedFields);

    // Skip if no attended field
    if (
      attendedValue === undefined ||
      attendedValue === null ||
      attendedValue === ""
    ) {
      return false;
    }

    const attendedStr = String(attendedValue).trim().toLowerCase();

    // Skip falsy values
    if (
      attendedStr === "no" ||
      attendedStr === "false" ||
      attendedStr === "0"
    ) {
      return false;
    }

    return true;
  }

  /**
   * Check if attendee is registered with HPCSA
   * Strict check: Only HPCSA is allowed, no blanks
   */
  private isHPCSARegistered(
    row: Record<string, unknown>,
    councilNameFields: string[],
  ): boolean {
    const councilNameValue = this.getFieldValue(row, councilNameFields);

    // Skip if no council name field (blank/not provided)
    if (
      councilNameValue === undefined ||
      councilNameValue === null ||
      councilNameValue === ""
    ) {
      return false; // REJECT: Blank/empty
    }

    const councilName = String(councilNameValue).trim().toUpperCase();

    // Strict check: Only HPCSA is allowed
    if (councilName !== "HPCSA") {
      return false; // REJECT: Not HPCSA (SANC, SAPC, etc.)
    }

    return true; // ✓ Only HPCSA
  }

  /**
   * Check if attendee meets minimum time requirement
   */
  private meetsTimeRequirement(
    row: Record<string, unknown>,
    timeInSessionFields: string[],
    minimumMinutes: number,
  ): boolean {
    const timeValue = this.getFieldValue(row, timeInSessionFields);

    // Skip if no time field
    if (timeValue === undefined || timeValue === null || timeValue === "") {
      return false;
    }

    // Parse time value (handle string or number)
    const timeStr = String(timeValue).trim();
    const timeMinutes = parseInt(timeStr, 10);

    // Invalid time value
    if (isNaN(timeMinutes)) {
      return false;
    }

    // Check if meets minimum requirement
    return timeMinutes >= minimumMinutes;
  }

  /**
   * Get registration number from row based on file type
   */
  private getRegistrationNumber(
    row: Record<string, unknown>,
    fileType: "csv" | "excel",
  ): string | null {
    const fields =
      fileType === "csv"
        ? this.fieldMappings.csv.registration
        : this.fieldMappings.excel.registration;

    const value = this.getFieldValue(row, fields);

    if (!value) {
      return null;
    }

    return String(value).trim();
  }

  /**
   * Get the first non-empty value from a list of possible field names
   */
  private getFieldValue(
    row: Record<string, unknown>,
    possibleFieldNames: string[],
  ): unknown {
    for (const fieldName of possibleFieldNames) {
      const value = row[fieldName];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
    return undefined;
  }
}

/**
 * Registration Extractor Error Formatter
 * Single responsibility: Only formats error messages
 * Interface Segregation: Separated from extraction logic
 */
export class RegistrationExtractorErrorFormatterService implements RegistrationExtractorErrorFormatter {
  private fieldMappings: FieldMappings;

  constructor(fieldMappings: FieldMappings = defaultFieldMappings) {
    // Dependency Injection: Field mappings can be customized
    this.fieldMappings = fieldMappings;
  }

  /**
   * Get error message for missing registration numbers
   */
  getErrorMessage(
    fileType: "csv" | "excel",
    skippedCount: number,
    totalRows: number,
  ): string {
    const expectedField = this.getExpectedFieldName(fileType);
    const csvNote =
      fileType === "csv"
        ? " Also ensure 'Attended' field is present and set to 'Yes' for rows to process."
        : "";

    return `No registration numbers found. Ensure your file has '${expectedField}' column.${csvNote} Skipped ${skippedCount} of ${totalRows} rows.`;
  }

  /**
   * Get the expected registration field name for error messages
   */
  private getExpectedFieldName(fileType: "csv" | "excel"): string {
    const fields =
      fileType === "csv"
        ? this.fieldMappings.csv.registration
        : this.fieldMappings.excel.registration;
    return fields[0]; // Return primary field name
  }
}

/**
 * Factory function to create registration extractor service
 */
export function createRegistrationExtractorService(
  fieldMappings?: FieldMappings,
): RegistrationExtractor {
  return new RegistrationExtractorService(fieldMappings);
}

/**
 * Factory function to create error formatter service
 */
export function createRegistrationExtractorErrorFormatter(
  fieldMappings?: FieldMappings,
): RegistrationExtractorErrorFormatter {
  return new RegistrationExtractorErrorFormatterService(fieldMappings);
}
