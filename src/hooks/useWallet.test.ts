import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@reown/appkit/react', () => ({
  useAppKit: vi.fn(() => ({ open: vi.fn(), close: vi.fn() })),
  useAppKitAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
    caipAddress: 'eip155:1:0x1234567890123456789012345678901234567890',
  })),
  useAppKitNetwork: vi.fn(() => ({
    chainId: 1,
    caipNetwork: { id: 1, name: 'Ethereum' },
  })),
}));

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    chain: { id: 1, name: 'Ethereum' },
  })),
  useDisconnect: vi.fn(() => ({ disconnect: vi.fn() })),
}));

import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useAccount, useDisconnect } from 'wagmi';
import { useWallet } from './web3/useWallet';

describe('useWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAppKit).mockReturnValue({ open: vi.fn(), close: vi.fn() } as any);

    vi.mocked(useAppKitAccount).mockReturnValue({
      address:     '0x1234567890123456789012345678901234567890',
      isConnected: true,
      caipAddress: 'eip155:1:0x1234567890123456789012345678901234567890',
    } as any);

    vi.mocked(useAppKitNetwork).mockReturnValue({
      chainId:     1,
      caipNetwork: { id: 1, name: 'Ethereum' },
    } as any);

    vi.mocked(useAccount).mockReturnValue({
      address:        '0x1234567890123456789012345678901234567890' as `0x${string}`,
      isConnected:    true,
      isConnecting:   false,
      isDisconnected: false,
      chain:          { id: 1, name: 'Ethereum' },
    } as any);

    vi.mocked(useDisconnect).mockReturnValue({ disconnect: vi.fn() } as any);
  });

  it('debería retornar la info de la wallet conectada', () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe('0x1234567890123456789012345678901234567890');
    expect(result.current.chainId).toBe(1);
    expect(result.current.chain).toEqual({ id: 1, name: 'Ethereum' });
  });

  it('debería retornar address undefined cuando no está conectada', () => {
    vi.mocked(useAppKitAccount).mockReturnValue({
      address: undefined, isConnected: false, caipAddress: undefined,
    } as any);

    const { result } = renderHook(() => useWallet());
    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeUndefined();
  });

  it('debería exponer las funciones de control de wallet', () => {
    const { result } = renderHook(() => useWallet());
    expect(typeof result.current.openModal).toBe('function');
    expect(typeof result.current.openAccount).toBe('function');
    expect(typeof result.current.openNetworks).toBe('function');
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
  });

  it('debería llamar a open cuando se llama openModal', () => {
    const mockOpen = vi.fn();
    vi.mocked(useAppKit).mockReturnValue({ open: mockOpen, close: vi.fn() } as any);

    const { result } = renderHook(() => useWallet());
    result.current.openModal();
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  it('debería llamar a open con view Account', () => {
    const mockOpen = vi.fn();
    vi.mocked(useAppKit).mockReturnValue({ open: mockOpen, close: vi.fn() } as any);

    const { result } = renderHook(() => useWallet());
    result.current.openAccount();
    expect(mockOpen).toHaveBeenCalledWith({ view: 'Account' });
  });

  it('debería llamar a open con view Networks', () => {
    const mockOpen = vi.fn();
    vi.mocked(useAppKit).mockReturnValue({ open: mockOpen, close: vi.fn() } as any);

    const { result } = renderHook(() => useWallet());
    result.current.openNetworks();
    expect(mockOpen).toHaveBeenCalledWith({ view: 'Networks' });
  });

  it('debería llamar a disconnect', () => {
    const mockDisconnect = vi.fn();
    vi.mocked(useDisconnect).mockReturnValue({ disconnect: mockDisconnect } as any);

    const { result } = renderHook(() => useWallet());
    result.current.disconnect();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('debería retornar el shortAddress formateado', () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.shortAddress).toBe('0x1234...7890');
  });

  it('debería retornar shortAddress undefined cuando no está conectada', () => {
    vi.mocked(useAppKitAccount).mockReturnValue({
      address: undefined, isConnected: false, caipAddress: undefined,
    } as any);

    const { result } = renderHook(() => useWallet());
    expect(result.current.shortAddress).toBeUndefined();
  });

  it('debería manejar address con formato inválido', () => {
    vi.mocked(useAppKitAccount).mockReturnValue({
      address: 'invalid-address' as any, isConnected: true, caipAddress: undefined,
    } as any);

    const { result } = renderHook(() => useWallet());
    expect(result.current.address).toBeUndefined();
  });
});