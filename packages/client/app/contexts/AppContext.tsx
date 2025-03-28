"use client";

import { createContext } from "react";
import {
  CompilationResult,
  FileFunctionCalls,
  FileId,
  ForkConfig,
  SolidityFile,
  ChainOption,
} from "../types";
import { EnhancedFunctionCallResult } from "../types/sourceMapping";

export const AppContext = createContext<{
  files: SolidityFile[];
  setFiles: (files: SolidityFile[]) => void;
  filesFunctionCalls: FileFunctionCalls;
  setFilesFunctionCalls: (calls: FileFunctionCalls) => void;
  currentFile: SolidityFile | undefined;
  setCurrentFileId: (id: FileId) => void;
  compilationResult: CompilationResult | undefined;
  isCompiling: boolean;
  setIsCompiling: (isCompiling: boolean) => void;
  currentFileCompilationResult: any;
  currentFileFunctionCallResults: EnhancedFunctionCallResult[] | undefined;
  clearCurrentFileFunctionCallResults: () => void;
  addNewContract: (newFile: SolidityFile) => void;
  forkConfig: ForkConfig;
  setForkConfig: (config: ForkConfig) => void;
  availableChains: ChainOption[];
  setAvailableChains: (chains: ChainOption[]) => void;
}>({
  files: [],
  setFiles: () => {},
  filesFunctionCalls: {},
  setFilesFunctionCalls: () => {},
  currentFile: undefined,
  setCurrentFileId: () => {},
  compilationResult: undefined,
  isCompiling: false,
  setIsCompiling: () => {},
  currentFileCompilationResult: undefined,
  currentFileFunctionCallResults: undefined,
  clearCurrentFileFunctionCallResults: () => {},
  addNewContract: () => {},
  forkConfig: {},
  setForkConfig: () => {},
  availableChains: [],
  setAvailableChains: () => {},
});
