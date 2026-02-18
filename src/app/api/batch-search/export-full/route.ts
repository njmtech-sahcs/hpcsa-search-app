import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

// --- Styling Constants ---
const FONT_FAMILY = "Calibri";
const DEFAULT_FONT_SIZE = 11;
const HEADER_FONT_SIZE = 11;
const TITLE_FONT_SIZE = 16;
const HEADER_FILL_COLOR = "FF1F4E78"; // Dark Blue
const HEADER_FONT_COLOR = "FFFFFFFF"; // White
const TITLE_FILL_COLOR = "FFD9EAF7"; // Light Blue
const ALTERNATING_ROW_FILL_COLOR = "FFF2F2F2"; // Light Gray
const THIN_BORDER_COLOR = "FFBFBFBF"; // Thin Gray
const THICK_BORDER_COLOR = "FF000000"; // Black

// Helper to create a cell style object
const createCellStyle = (
  alignment: { horizontal?: string; vertical?: string; wrapText?: boolean } = {
    vertical: "middle",
  },
  font: { name?: string; sz?: number; b?: boolean; color?: { rgb: string } } = {
    name: FONT_FAMILY,
    sz: DEFAULT_FONT_SIZE,
    color: { rgb: THICK_BORDER_COLOR },
  },
  fill?: { fgColor: { rgb: string } },
  border?: { top?: any; bottom?: any; left?: any; right?: any },
  numFmt?: string,
) => ({
  alignment,
  font,
  fill,
  border,
  numFmt,
});

// Define border styles
const thinBorder = {
  style: "thin",
  color: { rgb: THIN_BORDER_COLOR },
};
const thickBorder = {
  style: "thick",
  color: { rgb: THICK_BORDER_COLOR },
};

// Common Headers for Attended and Did Not Attend sheets
const commonHeaders = [
  "Attended", // 0
  "User Name (Original Name)", // 1
  "First Name", // 2
  "Last Name", // 3
  "Email", // 4
  "City", // 5
  "Country/Region", // 6
  "Phone", // 7
  "Organization", // 8
  "Job Title", // 9
  "Questions & Comments", // 10
  "Registration Time", // 11
  "Approval Status", // 12
  "Join Time", // 13
  "Leave Time", // 14
  "Time in Session (minutes)", // 15
  "Is Guest", // 16
  "Professional council name", // 17
  "Professional council number", // 18
  "Are you an active member of the Southern African HIV Clinicians Society?", // 19
  "If you’re not a SAHCS member, would you like to be contacted to become one? SAHCS Membership is free for 2026.", // 20
  "What is your profession?", // 21
  "Category of employing institution/organisation/business", // 22
  "Country/Region Name", // 23
];
const COMMON_LAST_COL = XLSX.utils.encode_col(commonHeaders.length - 1); // X for 24 columns

