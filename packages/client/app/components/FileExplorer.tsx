// components/FileExplorer.tsx
"use client";

import type React from "react";
import { useState } from "react";
import { useAppContext } from "../hooks/useAppContext";
import type { SolidityFile } from "../types";
import LoadContractsModal from "./LoadContractsModal";
import { getRandomAddress } from "../utils";

const FileExplorer: React.FC = () => {
  const {
    files,
    currentFile,
    setCurrentFileId,
    setFiles,
    clearCurrentFileFunctionCallResults,
    addNewContract,
  } = useAppContext();
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState("");
  const [isLoadContractsModalOpen, setIsLoadContractsModalOpen] =
    useState(false);

  const onFileSelect = (fileId: string) => {
    const selectedFile = files.find((file) => file.id === fileId);
    if (selectedFile) {
      setCurrentFileId(selectedFile.id);
      clearCurrentFileFunctionCallResults();
    }
  };

  const onAddFile = () => {
    const newFileName = `NewFile${files.length + 1}.sol`;
    const newFile: SolidityFile = {
      id: crypto.randomUUID(),
      name: newFileName,
      content: "pragma solidity 0.8.26;\n\n// Your Solidity code here",
      address: getRandomAddress(),
    };
    addNewContract(newFile);
  };

  const deleteFile = (fileId: string) => {
    if (files.length <= 1) {
      alert("Cannot delete the last file.");
      return;
    }

    setFiles(files.filter((file) => file.id !== fileId));
    if (currentFile?.id === fileId) {
      clearCurrentFileFunctionCallResults();
      const newCurrentFile = files.find((file) => file.id !== fileId);
      if (newCurrentFile) {
        setCurrentFileId(newCurrentFile.id);
      }
    }
  };

  const startEditing = (fileId: string, fileName: string) => {
    setEditingFileId(fileId);
    setEditingFileName(fileName);
  };

  const saveFileName = (fileId: string) => {
    setFiles(
      files.map((file) =>
        file.id === fileId ? { ...file, name: editingFileName } : file,
      ),
    );
    setEditingFileId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, fileId: string) => {
    if (e.key === "Enter") {
      saveFileName(fileId);
    } else if (e.key === "Escape") {
      setEditingFileId(null);
    }
  };

  if (!currentFile) {
    return "Loading...";
  }

  return (
    <div className="w-64 bg-sidebar text-sidebar-text h-full flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <h3 className="font-bold text-xl">Files</h3>
      </div>
      <ul className="flex-grow overflow-y-auto">
        {files.map((file) => (
          <li
            key={file.id}
            className={`cursor-pointer p-3 hover:bg-sidebar-hover transition-colors ${
              file.id === currentFile?.id ? "bg-sidebar-active" : ""
            }`}
          >
            {editingFileId === file.id ? (
              <input
                type="text"
                value={editingFileName}
                onChange={(e) => setEditingFileName(e.target.value)}
                onBlur={() => saveFileName(file.id)}
                onKeyDown={(e) => handleKeyDown(e, file.id)}
                className="w-full bg-sidebar-input text-primary px-1 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
            ) : (
              <div className="flex justify-between items-center">
                <span
                  onClick={() => onFileSelect(file.id)}
                  title={file.name}
                  className="truncate max-w-[120px]"
                >
                  {file.name}
                </span>
                {file.address && (
                  <span className="text-xs text-tertiary ml-2">
                    {file.address.slice(0, 6)}...
                  </span>
                )}
                <div className="min-w-[50px]">
                  <button
                    onClick={() => startEditing(file.id, file.name)}
                    className="text-tertiary hover:text-primary mr-2 transition-colors"
                    aria-label="Edit filename"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => deleteFile(file.id)}
                    className="text-error hover:text-error-hover transition-colors"
                    aria-label="Delete file"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-col m-4 space-y-2">
        <button
          type="button"
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50"
          onClick={onAddFile}
        >
          Add File
        </button>
        <button
          type="button"
          className="bg-accent-secondary hover:bg-accent-secondary-hover text-white px-4 py-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-accent-secondary focus:ring-opacity-50"
          onClick={() => setIsLoadContractsModalOpen(true)}
        >
          Load Contracts
        </button>
      </div>
      <LoadContractsModal
        isOpen={isLoadContractsModalOpen}
        onClose={() => setIsLoadContractsModalOpen(false)}
      />
    </div>
  );
};

export default FileExplorer;
