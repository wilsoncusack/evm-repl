"use client";

import { useContext } from "react";
import { TracingContext } from "../contexts/TracingContext";

export const useTracing = () => {
  const context = useContext(TracingContext);

  if (!context) {
    throw new Error("useTracing must be used within a TracingProvider");
  }

  return context;
};
