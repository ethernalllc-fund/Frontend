import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWallet } from './web3/useWallet';

const mockOpen = vi.fn();
const mockUseAppKitAccount = vi.fn(() => ({
  address: '0x1234567890123456789012345678901234567890' as string | undefined,
  isConnected: true,
  caipAddress: 'eip155:1:0x1234567890123456789012345678901234567890' as string | undefined,
}));

const mockUseAppKitNetwork = vi.fn(() => ({
  chainId: 1,
  caipNetwork: { id: 1, name: 'Ethereum' },
}));

vi.mock('@reown/appkit/react', () => ({
  useAppKit: vi.fn(() => ({
    open: mockOpen,
    close: vi.fn(),
  })),
  useAppKitAccount: mockUseAppKitAccount,
  useAppKitNetwork: mockUseAppKitNetwork,
}));

const mockDisconnect = vi.fn();
const mockUseAccount = vi.fn(() => ({
  address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  isConnected: true,
  isConnecting: false,
  isDisconnected: false,
  chain: { id: 1, name: 'Ethereum' },
}));

vi.mock('wagmi', () => ({
  useAccount: mockUseAccount,
  useDisconnect: vi.fn(() => ({
    disconnect: mockDisconnect,
  })),
}));

describe('useWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppKitAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890' as string | undefined,
      isConnected: true,
      caipAddress: 'eip155:1:0x1234567890123456789012345678901234567890' as string | undefined,
    });
    mockUseAppKitNetwork.mockReturnValue({
      chainId: 1,
      caipNetwork: { id: 1, name: 'Ethereum' },
    });
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
      chain: { id: 1, name: 'Ethereum' },
    });
  });

  it('should return connected wallet info', () => {
    const { result } = renderHook(() => useWallet());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe('0x1234567890123456789012345678901234567890');
    expect(result.current.chainId).toBe(1);
    expect(result.current.chain).toEqual({ id: 1, name: 'Ethereum' });
  });

  it('should return undefined address when not connected', () => {
    mockUseAppKitAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
      caipAddress: undefined,
    });

    const { result } = renderHook(() => useWallet());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeUndefined();
  });

  it('should have wallet control functions', () => {
    const { result } = renderHook(() => useWallet());

    expect(result.current.openModal).toBeDefined();
    expect(typeof result.current.openModal).toBe('function');
    expect(result.current.openAccount).toBeDefined();
    expect(typeof result.current.openAccount).toBe('function');
    expect(result.current.openNetworks).toBeDefined();
    expect(typeof result.current.openNetworks).toBe('function');
    expect(result.current.connect).toBeDefined();
    expect(typeof result.current.connect).toBe('function');
    expect(result.current.disconnect).toBeDefined();
    expect(typeof result.current.disconnect).toBe('function');
  });

  it('should call open when openModal is called', () => {
    const { result } = renderHook(() => useWallet());
    result.current.openModal();
    
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  it('should call open with Account view when openAccount is called', () => {
    const { result } = renderHook(() => useWallet());
    result.current.openAccount();
    
    expect(mockOpen).toHaveBeenCalledWith({ view: 'Account' });
  });

  it('should call open with Networks view when openNetworks is called', () => {
    const { result } = renderHook(() => useWallet());
    result.current.openNetworks();
    
    expect(mockOpen).toHaveBeenCalledWith({ view: 'Networks' });
  });

  it('should call disconnect function', () => {
    const { result } = renderHook(() => useWallet());
    result.current.disconnect();
    
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('should return short address format', () => {
    const { result } = renderHook(() => useWallet());

    expect(result.current.shortAddress).toBe('0x1234...7890');
  });

  it('should return undefined short address when not connected', () => {
    mockUseAppKitAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
      caipAddress: undefined,
    });

    const { result } = renderHook(() => useWallet());

    expect(result.current.shortAddress).toBeUndefined();
  });

  it('should handle invalid address format', () => {
    mockUseAppKitAccount.mockReturnValue({
      address: 'invalid-address' as any,
      isConnected: true,
      caipAddress: undefined,
    });

    const { result } = renderHook(() => useWallet());

    expect(result.current.address).toBeUndefined();
  });
});