export const analytics = {
  init() {
    if (import.meta.env.DEV) {
      console.log('📊 Analytics: Stub mode (PostHog not installed)');
    }
  },
  track(event: string, properties?: Record<string, any>) {
    if (import.meta.env.DEV) {
      console.log('📊 Track:', event, properties);
    }
  },
  identify(userAddress: string) {
    if (import.meta.env.DEV) {
      console.log('📊 Identify:', userAddress);
    }
  },
  trackWalletConnected(address: string, chainId: number) {
    this.track('wallet_connected', { address, chainId });
  },
  trackContractCreated(contractAddress: string, amount: number) {
    this.track('contract_created', { contractAddress, amount });
  },
  trackDeposit(amount: number, protocol: string) {
    this.track('deposit', { amount, protocol });
  }
};