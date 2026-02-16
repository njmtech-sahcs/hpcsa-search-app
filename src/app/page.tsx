"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HPCSAResult } from "@/app/api/search/route";
import { BatchSearchResult } from "@/app/api/batch-search/route";
import {
  Upload,
  FileCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Moon,
  Sun,
} from "lucide-react";
import * as XLSX from "xlsx";
import { ThemeToggle } from "@/components/theme-toggle";

interface SearchResult {
  results: HPCSAResult[];
  message: string | null;
  error?: string;
}

interface BatchSearchResponse {
  results: BatchSearchResult[];
  activeCount: number;
  inactiveCount: number;
  notFoundCount: number;
  totalProcessed: number;
  error?: string;
}

export default function Home() {
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);

  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchSearchResponse | null>(
    null,
  );
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleExport = () => {
    if (!batchResults || batchResults.results.length === 0) return;

    // Separate results by status
    const activeResults = batchResults.results.filter(
      (r) => r.found && r.status.toLowerCase() === "active",
    );
    const notFoundResults = batchResults.results.filter(
      (r) => !r.found || r.status.toLowerCase() !== "active",
    );

    // Prepare data for Active sheet
    const activeData = activeResults.map((result) => ({
      "Registration Number": result.registration,
      "Full Name": result.name || "N/A",
      City: result.city || "N/A",
      Status: result.status || "N/A",
      Found: result.found ? "Yes" : "No",
    }));

    // Add active summary
    const activeSummary = [
      {
        "Registration Number": "SUMMARY",
        "Full Name": "",
        City: "",
        Status: "",
        Found: "",
      },
      {
        "Registration Number": "Total Active",
        "Full Name": activeResults.length,
        City: "",
        Status: "",
        Found: "",
      },
      {
        "Registration Number": "",
        "Full Name": "",
        City: "",
        Status: "",
        Found: "",
      },
    ];

    const activeFinalData = [...activeSummary, ...activeData];

    // Prepare data for Not Found sheet
    const notFoundData = notFoundResults.map((result) => ({
      "Registration Number": result.registration,
      "Full Name": result.name || "N/A",
      City: result.city || "N/A",
      Status: result.status || "Not Found",
      Found: result.found ? "Yes" : "No",
    }));

    // Add not found summary
    const notFoundSummary = [
      {
        "Registration Number": "SUMMARY",
        "Full Name": "",
        City: "",
        Status: "",
        Found: "",
      },
      {
        "Registration Number": "Total Not Found/Inactive",
        "Full Name": notFoundResults.length,
        City: "",
        Status: "",
        Found: "",
      },
      {
        "Registration Number": "",
        "Full Name": "",
        City: "",
        Status: "",
        Found: "",
      },
    ];

    const notFoundFinalData = [...notFoundSummary, ...notFoundData];

    // Create workbook with multiple sheets
    const workbook = XLSX.utils.book_new();

    // Active sheet
    const activeWorksheet = XLSX.utils.json_to_sheet(activeFinalData);
    // Make headers bold
    const activeRange = XLSX.utils.decode_range(activeWorksheet["!ref"] || "A1");
    for (let col = activeRange.s.c; col <= activeRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (activeWorksheet[cellAddress]) {
        activeWorksheet[cellAddress].s = { font: { bold: true } };
      }
    }
    XLSX.utils.book_append_sheet(workbook, activeWorksheet, "Active");

    // Not Found sheet
    const notFoundWorksheet = XLSX.utils.json_to_sheet(notFoundFinalData);
    // Make headers bold
    const notFoundRange = XLSX.utils.decode_range(notFoundWorksheet["!ref"] || "A1");
    for (let col = notFoundRange.s.c; col <= notFoundRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (notFoundWorksheet[cellAddress]) {
        notFoundWorksheet[cellAddress].s = { font: { bold: true } };
      }
    }
    XLSX.utils.book_append_sheet(workbook, notFoundWorksheet, "Not Found");

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const filename = `HPCSA_Results_${timestamp}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename, { cellStyles: true });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearchResults(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registrationNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSearchResults({
          results: [],
          message: null,
          error: data.error || "An error occurred",
        });
      } else {
        setSearchResults(data);
      }
    } catch (error) {
      setSearchResults({
        results: [],
        message: null,
        error: "Failed to connect to the server",
      });
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setBatchLoading(true);
    setBatchResults(null);
    setUploadProgress(0);

    // Simulate progress during upload
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/batch-search", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        setBatchResults({
          results: [],
          activeCount: 0,
          inactiveCount: 0,
          notFoundCount: 0,
          totalProcessed: 0,
          error: data.error || "An error occurred",
        });
      } else {
        setBatchResults(data);
      }
    } catch (error) {
      clearInterval(progressInterval);
      setBatchResults({
        results: [],
        activeCount: 0,
        inactiveCount: 0,
        notFoundCount: 0,
        totalProcessed: 0,
        error: "Failed to process file",
      });
    } finally {
      setBatchLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    disabled: batchLoading,
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            HPCSA Registration Search
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Search for healthcare practitioners by their registration number
          </p>
        </div>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="single">Single Search</TabsTrigger>
            <TabsTrigger value="batch">Batch Upload</TabsTrigger>
          </TabsList>

          {/* Single Search Tab */}
          <TabsContent value="single" className="space-y-4">
            <Card className="shadow-lg dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-slate-50">
                  Search Registration
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  Enter the HPCSA registration number to search
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">
                      Registration Number
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="registrationNumber"
                        placeholder="e.g., MP0518891"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        className="flex-1"
                        disabled={loading}
                      />
                      <Button
                        type="submit"
                        disabled={loading || !registrationNumber}
                        className={loading ? "shimmer" : ""}
                      >
                        <Search className="w-4 h-4 mr-2" />
                        {loading ? (
                          <span className="animate-ellipsis">Searching</span>
                        ) : (
                          "Search"
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {searchResults && (
              <Card className="shadow-lg dark:bg-slate-900 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="dark:text-slate-50">
                    Search Results
                  </CardTitle>
                  <CardDescription className="dark:text-slate-400">
                    {searchResults.error
                      ? "An error occurred"
                      : searchResults.message
                        ? searchResults.message
                        : `Found ${searchResults.results.length} record(s)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {searchResults.error ? (
                    <div className="text-center py-8 text-red-600">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                      <p className="font-medium">{searchResults.error}</p>
                    </div>
                  ) : searchResults.message ? (
                    <div className="text-center py-8 text-slate-500">
                      <p>{searchResults.message}</p>
                    </div>
                  ) : searchResults.results.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Registration Number</TableHead>
                            <TableHead>Full Name</TableHead>
                            <TableHead>City</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchResults.results.map((result, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {result.registration}
                              </TableCell>
                              <TableCell>{result.name}</TableCell>
                              <TableCell>{result.city}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    result.status.toLowerCase() === "active"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className={
                                    result.status.toLowerCase() === "active"
                                      ? "bg-green-500 hover:bg-green-600"
                                      : ""
                                  }
                                >
                                  {result.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p>No results found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Batch Upload Tab */}
          <TabsContent value="batch" className="space-y-4">
            <Card className="shadow-lg dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-slate-50">
                  <Upload className="w-5 h-5" />
                  Upload Excel File
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  Upload an Excel file with a "Registration" column to batch
                  check statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                      : "border-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                  } ${batchLoading ? "opacity-50 pointer-events-none shimmer" : ""}`}
                >
                  <input {...getInputProps()} />
                  <FileCheck className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  {isDragActive ? (
                    <p className="text-blue-600 font-medium">
                      Drop the file here...
                    </p>
                  ) : (
                    <>
                      <p className="text-slate-700 font-medium">
                        Drag & drop an Excel file here, or click to select
                      </p>
                      <p className="text-slate-500 text-sm mt-2">
                        Supports .xlsx and .xls files
                      </p>
                    </>
                  )}
                </div>

                {batchLoading && (
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400 shimmer">
                        <span className="animate-ellipsis">
                          Processing registrations
                        </span>
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {uploadProgress}%
                      </span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

            {batchResults && (
              <>
                {/* Summary Cards */}
                {batchResults.error ? (
                  <Card className="shadow-lg dark:bg-slate-900 dark:border-slate-800">
                    <CardContent className="pt-6">
                      <div className="text-center py-8 text-red-600 dark:text-red-400">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                        <p className="font-medium">{batchResults.error}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="shadow-md dark:bg-slate-900 dark:border-slate-800">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Total Processed
                            </p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                              {batchResults.totalProcessed}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="shadow-md dark:bg-slate-900 dark:border-slate-800">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Active
                            </p>
                            <p className="text-3xl font-bold text-green-600 dark:text-green-500">
                              {batchResults.activeCount}
                            </p>
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500 mx-auto mt-1" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="shadow-md dark:bg-slate-900 dark:border-slate-800">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Inactive
                            </p>
                            <p className="text-3xl font-bold text-amber-600 dark:text-amber-500">
                              {batchResults.inactiveCount}
                            </p>
                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mx-auto mt-1" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="shadow-md dark:bg-slate-900 dark:border-slate-800">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Not Found
                            </p>
                            <p className="text-3xl font-bold text-red-600 dark:text-red-500">
                              {batchResults.notFoundCount}
                            </p>
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-500 mx-auto mt-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Results Table */}
                    <Card className="shadow-lg dark:bg-slate-900 dark:border-slate-800">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="dark:text-slate-50">
                              Detailed Results
                            </CardTitle>
                            <CardDescription className="dark:text-slate-400">
                              {batchResults.results.length} registration(s)
                              processed
                            </CardDescription>
                          </div>
                          <Button
                            onClick={handleExport}
                            variant="outline"
                            className="dark:border-slate-700 dark:text-slate-300"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export to Excel
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Registration Number</TableHead>
                                <TableHead>Full Name</TableHead>
                                <TableHead>City</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Found</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {batchResults.results.map((result, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">
                                    {result.registration}
                                  </TableCell>
                                  <TableCell>{result.name || "-"}</TableCell>
                                  <TableCell>{result.city || "-"}</TableCell>
                                  <TableCell>
                                    {result.found ? (
                                      <Badge
                                        variant={
                                          result.status.toLowerCase() ===
                                          "active"
                                            ? "default"
                                            : "secondary"
                                        }
                                        className={
                                          result.status.toLowerCase() ===
                                          "active"
                                            ? "bg-green-500 hover:bg-green-600"
                                            : result.status.toLowerCase() ===
                                                "inactive"
                                              ? "bg-amber-500 hover:bg-amber-600"
                                              : ""
                                        }
                                      >
                                        {result.status}
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive">
                                        Not Found
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {result.found ? (
                                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-red-600" />
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
