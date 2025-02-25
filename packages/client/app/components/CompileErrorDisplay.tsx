import { CompilationResult } from "../types";

interface ErrorDisplayProps {
  errors: CompilationResult["errors"];
}

const CompileErrorDisplay: React.FC<ErrorDisplayProps> = ({ errors }) => {
  if (errors.length === 0) return null;

  return (
    <div className="bg-red-100 max-h-[30vh] overflow-y-auto border-t border-red-300">
      <div className="sticky top-0 p-4 bg-red-200 border-b border-red-300">
        <h3 className="text-lg font-semibold text-red-800">
          Compilation Issues:
        </h3>
      </div>
      <div className="p-4">
        {errors.map((error, index) => (
          <div
            key={index}
            className={`mb-2 p-2 rounded ${
              error.severity === "error" ? "bg-red-200" : "bg-yellow-200"
            }`}
          >
            <p className="font-semibold">
              {error.severity}: {error.message}
            </p>
            {error.formattedMessage && <p>{error.formattedMessage}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompileErrorDisplay;
