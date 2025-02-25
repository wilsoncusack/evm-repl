import { createContext } from "react";
import { ForkConfig, ChainOption } from "../types";

export interface AppContextType {
  // ... existing properties
  forkConfig: ForkConfig;
  setForkConfig: React.Dispatch<React.SetStateAction<ForkConfig>>;
  availableChains: ChainOption[];
  setAvailableChains: React.Dispatch<React.SetStateAction<ChainOption[]>>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
