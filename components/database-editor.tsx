"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Download, Plus, X, FileSpreadsheet, MoreVertical, Check } from "lucide-react";
import * as XLSX from "xlsx";

interface DatabaseEditorProps {
  onChange?: (content: string) => void;
  initialContent?: string;
}

interface Column {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "boolean";
}

interface Row {
  id: string;
  [key: string]: any;
}

interface DatabaseData {
  columns: Column[];
  rows: Row[];
}

const DatabaseEditor = ({ onChange, initialContent }: DatabaseEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<DatabaseData>({
    columns: [],
    rows: [],
  });
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Load initial content
  useEffect(() => {
    if (initialContent && initialContent.trim() !== "") {
      try {
        const parsed = JSON.parse(initialContent);
        if (parsed.columns && Array.isArray(parsed.columns) && parsed.columns.length > 0 && parsed.rows && Array.isArray(parsed.rows)) {
          // Ensure at least one row exists
          if (parsed.rows.length === 0 && parsed.columns.length > 0) {
            const firstRow: Row = { id: 'row-1' };
            parsed.columns.forEach((col: Column) => {
              firstRow[col.id] = '';
            });
            parsed.rows = [firstRow];
          }
          setData(parsed);
        } else {
          // If data structure is invalid, initialize with defaults
          const defaultData = {
            columns: [
              { id: 'col-1', name: 'Name', type: 'text' },
              { id: 'col-2', name: 'Status', type: 'text' },
              { id: 'col-3', name: 'Date', type: 'date' }
            ],
            rows: [
              { id: 'row-1', 'col-1': '', 'col-2': '', 'col-3': '' }
            ]
          };
          setData(defaultData);
        }
      } catch (error) {
        console.error("Failed to parse initialContent:", error);
        // Initialize with defaults on error
        const defaultData = {
          columns: [
            { id: 'col-1', name: 'Name', type: 'text' },
            { id: 'col-2', name: 'Status', type: 'text' },
            { id: 'col-3', name: 'Date', type: 'date' }
          ],
          rows: [
            { id: 'row-1', 'col-1': '', 'col-2': '', 'col-3': '' }
          ]
        };
        setData(defaultData);
      }
    } else {
      // No initial content, use defaults
      const defaultData = {
        columns: [
          { id: 'col-1', name: 'Name', type: 'text' },
          { id: 'col-2', name: 'Status', type: 'text' },
          { id: 'col-3', name: 'Date', type: 'date' }
        ],
        rows: [
          { id: 'row-1', 'col-1': '', 'col-2': '', 'col-3': '' }
        ]
      };
      setData(defaultData);
    }
  }, [initialContent]);

  // Notify parent when content changes
  useEffect(() => {
    if (onChange) {
      // Ensure at least one row exists if we have columns
      let dataToSave = { ...data };
      if (dataToSave.columns.length > 0 && dataToSave.rows.length === 0) {
        const firstRow: Row = { id: `row-${Date.now()}` };
        dataToSave.columns.forEach((col: Column) => {
          firstRow[col.id] = '';
        });
        dataToSave.rows = [firstRow];
        setData(dataToSave);
      }
      const content = JSON.stringify(dataToSave, null, 2);
      onChange(content);
    }
  }, [data, onChange]);

  const addColumn = () => {
    const newColumn: Column = {
      id: `col-${Date.now()}`,
      name: `Column ${data.columns.length + 1}`,
      type: "text",
    };
    setData((prev) => ({
      ...prev,
      columns: [...prev.columns, newColumn],
      rows: prev.rows.map((row) => ({
        ...row,
        [newColumn.id]: "",
      })),
    }));
    setEditingColumn(newColumn.id);
  };

  const removeColumn = (columnId: string) => {
    setData((prev) => ({
      ...prev,
      columns: prev.columns.filter((col) => col.id !== columnId),
      rows: prev.rows.map((row) => {
        const { [columnId]: removed, ...rest } = row;
        return rest;
      }),
    }));
  };

  const updateColumn = (columnId: string, updates: Partial<Column>) => {
    setData((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.id === columnId ? { ...col, ...updates } : col
      ),
    }));
  };

  const addRow = () => {
    const newRow: Row = {
      id: `row-${Date.now()}`,
    };
    data.columns.forEach((col) => {
      newRow[col.id] = "";
    });
    setData((prev) => ({
      ...prev,
      rows: [...prev.rows, newRow],
    }));
    // Focus first cell of new row
    if (data.columns.length > 0) {
      setEditingCell({ rowId: newRow.id, columnId: data.columns[0].id });
    }
  };

  const removeRow = (rowId: string) => {
    setData((prev) => ({
      ...prev,
      rows: prev.rows.filter((row) => row.id !== rowId),
    }));
  };

  const updateCell = (rowId: string, columnId: string, value: any) => {
    setData((prev) => ({
      ...prev,
      rows: prev.rows.map((row) =>
        row.id === rowId ? { ...row, [columnId]: value } : row
      ),
    }));
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileData = await file.arrayBuffer();
      const workbook = XLSX.read(fileData, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (jsonData.length === 0) return;

      // First row as headers
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];

      // Create columns from headers
      const columns: Column[] = headers.map((header, index) => ({
        id: `col-${index}`,
        name: String(header || `Column ${index + 1}`),
        type: "text",
      }));

      // Create rows
      const databaseRows: Row[] = rows.map((row, rowIndex) => {
        const rowObj: Row = {
          id: `row-${rowIndex}`,
        };
        headers.forEach((_, colIndex) => {
          rowObj[columns[colIndex].id] = row[colIndex] ?? "";
        });
        return rowObj;
      });

      setData({ columns, rows: databaseRows });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error importing file:", error);
      alert("Failed to import file. Please make sure it's a valid Excel file.");
    }
  };

  const handleExport = () => {
    if (data.columns.length === 0 || data.rows.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = data.columns.map((col) => col.name);
    const rows = data.rows.map((row) =>
      data.columns.map((col) => row[col.id] ?? "")
    );

    const exportData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    const filename = `database-${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const handleExportCSV = () => {
    if (data.columns.length === 0 || data.rows.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = data.columns.map((col) => col.name).join(",");
    const rows = data.rows
      .map((row) =>
        data.columns
          .map((col) => {
            const value = row[col.id] ?? "";
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      )
      .join("\n");

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const filename = `database-${Date.now()}.csv`;
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };


  return (
    <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col bg-background">
      {/* Minimal Toolbar */}
      <div className="border-b border-stone-200 dark:border-stone-800 px-6 py-3 flex items-center justify-between bg-background/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800">
            <FileSpreadsheet className="h-4 w-4 text-stone-600 dark:text-stone-400" />
          </div>
          <h2 className="text-sm font-medium text-foreground">Database</h2>
          {data.rows.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {data.rows.length} {data.rows.length === 1 ? "row" : "rows"}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            Import
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto">
        {data.columns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800 mb-6">
              <FileSpreadsheet className="h-12 w-12 text-stone-400 dark:text-stone-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Empty database</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Import a file or click below to add your first column
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm font-medium border border-stone-200 dark:border-stone-800 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors"
              >
                Import Excel/CSV
              </button>
              <button
                onClick={addColumn}
                className="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
              >
                Add Column
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Header Row - Sticky */}
            <div className="sticky top-[49px] z-10 bg-background border-b border-stone-200 dark:border-stone-800">
              <div className="flex">
                {/* Row Number Header */}
                <div className="w-16 flex-shrink-0 border-r border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 flex items-center justify-center" style={{ height: '48px' }}></div>
                
                {/* Column Headers */}
                {data.columns.map((column) => (
                  <div
                    key={column.id}
                    className={`flex-1 min-w-[200px] border-r border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 transition-colors flex items-center ${
                      hoveredColumn === column.id ? "bg-stone-100 dark:bg-stone-900/50" : ""
                    }`}
                    style={{ height: '48px', paddingLeft: '12px', paddingRight: '12px' }}
                    onMouseEnter={() => setHoveredColumn(column.id)}
                    onMouseLeave={() => setHoveredColumn(null)}
                  >
                    <div className="flex items-center justify-between gap-2 group w-full">
                      {editingColumn === column.id ? (
                        <input
                          type="text"
                          value={column.name}
                          onChange={(e) => updateColumn(column.id, { name: e.target.value })}
                          onBlur={() => setEditingColumn(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Escape") {
                              setEditingColumn(null);
                            }
                          }}
                          autoFocus
                          className="flex-1 bg-transparent border-none outline-none font-medium text-sm text-foreground focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-600 rounded px-1.5 min-w-0"
                          onClick={(e) => e.stopPropagation()}
                          style={{ lineHeight: '1.5rem' }}
                        />
                      ) : (
                        <button
                          onClick={() => setEditingColumn(column.id)}
                          className="flex-1 text-sm font-medium text-foreground hover:bg-stone-100 dark:hover:bg-stone-800 rounded px-1.5 transition-colors text-left min-w-0 truncate"
                          style={{ lineHeight: '1.5rem' }}
                        >
                          {column.name}
                        </button>
                      )}
                      
                      <button
                        onClick={() => removeColumn(column.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-all flex-shrink-0"
                        title="Remove column"
                      >
                        <X className="h-3 w-3 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Add Column Header */}
                <div className="w-12 flex-shrink-0 flex items-center justify-center border-r border-stone-200 dark:border-stone-800" style={{ height: '48px' }}>
                  <button
                    onClick={addColumn}
                    className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors opacity-60 hover:opacity-100"
                    title="Add column"
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            {/* Data Rows */}
            <div>
              {data.rows.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-muted-foreground mb-6">No rows yet</p>
                  <button
                    onClick={addRow}
                    className="px-6 py-3 text-sm font-medium border border-dashed border-stone-300 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-900/30 hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
                  >
                    Add your first row
                  </button>
                </div>
              ) : (
                data.rows.map((row, rowIndex) => (
                  <div
                    key={row.id}
                    className={`flex border-b border-stone-200 dark:border-stone-800 transition-colors ${
                      hoveredRow === row.id ? "bg-stone-50/50 dark:bg-stone-900/20" : "hover:bg-stone-50/30 dark:hover:bg-stone-900/10"
                    }`}
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Row Number */}
                    <div className="w-16 flex-shrink-0 border-r border-stone-200 dark:border-stone-800 flex items-center justify-between group" style={{ height: '48px', paddingLeft: '12px', paddingRight: '12px' }}>
                      <span className="text-xs text-muted-foreground font-mono">{rowIndex + 1}</span>
                      <button
                        onClick={() => removeRow(row.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-all"
                        title="Delete row"
                      >
                        <X className="h-3 w-3 text-red-600 dark:text-red-400" />
                      </button>
                    </div>

                    {/* Cells */}
                    {data.columns.map((column) => {
                      const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
                      return (
                        <div
                          key={column.id}
                          className="flex-1 min-w-[200px] border-r border-stone-200 dark:border-stone-800 flex items-center"
                          style={{ height: '48px', paddingLeft: '12px', paddingRight: '12px' }}
                          onClick={() => setEditingCell({ rowId: row.id, columnId: column.id })}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={row[column.id] ?? ""}
                              onChange={(e) =>
                                updateCell(row.id, column.id, e.target.value)
                              }
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "Escape") {
                                  setEditingCell(null);
                                }
                              }}
                              autoFocus
                              className="w-full bg-transparent border-none outline-none text-sm text-foreground focus:ring-0"
                              onClick={(e) => e.stopPropagation()}
                              placeholder="—"
                              style={{ lineHeight: '1.5rem' }}
                            />
                          ) : (
                            <div className="text-sm text-foreground w-full" style={{ lineHeight: '1.5rem' }}>
                              {row[column.id] ? (
                                <span className="whitespace-nowrap">{String(row[column.id])}</span>
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Add Row Button */}
            <div className="p-3 border-b border-stone-200 dark:border-stone-800">
              <button
                onClick={addRow}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-stone-50 dark:hover:bg-stone-900/30 rounded-lg transition-colors border border-dashed border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600"
              >
                <Plus className="h-4 w-4" />
                Add row
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseEditor;