// Common Column Widths for Attended and Did Not Attend sheets
const commonColWidths = [
  { wch: 12 },
  { wch: 28 },
  { wch: 18 },
  { wch: 18 },
  { wch: 30 },
  { wch: 18 },
  { wch: 18 },
  { wch: 18 },
  { wch: 25 },
  { wch: 22 },
  { wch: 40 },
  { wch: 20 },
  { wch: 18 },
  { wch: 20 },
  { wch: 20 },
  { wch: 22 },
  { wch: 12 },
  { wch: 22 },
  { wch: 20 },
  { wch: 45 },
  { wch: 60 },
  { wch: 30 },
  { wch: 35 },
  { wch: 25 },
];

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileContent = fileBuffer.toString("utf-8");

    const lines = fileContent.split(/\r?\n/);

    // --- Metadata Extraction for Panelist Sheet ---
    let sessionTopic = "";
    let sessionActualStartTime = "";
    let sessionTotalUsers = "";
    let panelistName = "";
    let panelistEmail = "";
    let extractedPanelistRecords: any[] = []; // To store data for panelist table

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("Topic,Webinar ID")) {
        const sessionDataLine = lines[i + 1];
        if (sessionDataLine) {
          const sessionDetailsHeaderParts = line.split(",");
          const sessionDataParts = sessionDataLine.split(
            /,(?=(?:(?:[^"]*"){2})*[^"]*$)/,
          );

          const topicIndex = sessionDetailsHeaderParts.indexOf("Topic");
          const actualStartTimeIndex =
            sessionDetailsHeaderParts.indexOf("Actual Start Time");
          const totalUsersIndex =
            sessionDetailsHeaderParts.indexOf("Total Users");

          if (topicIndex !== -1 && sessionDataParts[topicIndex])
            sessionTopic = sessionDataParts[topicIndex].trim();
          if (
            actualStartTimeIndex !== -1 &&
            sessionDataParts[actualStartTimeIndex]
          )
            sessionActualStartTime = sessionDataParts[actualStartTimeIndex]
              .trim()
              .replace(/"/g, "");
          if (totalUsersIndex !== -1 && sessionDataParts[totalUsersIndex])
            sessionTotalUsers = sessionDataParts[totalUsersIndex].trim();
        }
      } else if (
        line.startsWith("Host Details,") ||
        line.startsWith("Panelist Details,")
      ) {
        const dataHeaderLine = lines[i + 1]; // e.g., Attended,User Name (Original Name),...
        const dataLine = lines[i + 2]; // e.g., Yes,Southern African HIV Clinicians Society,...

        if (
          dataHeaderLine &&
          dataLine &&
          dataHeaderLine.startsWith("Attended,User Name")
        ) {
          const parsedRecord: Record<string, string> = {};
          const headers = dataHeaderLine.split(",");
          const values = dataLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

          headers.forEach((header, index) => {
            parsedRecord[header.trim()] = values[index]
              ? values[index].trim().replace(/"/g, "")
              : "";
          });
          extractedPanelistRecords.push(parsedRecord);

          // For the metadata display, we'll take the first Panelist/Host found
          if (!panelistName && parsedRecord["User Name (Original Name)"]) {
            panelistName = parsedRecord["User Name (Original Name)"];
          }
          if (!panelistEmail && parsedRecord["Email"]) {
            panelistEmail = parsedRecord["Email"];
          }
        }
      }
    }
    // --- End Metadata Extraction ---

    let mainDataHeaderIndex = -1;
    // Find the start of the main Attendee Details table
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("Attendee Details,")) {
        mainDataHeaderIndex = i + 1; // The actual header is the line after "Attendee Details,"
        break;
      }
    }

    if (mainDataHeaderIndex === -1) {
      return NextResponse.json(
        {
          error:
            "Could not find the main 'Attendee Details' section in the CSV.",
        },
        { status: 400 },
      );
    }

    // Slice the lines to only include the main table data starting from its header
    const dataLinesOnly = lines.slice(mainDataHeaderIndex);

    const dataContent = dataLinesOnly.join("\n");
    if (!dataContent.trim()) {
      return NextResponse.json(
        {
          error:
            "No valid data rows found in the CSV file after header detection.",
        },
        { status: 400 },
      );
    }

    const workbook = XLSX.read(dataContent, { type: "string" });
    const sheetName = workbook.SheetNames[0];
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

    // --- SHEET 1: "Attended" ---
    const attendedWs = XLSX.utils.json_to_sheet(attendedMembers, {
      header: commonHeaders,
      skipHeader: true,
    });

    // Manually add title and headers
    XLSX.utils.sheet_add_aoa(
      attendedWs,
      [["Event Attendance Report – Attended"]],
      { origin: "A1" },
    );
    XLSX.utils.sheet_add_aoa(attendedWs, [commonHeaders], { origin: "A2" });

    // Column Widths
    attendedWs["!cols"] = commonColWidths;

    // Merged Cells (A1:X1)
    if (!attendedWs["!merges"]) attendedWs["!merges"] = [];
    attendedWs["!merges"].push(
      XLSX.utils.decode_range(`A1:${COMMON_LAST_COL}1`),
    );

    // Styles for Title (A1)
    const titleCellA1 = attendedWs["A1"];
    if (titleCellA1) {
      titleCellA1.s = createCellStyle(
        { horizontal: "center", vertical: "middle", wrapText: false },
        {
          name: FONT_FAMILY,
          sz: TITLE_FONT_SIZE,
          b: true,
          color: { rgb: THICK_BORDER_COLOR },
        },
        { fgColor: { rgb: TITLE_FILL_COLOR } },
      );
      attendedWs["!rows"] = attendedWs["!rows"] || [];
      attendedWs["!rows"][0] = { hpt: 30 }; // Row height for Row 1
    }

    // Styles for Headers (Row 2)
    const headerRowRange = XLSX.utils.decode_range(`A2:${COMMON_LAST_COL}2`);
    for (let C = headerRowRange.s.c; C <= headerRowRange.e.c; ++C) {
      const cell_address = XLSX.utils.encode_cell({ r: 1, c: C }); // Row 2
      if (!attendedWs[cell_address]) attendedWs[cell_address] = { t: "s" }; // ensure cell exists
      attendedWs[cell_address].s = createCellStyle(
        { horizontal: "center", vertical: "middle", wrapText: true },
        {
          name: FONT_FAMILY,
          sz: HEADER_FONT_SIZE,
          b: true,
          color: { rgb: HEADER_FONT_COLOR },
        },
        { fgColor: { rgb: HEADER_FILL_COLOR } },
        { bottom: thickBorder },
      );
    }

    // Data Cell Alignment and Formatting
    const dataStartRow = 2; // Data starts from row 3 (0-indexed 2)
    const dataEndRow = dataStartRow + attendedMembers.length - 1;
    for (let R = dataStartRow; R <= dataEndRow; ++R) {
      // Alternating row fill
      if ((R - dataStartRow + 1) % 2 !== 0) {
        // Odd data rows get fill (actual row numbers 3,5,7...)
        for (let C = 0; C < commonHeaders.length; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!attendedWs[cell_address]) attendedWs[cell_address] = { t: "s" };
          if (!attendedWs[cell_address].s) attendedWs[cell_address].s = {};
          attendedWs[cell_address].s.fill = {
            fgColor: { rgb: ALTERNATING_ROW_FILL_COLOR },
          };
        }
      }

      // Apply specific alignment and date formats
      const emailCol = 4; // E
      const orgCol = 8; // I
      const questionsCol = 10; // K
      const regTimeCol = 11; // L
      const joinTimeCol = 13; // N
      const leaveTimeCol = 14; // O
      const timeInSessionCol = 15; // P
      const attendedCol = 0; // A
      const isGuestCol = 16; // Q
      const questionnaireQ1Col = 19; // T (Are you an active...)
      const questionnaireQ2Col = 20; // U (If you’re not a SAHCS member...)
      const questionnaireQ3Col = 21; // V (What is your profession?)
      const questionnaireQ4Col = 22; // W (Category of employing...)

      // Name, Email, Organization fields: Left
      for (let col of [1, 2, 3, emailCol, orgCol, questionsCol]) {
        // User Name, First, Last, Email, Organization, Questions & Comments
        const cell_address = XLSX.utils.encode_cell({ r: R, c: col });
        if (attendedWs[cell_address]) {
          if (!attendedWs[cell_address].s) attendedWs[cell_address].s = {};
          attendedWs[cell_address].s.alignment = {
            horizontal: "left",
            vertical: "middle",
          };
        }
      }

      // Questionnaire columns (T–W): Left + Wrap Text
      for (let col of [
        questionnaireQ1Col,
        questionnaireQ2Col,
        questionnaireQ3Col,
        questionnaireQ4Col,
      ]) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: col });
        if (attendedWs[cell_address]) {
          if (!attendedWs[cell_address].s) attendedWs[cell_address].s = {};
          attendedWs[cell_address].s.alignment = {
            horizontal: "left",
            vertical: "middle",
            wrapText: true,
          };
        }
      }

      // Time / Date columns (L–O): Center, YYYY-MM-DD HH:MM
      for (let col of [regTimeCol, joinTimeCol, leaveTimeCol]) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: col });
        if (attendedWs[cell_address]) {
          if (!attendedWs[cell_address].s) attendedWs[cell_address].s = {};
          attendedWs[cell_address].s.alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          attendedWs[cell_address].s.numFmt = "YYYY-MM-DD HH:MM";
        }
      }
      // Time in Session - number format, center
      const cell_address_tis = XLSX.utils.encode_cell({
        r: R,
        c: timeInSessionCol,
      });
      if (attendedWs[cell_address_tis]) {
        if (!attendedWs[cell_address_tis].s)
          attendedWs[cell_address_tis].s = {};
        attendedWs[cell_address_tis].s.alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        attendedWs[cell_address_tis].s.numFmt = "0"; // 0 decimals
      }

      // Boolean fields (Attended, Is Guest): Center
      for (let col of [attendedCol, isGuestCol]) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: col });
        if (attendedWs[cell_address]) {
          if (!attendedWs[cell_address].s) attendedWs[cell_address].s = {};
          attendedWs[cell_address].s.alignment = {
            horizontal: "center",
            vertical: "middle",
          };
        }
      }

      // Default data cell style
      for (let C = 0; C < commonHeaders.length; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (attendedWs[cell_address] && !attendedWs[cell_address].s) {
          attendedWs[cell_address].s = createCellStyle(
            { vertical: "middle" },
            {
              name: FONT_FAMILY,
              sz: DEFAULT_FONT_SIZE,
              color: { rgb: THICK_BORDER_COLOR },
            },
          );
        } else if (attendedWs[cell_address] && attendedWs[cell_address].s) {
          // Ensure default font and color if not already set by specific rules
          attendedWs[cell_address].s.font = attendedWs[cell_address].s.font || {
            name: FONT_FAMILY,
            sz: DEFAULT_FONT_SIZE,
            color: { rgb: THICK_BORDER_COLOR },
          };
        }
      }
    }

    // Borders for data area (from Row 2 onwards)
    const tableRange = XLSX.utils.decode_range(
      `A2:${COMMON_LAST_COL}${attendedMembers.length + 1}`,
    );
    for (let R = tableRange.s.r; R <= tableRange.e.r; ++R) {
      for (let C = tableRange.s.c; C <= tableRange.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!attendedWs[cell_address]) attendedWs[cell_address] = { t: "s" };

        if (!attendedWs[cell_address].s) attendedWs[cell_address].s = {};
        attendedWs[cell_address].s.border = {
          top: thinBorder,
          bottom: thinBorder,
          left: thinBorder,
          right: thinBorder,
        };
      }
    }

    // Outer thick border
    const outerBorderRange = XLSX.utils.decode_range(
      `A2:${COMMON_LAST_COL}${attendedMembers.length + 1}`,
    );
    for (let C = outerBorderRange.s.c; C <= outerBorderRange.e.c; ++C) {
      const top_cell = XLSX.utils.encode_cell({
        r: outerBorderRange.s.r,
        c: C,
      });
      if (!attendedWs[top_cell].s) attendedWs[top_cell].s = {};
      attendedWs[top_cell].s.border.top = thickBorder;

      const bottom_cell = XLSX.utils.encode_cell({
        r: outerBorderRange.e.r,
        c: C,
      });
      if (!attendedWs[bottom_cell].s) attendedWs[bottom_cell].s = {};
      attendedWs[bottom_cell].s.border.bottom = thickBorder;
    }
    for (let R = outerBorderRange.s.r; R <= outerBorderRange.e.r; ++R) {
      const left_cell = XLSX.utils.encode_cell({
        r: R,
        c: outerBorderRange.s.c,
      });
      if (!attendedWs[left_cell].s) attendedWs[left_cell].s = {};
      attendedWs[left_cell].s.border.left = thickBorder;

      const right_cell = XLSX.utils.encode_cell({
        r: R,
        c: outerBorderRange.e.c,
      });
      if (!attendedWs[right_cell].s) attendedWs[right_cell].s = {};
      attendedWs[right_cell].s.border.right = thickBorder;
    }

    attendedWs["!autofilter"] = {
      ref: `A2:${COMMON_LAST_COL}${attendedMembers.length + 1}`,
    };
    attendedWs["!freeze"] = { xf: 0, yf: 2 }; // Freeze Row 2 (0-indexed 1)

    XLSX.utils.book_append_sheet(newWorkbook, attendedWs, "Attended");

    // --- SHEET 2: "Panelist" ---
    const panelistWs = XLSX.utils.json_to_sheet([]); // Start with an empty sheet for custom layout

    // Title (A1:F1 merged)
    XLSX.utils.sheet_add_aoa(panelistWs, [["Panelist Attendance Report"]], {
      origin: "A1",
    });
    const PANEL_TABLE_HEADERS = [
      "Attended",
      "User Name (Original Name)",
      "Email",
      "Join Time",
      "Leave Time",
      "Time in Session (minutes)",
      "Is Guest",
      "Country/Region Name",
    ];
    const PANEL_TABLE_LAST_COL = XLSX.utils.encode_col(
      PANEL_TABLE_HEADERS.length - 1,
    ); // H for 8 columns

    if (!panelistWs["!merges"]) panelistWs["!merges"] = [];
    panelistWs["!merges"].push(
      XLSX.utils.decode_range(`A1:${PANEL_TABLE_LAST_COL}1`),
    ); // Merge title across max columns used

    const titleCellPanelistA1 = panelistWs["A1"];
    if (titleCellPanelistA1) {
      titleCellPanelistA1.s = createCellStyle(
        { horizontal: "center", vertical: "middle", wrapText: false },
        {
          name: FONT_FAMILY,
          sz: TITLE_FONT_SIZE,
          b: true,
          color: { rgb: THICK_BORDER_COLOR },
        },
        { fgColor: { rgb: TITLE_FILL_COLOR } },
      );
    }
    panelistWs["!rows"] = panelistWs["!rows"] || [];
    panelistWs["!rows"][0] = { hpt: 30 }; // Row height for Row 1

    // Metadata Section (Rows 3-7)
    const metadataRows = [
      ["Panelist Name:", panelistName],
      ["Email:", panelistEmail],
      ["Session Title:", sessionTopic],
      [
        "Session Date:",
        sessionActualStartTime ? sessionActualStartTime.split(" ")[0] : "",
      ], // Extract date part
      ["Total Attendees:", sessionTotalUsers],
    ];

    XLSX.utils.sheet_add_aoa(panelistWs, metadataRows, { origin: "A3" });

    // Formatting for metadata labels (Column A, Rows 3-7)
    for (let R = 2; R <= 6; ++R) {
      // Rows 3-7 (0-indexed 2-6)
      const cell_address_A = XLSX.utils.encode_cell({ r: R, c: 0 }); // Column A
      if (panelistWs[cell_address_A]) {
        if (!panelistWs[cell_address_A].s) panelistWs[cell_address_A].s = {};
        panelistWs[cell_address_A].s.font = {
          name: FONT_FAMILY,
          sz: DEFAULT_FONT_SIZE,
          b: true,
          color: { rgb: THICK_BORDER_COLOR },
        };
        panelistWs[cell_address_A].s.alignment = { vertical: "middle" };
      }
      // Column B values (regular font)
      const cell_address_B = XLSX.utils.encode_cell({ r: R, c: 1 }); // Column B
      if (panelistWs[cell_address_B]) {
        if (!panelistWs[cell_address_B].s) panelistWs[cell_address_B].s = {};
        panelistWs[cell_address_B].s.font = {
          name: FONT_FAMILY,
          sz: DEFAULT_FONT_SIZE,
          b: false,
          color: { rgb: THICK_BORDER_COLOR },
        };
        panelistWs[cell_address_B].s.alignment = { vertical: "middle" };
        // For Session Date, apply date format if value is present
        if (R === 5 && sessionActualStartTime) {
          panelistWs[cell_address_B].s.numFmt = "YYYY-MM-DD";
        }
      }
    }
    // Thin bottom border under Row 7 (row 6 in 0-indexed) for metadata section
    for (let C = 0; C <= 1; ++C) {
      // Columns A and B
      const cell_address = XLSX.utils.encode_cell({ r: 6, c: C }); // Row 7
      if (!panelistWs[cell_address]) panelistWs[cell_address] = { t: "s" };
      if (!panelistWs[cell_address].s) panelistWs[cell_address].s = {};
      panelistWs[cell_address].s.border = { bottom: thinBorder };
    }

    // Table Section (Starts Row 9)
    // Use extractedPanelistRecords directly for table data
    XLSX.utils.sheet_add_aoa(panelistWs, [PANEL_TABLE_HEADERS], {
      origin: "A9",
    }); // Header at Row 9
    XLSX.utils.sheet_add_json(panelistWs, extractedPanelistRecords, {
      origin: "A10",
      skipHeader: true,
    }); // Data starts Row 10

    // Column Widths for Panelist Table
    panelistWs["!cols"] = [
      { wch: 12 },
      { wch: 28 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 22 },
      { wch: 12 },
      { wch: 25 },
    ]; // 8 columns

    // Header Styles (Row 9)
    const panelistHeaderRowRange = XLSX.utils.decode_range(
      `A9:${PANEL_TABLE_LAST_COL}9`,
    );
    for (
      let C = panelistHeaderRowRange.s.c;
      C <= panelistHeaderRowRange.e.c;
      ++C
    ) {
      const cell_address = XLSX.utils.encode_cell({ r: 8, c: C }); // Row 9
      if (!panelistWs[cell_address]) panelistWs[cell_address] = { t: "s" };
      panelistWs[cell_address].s = createCellStyle(
        { horizontal: "center", vertical: "middle", wrapText: true },
        {
          name: FONT_FAMILY,
          sz: HEADER_FONT_SIZE,
          b: true,
          color: { rgb: HEADER_FONT_COLOR },
        },
        { fgColor: { rgb: HEADER_FILL_COLOR } },
        { bottom: thickBorder },
      );
    }

    // Data Rows Styling (from Row 10 onwards)
    const panelistTableDataStartRow = 9; // Data starts from row 10 (0-indexed 9)
    const panelistTableDataEndRow =
      panelistTableDataStartRow + extractedPanelistRecords.length - 1;
    for (let R = panelistTableDataStartRow; R <= panelistTableDataEndRow; ++R) {
      // Alternating row fill
      if ((R - panelistTableDataStartRow + 1) % 2 !== 0) {
        for (let C = 0; C < PANEL_TABLE_HEADERS.length; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!panelistWs[cell_address]) panelistWs[cell_address] = { t: "s" };
          if (!panelistWs[cell_address].s) panelistWs[cell_address].s = {};
          panelistWs[cell_address].s.fill = {
            fgColor: { rgb: ALTERNATING_ROW_FILL_COLOR },
          };
        }
      }
      // Date formatting for Join Time, Leave Time
      for (let col of [3, 4]) {
        // Join Time (D), Leave Time (E)
        const cell_address = XLSX.utils.encode_cell({ r: R, c: col });
        if (panelistWs[cell_address]) {
          if (!panelistWs[cell_address].s) panelistWs[cell_address].s = {};
          panelistWs[cell_address].s.alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          panelistWs[cell_address].s.numFmt = "YYYY-MM-DD HH:MM";
        }
      }
      // Time in Session - number format, center (Column F - index 5)
      const cell_address_tis_panelist = XLSX.utils.encode_cell({ r: R, c: 5 });
      if (panelistWs[cell_address_tis_panelist]) {
        if (!panelistWs[cell_address_tis_panelist].s)
          panelistWs[cell_address_tis_panelist].s = {};
        panelistWs[cell_address_tis_panelist].s.alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        panelistWs[cell_address_tis_panelist].s.numFmt = "0"; // 0 decimals
      }
      // Boolean fields (Attended, Is Guest): Center
      for (let col of [0, 6]) {
        // Attended (A), Is Guest (G)
        const cell_address = XLSX.utils.encode_cell({ r: R, c: col });
        if (panelistWs[cell_address]) {
          if (!panelistWs[cell_address].s) panelistWs[cell_address].s = {};
          panelistWs[cell_address].s.alignment = {
            horizontal: "center",
            vertical: "middle",
          };
        }
      }
      // Default text fields: Left (User Name, Email, Country/Region Name)
      for (let col of [1, 2, 7]) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: col });
        if (panelistWs[cell_address]) {
          if (!panelistWs[cell_address].s) panelistWs[cell_address].s = {};
          panelistWs[cell_address].s.alignment = {
            horizontal: "left",
            vertical: "middle",
          };
        }
      }

      // Default data cell style
      for (let C = 0; C < PANEL_TABLE_HEADERS.length; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (panelistWs[cell_address] && !panelistWs[cell_address].s) {
          panelistWs[cell_address].s = createCellStyle(
            { vertical: "middle" },
            {
              name: FONT_FAMILY,
              sz: DEFAULT_FONT_SIZE,
              color: { rgb: THICK_BORDER_COLOR },
            },
          );
        } else if (panelistWs[cell_address] && panelistWs[cell_address].s) {
          panelistWs[cell_address].s.font = panelistWs[cell_address].s.font || {
            name: FONT_FAMILY,
            sz: DEFAULT_FONT_SIZE,
            color: { rgb: THICK_BORDER_COLOR },
          };
        }
      }
    }

    // Borders for Panelist Table data area (from Row 9 onwards)
    const panelistTableOverallRange = XLSX.utils.decode_range(
      `A9:${PANEL_TABLE_LAST_COL}${extractedPanelistRecords.length + 9}`,
    );
    for (
      let R = panelistTableOverallRange.s.r;
      R <= panelistTableOverallRange.e.r;
      ++R
    ) {
      for (
        let C = panelistTableOverallRange.s.c;
        C <= panelistTableOverallRange.e.c;
        ++C
      ) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!panelistWs[cell_address]) panelistWs[cell_address] = { t: "s" };

        if (!panelistWs[cell_address].s) panelistWs[cell_address].s = {};
        panelistWs[cell_address].s.border = {
          top: thinBorder,
          bottom: thinBorder,
          left: thinBorder,
          right: thinBorder,
        };
      }
    }

    // Outer thick border for Panelist Table
    for (
      let C = panelistTableOverallRange.s.c;
      C <= panelistTableOverallRange.e.c;
      ++C
    ) {
      const top_cell = XLSX.utils.encode_cell({
        r: panelistTableOverallRange.s.r,
        c: C,
      });
      if (!panelistWs[top_cell].s) panelistWs[top_cell].s = {};
      panelistWs[top_cell].s.border.top = thickBorder;

      const bottom_cell = XLSX.utils.encode_cell({
        r: panelistTableOverallRange.e.r,
        c: C,
      });
      if (!panelistWs[bottom_cell].s) panelistWs[bottom_cell].s = {};
      panelistWs[bottom_cell].s.border.bottom = thickBorder;
    }
    for (
      let R = panelistTableOverallRange.s.r;
      R <= panelistTableOverallRange.e.r;
      ++R
    ) {
      const left_cell = XLSX.utils.encode_cell({
        r: R,
        c: panelistTableOverallRange.s.c,
      });
      if (!panelistWs[left_cell].s) panelistWs[left_cell].s = {};
      panelistWs[left_cell].s.border.left = thickBorder;

      const right_cell = XLSX.utils.encode_cell({
        r: R,
        c: panelistTableOverallRange.e.c,
      });
      if (!panelistWs[right_cell].s) panelistWs[right_cell].s = {};
      panelistWs[right_cell].s.border.right = thickBorder;
    }

    panelistWs["!autofilter"] = {
      ref: `A9:${PANEL_TABLE_LAST_COL}${extractedPanelistRecords.length + 9}`,
    };
    panelistWs["!freeze"] = { xf: 0, yf: 9 }; // Freeze Row 9

    XLSX.utils.book_append_sheet(newWorkbook, panelistWs, "Panelist");

    // --- SHEET 3: "Did Not Attend" ---
    const didNotAttendWs = XLSX.utils.json_to_sheet(didNotAttendMembers, {
      header: commonHeaders,
      skipHeader: true,
    });

    // Manually add title and headers
    XLSX.utils.sheet_add_aoa(
      didNotAttendWs,
      [["Event Attendance Report – Did Not Attend"]],
      { origin: "A1" },
    );
    XLSX.utils.sheet_add_aoa(didNotAttendWs, [commonHeaders], { origin: "A2" });

    // Column Widths
    didNotAttendWs["!cols"] = commonColWidths;

    // Merged Cells (A1:X1)
    if (!didNotAttendWs["!merges"]) didNotAttendWs["!merges"] = [];
    didNotAttendWs["!merges"].push(
      XLSX.utils.decode_range(`A1:${COMMON_LAST_COL}1`),
    );

    // Styles for Title (A1)
    const titleCellDidNotAttendA1 = didNotAttendWs["A1"];
    if (titleCellDidNotAttendA1) {
      titleCellDidNotAttendA1.s = createCellStyle(
        { horizontal: "center", vertical: "middle", wrapText: false },
        {
          name: FONT_FAMILY,
          sz: TITLE_FONT_SIZE,
          b: true,
          color: { rgb: THICK_BORDER_COLOR },
        },
        { fgColor: { rgb: TITLE_FILL_COLOR } },
      );
      didNotAttendWs["!rows"] = didNotAttendWs["!rows"] || [];
      didNotAttendWs["!rows"][0] = { hpt: 30 }; // Row height for Row 1
    }

    // Styles for Headers (Row 2)
    const didNotAttendHeaderRowRange = XLSX.utils.decode_range(
      `A2:${COMMON_LAST_COL}2`,
    );
    for (
      let C = didNotAttendHeaderRowRange.s.c;
      C <= didNotAttendHeaderRowRange.e.c;
      ++C
    ) {
      const cell_address = XLSX.utils.encode_cell({ r: 1, c: C }); // Row 2
      if (!didNotAttendWs[cell_address])
        didNotAttendWs[cell_address] = { t: "s" };
      didNotAttendWs[cell_address].s = createCellStyle(
        { horizontal: "center", vertical: "middle", wrapText: true },
        {
          name: FONT_FAMILY,
          sz: HEADER_FONT_SIZE,
          b: true,
          color: { rgb: HEADER_FONT_COLOR },
        },
        { fgColor: { rgb: HEADER_FILL_COLOR } },
      );
    }

    // Data Cell Alignment and Formatting
    const didNotAttendDataStartRow = 2; // Data starts from row 3 (0-indexed 2)
    const didNotAttendDataEndRow =
      didNotAttendDataStartRow + didNotAttendMembers.length - 1;
    for (let R = didNotAttendDataStartRow; R <= didNotAttendDataEndRow; ++R) {
      // Alternating row fill
      if ((R - didNotAttendDataStartRow + 1) % 2 !== 0) {
        for (let C = 0; C < commonHeaders.length; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!didNotAttendWs[cell_address])
            didNotAttendWs[cell_address] = { t: "s" };
          if (!didNotAttendWs[cell_address].s)
            didNotAttendWs[cell_address].s = {};
          didNotAttendWs[cell_address].s.fill = {
            fgColor: { rgb: ALTERNATING_ROW_FILL_COLOR },
          };
        }
      }

      // Specific alignment and date formats (same as Attended sheet)
      const emailCol = 4; // E
      const orgCol = 8; // I
      const questionsCol = 10; // K
      const regTimeCol = 11; // L
      const joinTimeCol = 13; // N - not used in Did Not Attend data, but keep for consistency
      const leaveTimeCol = 14; // O - not used in Did Not Attend data, but keep for consistency
      const timeInSessionCol = 15; // P - not used in Did Not Attend data, but keep for consistency
      const attendedCol = 0; // A
      const isGuestCol = 16; // Q
      const questionnaireQ1Col = 19; // T (Are you an active...)
      const questionnaireQ2Col = 20; // U (If you’re not a SAHCS member...)
      const questionnaireQ3Col = 21; // V (What is your profession?)
      const questionnaireQ4Col = 22; // W (Category of employing...)

      // Name, Email, Organization fields: Left
      for (let col of [1, 2, 3, emailCol, orgCol, questionsCol]) {
        // User Name, First, Last, Email, Organization, Questions & Comments
        const cell_address = XLSX.utils.encode_cell({ r: R, c: col });
        if (didNotAttendWs[cell_address]) {
          if (!didNotAttendWs[cell_address].s)
            didNotAttendWs[cell_address].s = {};
          didNotAttendWs[cell_address].s.alignment = {
            horizontal: "left",
            vertical: "middle",
          };
        }
      }

      // Questionnaire columns (T–W): Left + Wrap Text
      for (let col of [
        questionnaireQ1Col,
        questionnaireQ2Col,
        questionnaireQ3Col,
        questionnaireQ4Col,
      ]) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: col });
        if (didNotAttendWs[cell_address]) {
          if (!didNotAttendWs[cell_address].s)
            didNotAttendWs[cell_address].s = {};
          didNotAttendWs[cell_address].s.alignment = {
            horizontal: "left",
            vertical: "middle",
            wrapText: true,
          };
        }
      }

      // Time / Date columns (L): Center, YYYY-MM-DD HH:MM (only Registration Time is relevant here)
      for (let col of [regTimeCol]) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: col });
        if (didNotAttendWs[cell_address]) {
          if (!didNotAttendWs[cell_address].s)
            didNotAttendWs[cell_address].s = {};
          didNotAttendWs[cell_address].s.alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          didNotAttendWs[cell_address].s.numFmt = "YYYY-MM-DD HH:MM";
        }
      }
      // Boolean fields (Attended, Is Guest): Center
      for (let col of [attendedCol, isGuestCol]) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: col });
        if (didNotAttendWs[cell_address]) {
          if (!didNotAttendWs[cell_address].s)
            didNotAttendWs[cell_address].s = {};
          didNotAttendWs[cell_address].s.alignment = {
            horizontal: "center",
            vertical: "middle",
          };
        }
      }
      // Default data cell style
      for (let C = 0; C < commonHeaders.length; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (didNotAttendWs[cell_address] && !didNotAttendWs[cell_address].s) {
          didNotAttendWs[cell_address].s = createCellStyle(
            { vertical: "middle" },
            {
              name: FONT_FAMILY,
              sz: DEFAULT_FONT_SIZE,
              color: { rgb: THICK_BORDER_COLOR },
            },
          );
        } else if (
          didNotAttendWs[cell_address] &&
          didNotAttendWs[cell_address].s
        ) {
          didNotAttendWs[cell_address].s.font = didNotAttendWs[cell_address].s
            .font || {
            name: FONT_FAMILY,
            sz: DEFAULT_FONT_SIZE,
            color: { rgb: THICK_BORDER_COLOR },
          };
        }
      }
    }

    // Borders for data area (from Row 2 onwards)
    const didNotAttendTableRange = XLSX.utils.decode_range(
      `A2:${COMMON_LAST_COL}${didNotAttendMembers.length + 1}`,
    );
    for (
      let R = didNotAttendTableRange.s.r;
      R <= didNotAttendTableRange.e.r;
      ++R
    ) {
      for (
        let C = didNotAttendTableRange.s.c;
        C <= didNotAttendTableRange.e.c;
        ++C
      ) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!didNotAttendWs[cell_address])
          didNotAttendWs[cell_address] = { t: "s" };

        if (!didNotAttendWs[cell_address].s)
          didNotAttendWs[cell_address].s = {};
        didNotAttendWs[cell_address].s.border = {
          top: thinBorder,
          bottom: thinBorder,
          left: thinBorder,
          right: thinBorder,
        };
      }
    }

    // Outer thick border
    const didNotAttendOuterBorderRange = XLSX.utils.decode_range(
      `A2:${COMMON_LAST_COL}${didNotAttendMembers.length + 1}`,
    );
    for (
      let C = didNotAttendOuterBorderRange.s.c;
      C <= didNotAttendOuterBorderRange.e.c;
      ++C
    ) {
      const top_cell = XLSX.utils.encode_cell({
        r: didNotAttendOuterBorderRange.s.r,
        c: C,
      });
      if (!didNotAttendWs[top_cell].s) didNotAttendWs[top_cell].s = {};
      didNotAttendWs[top_cell].s.border.top = thickBorder;

      const bottom_cell = XLSX.utils.encode_cell({
        r: didNotAttendOuterBorderRange.e.r,
        c: C,
      });
      if (!didNotAttendWs[bottom_cell].s) didNotAttendWs[bottom_cell].s = {};
      didNotAttendWs[bottom_cell].s.border.bottom = thickBorder;
    }
    for (
      let R = didNotAttendOuterBorderRange.s.r;
      R <= didNotAttendOuterBorderRange.e.r;
      ++R
    ) {
      const left_cell = XLSX.utils.encode_cell({
        r: R,
        c: didNotAttendOuterBorderRange.s.c,
      });
      if (!didNotAttendWs[left_cell].s) didNotAttendWs[left_cell].s = {};
      didNotAttendWs[left_cell].s.border.left = thickBorder;

      const right_cell = XLSX.utils.encode_cell({
        r: R,
        c: didNotAttendOuterBorderRange.e.c,
      });
      if (!didNotAttendWs[right_cell].s) didNotAttendWs[right_cell].s = {};
      didNotAttendWs[right_cell].s.border.right = thickBorder;
    }

    didNotAttendWs["!autofilter"] = {
      ref: `A2:${COMMON_LAST_COL}${didNotAttendMembers.length + 1}`,
    };
    didNotAttendWs["!freeze"] = { xf: 0, yf: 2 }; // Freeze Row 2

    XLSX.utils.book_append_sheet(newWorkbook, didNotAttendWs, "Did Not Attend");

    // --- Global Workbook Properties ---
    newWorkbook.Props = {
      ...newWorkbook.Props,
      Title: "HPCSA Full Attendance Report",
      Author: "HPCSA Search App",
      CreatedDate: new Date(),
    };

    const excelBuffer = XLSX.write(newWorkbook, {
      bookType: "xlsx",
      type: "buffer",
      bookSST: true, // Generate shared string table for better performance/smaller files
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
