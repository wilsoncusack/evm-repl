import { createContext } from "react";
import type {
  CompilationResult,
  FileFunctionCalls,
  FileId,
  FunctionCallResult,
  SolidityFile,
} from "../types";

interface AppContextType {
  files: SolidityFile[];
  setFiles: React.Dispatch<React.SetStateAction<SolidityFile[]>>;
  filesFunctionCalls: FileFunctionCalls;
  setFilesFunctionCalls: React.Dispatch<
    React.SetStateAction<FileFunctionCalls>
  >;
  currentFile?: SolidityFile;
  currentFileCompilationResult?: CompilationResult["contracts"][0][0][0]["contract"];
  currentFileFunctionCallResults?: FunctionCallResult[];
  setCurrentFileId: React.Dispatch<React.SetStateAction<FileId>>;
  compilationResult?: CompilationResult;
  isCompiling: boolean;
  setIsCompiling: React.Dispatch<React.SetStateAction<boolean>>;
  clearCurrentFileFunctionCallResults: () => void;
  addNewContract: (newFile: SolidityFile) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

// setFiles => update on file save, update on new file
// selectedFile => one of current files
// functionCalls => Should be specific to a file.
