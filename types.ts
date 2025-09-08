
export interface Transformation {
  title: string;
  prompt: string;
  emoji: string;
  description: string;
  isMultiImage?: boolean;
  isTwoStep?: boolean;
  stepTwoPrompt?: string;
  primaryUploaderTitle?: string;
  secondaryUploaderTitle?: string;
  primaryUploaderDescription?: string;
  secondaryUploaderDescription?: string;
}

export interface GeneratedContent {
  imageUrl: string | null;
  text: string | null;
}

export interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
}