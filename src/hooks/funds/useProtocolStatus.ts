import { useReadContract } from "wagmi";

const FACTORY_ADDRESS = "0x9105166f0c2Ba72411Ca96f2cDdEE80B49535719" as const;

const abi = [
  {
    name: "activeProtocols",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "protocol", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export function useProtocolStatus(protocolAddress: `0x${string}`) {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi,
    functionName: "activeProtocols",
    args: [protocolAddress],
  });
}