// components/SolidityEditor.tsx
"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import CompileErrorDisplay from "./CompileErrorDisplay";
import { useAppContext } from "../hooks/useAppContext";
import CopyToClipboard from "react-copy-to-clipboard";

const SolidityEditor: React.FC = () => {
  const { files, currentFile, setFiles, compilationResult } = useAppContext();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [copied, setCopied] = useState(false);

  const errors = compilationResult?.errors || [];

  const relevantErrors = useMemo(() => {
    return errors.filter((e) => e.severity !== "warning");
  }, [errors]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    if (!currentFile) return;
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Create models for each file
    for (const file of files) {
      if (!monaco.editor.getModel(monaco.Uri.parse(`file:///${file.name}`))) {
        monaco.editor.createModel(
          file.content,
          "sol",
          monaco.Uri.parse(`file:///${file.name}`),
        );
      }
    }

    // Set the current model
    const currentModel = monaco.editor.getModel(
      monaco.Uri.parse(`file:///${currentFile.name}`),
    );
    if (currentModel) {
      editor.setModel(currentModel);
    }

    // Configure editor theme based on system preference
    const darkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
    monaco.editor.defineTheme("systemTheme", {
      base: darkTheme ? "vs-dark" : "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": darkTheme ? "#1f2937" : "#ffffff",
        "editor.foreground": darkTheme ? "#f9fafb" : "#111827",
        "editorLineNumber.foreground": darkTheme ? "#9ca3af" : "#6b7280",
        "editor.lineHighlightBackground": darkTheme ? "#374151" : "#f3f4f6",
      },
    });
    monaco.editor.setTheme("systemTheme");

    // Listen for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (event) => {
        const newDarkTheme = event.matches;
        monaco.editor.defineTheme("systemTheme", {
          base: newDarkTheme ? "vs-dark" : "vs",
          inherit: true,
          rules: [],
          colors: {
            "editor.background": newDarkTheme ? "#1f2937" : "#ffffff",
            "editor.foreground": newDarkTheme ? "#f9fafb" : "#111827",
            "editorLineNumber.foreground": newDarkTheme ? "#9ca3af" : "#6b7280",
            "editor.lineHighlightBackground": newDarkTheme
              ? "#374151"
              : "#f3f4f6",
          },
        });
        monaco.editor.setTheme("systemTheme");
      });
  };

  useEffect(() => {
    if (!currentFile) return;
    if (editorRef.current && monacoRef.current) {
      const currentModel = monacoRef.current.editor.getModel(
        monacoRef.current.Uri.parse(`file:///${currentFile.name}`),
      );
      if (currentModel) {
        editorRef.current.setModel(currentModel);
      }
    }
  }, [currentFile]);

  const handleEditorChange = (value: string | undefined) => {
    if (!currentFile) return;
    setFiles(
      files.map((file) =>
        file.id === currentFile.id ? { ...file, content: value || "" } : file,
      ),
    );
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-grow bg-editor shadow-md overflow-hidden border border-color-editor">
        {currentFile?.address && (
          <div className="p-2 bg-editor-header flex items-center justify-start">
            <span className="text-sm font-mono mr-2 text-secondary">
              Contract Address:
            </span>
            <div className="flex items-center bg-editor-address border border-color-editor-address rounded-md overflow-hidden">
              <span className="text-sm font-mono px-2 py-1 text-primary">
                {currentFile.address}
              </span>
              <CopyToClipboard text={currentFile.address} onCopy={handleCopy}>
                <button className="px-2 py-1 bg-editor-button hover:bg-editor-button-hover transition-colors text-xs border-l border-color-editor-address focus:outline-none focus:ring-2 focus:ring-accent">
                  {copied ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-success"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-secondary"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                  )}
                </button>
              </CopyToClipboard>
            </div>
          </div>
        )}
        <div className="h-full p-4 pb-0">
          {currentFile &&
            (currentFile.content ? (
              <Editor
                height="100%"
                defaultLanguage="sol"
                path={currentFile.name}
                value={currentFile.content}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: "on",
                  glyphMargin: true,
                  folding: true,
                  lineNumbersMinChars: 0,
                  overviewRulerBorder: false,
                  language: "sol",
                  fontFamily:
                    "'SF Mono', Menlo, Monaco, 'Courier New', monospace",
                  fontLigatures: true,
                  renderLineHighlight: "all",
                  cursorBlinking: "smooth",
                  smoothScrolling: true,
                  cursorSmoothCaretAnimation: "on",
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-secondary">
                  This contract was loaded from bytecode. Source code is not
                  available.
                </p>
              </div>
            ))}
        </div>
      </div>
      {relevantErrors.length > 0 && (
        <div className="flex-shrink-0">
          <CompileErrorDisplay errors={relevantErrors} />
        </div>
      )}
    </div>
  );
};

export default SolidityEditor;
