import bs58 from 'bs58';

interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect?: () => Promise<void>;
  signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
  publicKey?: { toString: () => string };
}

interface SolflareProvider {
  isSolflare?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect?: () => Promise<void>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array | { signature: Uint8Array }>;
  publicKey?: { toString: () => string };
}

export type WalletAdapterId = 'phantom' | 'solflare';
type WalletId = WalletAdapterId | 'backpack' | 'glow';

type WalletMeta = {
  id: WalletId;
  label: string;
  installUrl: string;
  adapter?: WalletAdapterId;
  icon: string;
};

declare global {
  interface Window {
    solana?: PhantomProvider;
    phantom?: { solana?: PhantomProvider };
    solflare?: SolflareProvider;
  }
}

const WALLET_CATALOG: WalletMeta[] = [
  { id: 'phantom', label: 'Phantom', installUrl: 'https://phantom.app/download', adapter: 'phantom', icon: '/wallet-asset/phantom.png' },
  { id: 'solflare', label: 'Solflare', installUrl: 'https://solflare.com/download', adapter: 'solflare', icon: '/wallet-asset/solflare.png' },
  { id: 'backpack', label: 'Backpack', installUrl: 'https://www.backpack.app/download', icon: '/wallet-asset/backpack.png' },
  { id: 'glow', label: 'Glow', installUrl: 'https://glow.app/', icon: '/wallet-asset/glow.png' },
];

export type WalletDescriptor = WalletMeta & { detected: boolean };

class WalletService {
  private resolvePhantom(): PhantomProvider | undefined {
    if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
    if (window.solana?.isPhantom) return window.solana;
    return undefined;
  }

  private resolveSolflare(): SolflareProvider | undefined {
    if (window.solflare?.isSolflare) return window.solflare;
    return undefined;
  }

  getAvailableWallets(): WalletDescriptor[] {
    return WALLET_CATALOG.map((wallet) => ({
      ...wallet,
      detected: wallet.adapter ? this.isWalletDetected(wallet.adapter) : false,
    }));
  }

  private isWalletDetected(adapter: WalletAdapterId): boolean {
    if (adapter === 'phantom') return !!this.resolvePhantom();
    if (adapter === 'solflare') return !!this.resolveSolflare();
    return false;
  }

  async connectWallet(adapter: WalletAdapterId): Promise<string> {
    const provider = this.getProvider(adapter);
    if (!provider) {
      const meta = WALLET_CATALOG.find((w) => w.adapter === adapter);
      throw new Error(`${meta?.label || 'Wallet'} is not installed`);
    }
    const response = await provider.connect();
    return response.publicKey.toString();
  }

  async disconnectWallet(adapter: WalletAdapterId): Promise<void> {
    const provider = this.getProvider(adapter);
    await provider?.disconnect?.();
  }

  async signMessage(adapter: WalletAdapterId, message: string): Promise<string> {
    const provider = this.getProvider(adapter);
    if (!provider?.publicKey) {
      throw new Error('Wallet not connected');
    }
    const encoded = new TextEncoder().encode(message);
    const signed =
      adapter === 'phantom'
        ? await (provider as PhantomProvider).signMessage(encoded, 'utf8')
        : await (provider as SolflareProvider).signMessage(encoded);
    const bytes = signed instanceof Uint8Array ? signed : signed.signature;
    return bs58.encode(bytes);
  }

  getConnectedAddress(adapter: WalletAdapterId): string | null {
    const provider = this.getProvider(adapter);
    return provider?.publicKey?.toString() ?? null;
  }

  private getProvider(adapter: WalletAdapterId): PhantomProvider | SolflareProvider | undefined {
    if (adapter === 'phantom') return this.resolvePhantom();
    if (adapter === 'solflare') return this.resolveSolflare();
    return undefined;
  }
}

export const walletService = new WalletService();
