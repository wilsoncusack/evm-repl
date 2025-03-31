import { createContext } from "react";
import type {
  ChainOption,
  CompilationResult,
  FileFunctionCalls,
  FileId,
  ForkConfig,
  FunctionCallResult,
  SolidityFile,
} from "../types";
import { EnhancedFunctionCallResult } from "../types/sourceMapping";

interface AppContextType {
  files: SolidityFile[];
  setFiles: React.Dispatch<React.SetStateAction<SolidityFile[]>>;
  filesFunctionCalls: FileFunctionCalls;
  setFilesFunctionCalls: React.Dispatch<
    React.SetStateAction<FileFunctionCalls>
  >;
  currentFile?: SolidityFile;
  currentFileCompilationResult?: CompilationResult["contracts"][0][0][0]["contract"];
  currentFileFunctionCallResults?: EnhancedFunctionCallResult[];
  setCurrentFileId: React.Dispatch<React.SetStateAction<FileId>>;
  compilationResult?: CompilationResult;
  isCompiling: boolean;
  setIsCompiling: React.Dispatch<React.SetStateAction<boolean>>;
  clearCurrentFileFunctionCallResults: () => void;
  addNewContract: (newFile: SolidityFile) => void;
  forkConfig: ForkConfig;
  setForkConfig: React.Dispatch<React.SetStateAction<ForkConfig>>;
  availableChains: ChainOption[];
  setAvailableChains: React.Dispatch<React.SetStateAction<ChainOption[]>>;
  activeTraceId: string | null;
  setActiveTraceId: (id: string | null) => void;
  isTraceDebuggerOpen: boolean;
  setIsTraceDebuggerOpen: (open: boolean) => void;
  showDetailedPanel: boolean;
  setShowDetailedPanel: (show: boolean) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

// setFiles => update on file save, update on new file
// selectedFile => one of current files
// functionCalls => Should be specific to a file.
