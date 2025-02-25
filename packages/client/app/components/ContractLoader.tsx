import { SUPPORTED_NETWORKS } from "../providers/AppContextProvider";

const ContractLoader: React.FC = () => {
  // ... existing code

  return (
    <div>
      <h3>Load Contract</h3>
      <select>
        {SUPPORTED_NETWORKS.map((network) => (
          <option key={network.id} value={network.id}>
            {network.name}
          </option>
        ))}
      </select>
      {/* ... rest of the component */}
    </div>
  );
};
