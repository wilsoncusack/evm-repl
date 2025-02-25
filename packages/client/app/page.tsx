// IndexPage.tsx
"use client";
import SolidityEditor from "./components/SolidityEditor";
import FunctionCallsPanel from "./components/FunctionCallsPanel";
import FileExplorer from "./components/FileExplorer";
import { useAppContext } from "./hooks/useAppContext";

const IndexPage = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <FileExplorer />
      <div className="flex flex-grow overflow-hidden">
        <div className="w-3/5 h-full overflow-hidden">
          <SolidityEditor />
        </div>
        <div className="w-2/5 h-full overflow-hidden">
          <FunctionCallsPanel />
        </div>
      </div>
    </div>
  );
};

export default IndexPage;
