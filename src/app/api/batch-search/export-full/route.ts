import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileContent = fileBuffer.toString("utf-8");

    // Split content by lines to extract metadata and data
    // Use /\\r?\\n/ to correctly handle both \\n and \\r\\n newlines
    const lines = fileContent.split(/\r?\n/);

    let panelistDetails: string[] = [];
    let dataLines: string[] = [];
    let headerFound = false;

    // Heuristic: Assume header is the first line that looks like a CSV header
    // and metadata lines come before it.
    // We'll look for common CSV header patterns or a line with "Professional council number"
    for (const line of lines) {
      if (!headerFound) {
        // Simple heuristic: If a line contains "Attended" and "Professional council number", it's likely the header.
        // Or if it starts with "User Name (Original Name)" from the example.
        if (
          line.includes("Attended") &&
          line.includes("Professional council number")
        ) {
          headerFound = true;
          dataLines.push(line); // Add the header line to dataLines
        } else if (line.startsWith("User Name (Original Name),")) {
          // Specific case from README example for Zoom reports
          headerFound = true;
          dataLines.push(line);
        } else if (line.trim() !== "") {
          // Collect non-empty lines as potential panelist details before header
          panelistDetails.push(line);
        }
      } else {
        dataLines.push(line);
      }
    }

    if (!headerFound && dataLines.length === 0) {
      return NextResponse.json(
        { error: "Could not find a valid CSV header or any data." },
        { status: 400 },
      );
    }

    // Join data lines back and parse as CSV
    const dataContent = dataLines.join("\n");
    // Ensure dataContent is not empty before passing to XLSX.read
    if (!dataContent.trim()) {
      return NextResponse.json(
        {
          error:
            "No valid data rows found in the CSV file after header detection.",
        },
        { status: 400 },
      );
    }

    // XLSX.read can handle CSV strings directly if type is 'string'
    const workbook = XLSX.read(dataContent, { type: "string" });
    const sheetName = workbook.SheetNames[0]; // Assuming the first sheet contains the data
    const json_data: any[] = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName],
    );

    const attendedMembers = json_data.filter(
      (row) =>
        row["Attended"] && String(row["Attended"]).toLowerCase() === "yes",
    );
    const didNotAttendMembers = json_data.filter(
      (row) =>
        !row["Attended"] || String(row["Attended"]).toLowerCase() !== "yes",
    );

    const newWorkbook = XLSX.utils.book_new();

    // Sheet 1: Attended Members
    const attendedWorksheet = XLSX.utils.json_to_sheet(attendedMembers);
    XLSX.utils.book_append_sheet(newWorkbook, attendedWorksheet, "Attended");

    // Sheet 2: Panelist Details (metadata)
    // Convert panelistDetails array to a format suitable for a sheet
    const panelistWorksheetData = panelistDetails.map((detail) => ({
      "Panelist Details": detail,
    }));
    // Only add panelist sheet if there are details
    if (panelistWorksheetData.length > 0) {
      const panelistWorksheet = XLSX.utils.json_to_sheet(panelistWorksheetData);
      XLSX.utils.book_append_sheet(newWorkbook, panelistWorksheet, "Panelist");
    }

    // Sheet 3: Did Not Attend Members
    const didNotAttendWorksheet = XLSX.utils.json_to_sheet(didNotAttendMembers);
    XLSX.utils.book_append_sheet(
      newWorkbook,
      didNotAttendWorksheet,
      "Did Not Attend",
    );

    const excelBuffer = XLSX.write(newWorkbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="HPCSA_Full_List_${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting full list:", error);
    return NextResponse.json(
      {
        error: "Failed to generate full export file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
