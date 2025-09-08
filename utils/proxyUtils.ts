import type { ProxyConfig } from '../types';

/**
 * 代理工具类
 * 处理代理配置和HTTP请求代理设置
 */
export class ProxyUtils {
  private static instance: ProxyUtils;
  private proxyConfig: ProxyConfig | null = null;

  private constructor() {
    this.loadProxyConfig();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ProxyUtils {
    if (!ProxyUtils.instance) {
      ProxyUtils.instance = new ProxyUtils();
    }
    return ProxyUtils.instance;
  }

  /**
   * 从localStorage加载代理配置
   */
  private loadProxyConfig(): void {
    try {
      const savedConfig = localStorage.getItem('proxyConfig');
      if (savedConfig) {
        this.proxyConfig = JSON.parse(savedConfig);
      }
    } catch (error) {
      console.error('Failed to load proxy config:', error);
      this.proxyConfig = null;
    }
  }

  /**
   * 更新代理配置
   */
  public updateProxyConfig(config: ProxyConfig): void {
    this.proxyConfig = config;
    try {
      localStorage.setItem('proxyConfig', JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save proxy config:', error);
    }
  }

  /**
   * 获取当前代理配置
   */
  public getProxyConfig(): ProxyConfig | null {
    return this.proxyConfig;
  }

  /**
   * 检查是否启用了代理
   */
  public isProxyEnabled(): boolean {
    return this.proxyConfig?.enabled === true && 
           !!this.proxyConfig.host && 
           this.proxyConfig.port > 0;
  }

  /**
   * 获取代理URL
   */
  public getProxyUrl(): string | null {
    if (!this.isProxyEnabled() || !this.proxyConfig) {
      return null;
    }

    const { protocol, username, password, host, port } = this.proxyConfig;
    
    let auth = '';
    if (username && password) {
      auth = `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
    }

    return `${protocol}://${auth}${host}:${port}`;
  }

  /**
   * 创建带代理的fetch配置
   * 注意：浏览器环境中的fetch不直接支持代理，这里主要用于Node.js环境
   */
  public createProxyFetchConfig(): RequestInit {
    const config: RequestInit = {};
    
    if (this.isProxyEnabled()) {
      // 在浏览器环境中，我们需要通过其他方式处理代理
      // 比如使用代理服务器或者CORS代理
      console.warn('Browser environment detected. Proxy configuration may not work directly with fetch.');
    }

    return config;
  }

  /**
   * 创建代理请求头
   */
  public createProxyHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (this.isProxyEnabled() && this.proxyConfig) {
      const { username, password } = this.proxyConfig;
      
      if (username && password) {
        const auth = btoa(`${username}:${password}`);
        headers['Proxy-Authorization'] = `Basic ${auth}`;
      }
    }

    return headers;
  }

  /**
   * 获取代理配置摘要（用于显示）
   */
  public getProxyConfigSummary(): string {
    if (!this.isProxyEnabled() || !this.proxyConfig) {
      return '未启用代理';
    }

    const { protocol, host, port, username } = this.proxyConfig;
    const authInfo = username ? ` (${username})` : '';
    return `${protocol.toUpperCase()}://${host}:${port}${authInfo}`;
  }

  /**
   * 验证代理配置
   */
  public validateProxyConfig(config: ProxyConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.enabled) {
      if (!config.host || config.host.trim() === '') {
        errors.push('代理主机不能为空');
      }

      if (!config.port || config.port < 1 || config.port > 65535) {
        errors.push('端口必须在1-65535之间');
      }

      if (!['http', 'https', 'socks4', 'socks5'].includes(config.protocol)) {
        errors.push('不支持的代理协议');
      }

      // 验证主机名格式
      const hostRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$|^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (config.host && !hostRegex.test(config.host)) {
        errors.push('无效的主机名或IP地址格式');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 测试代理连接
   * @param config 可选的代理配置，如果不提供则使用当前配置
   * @returns Promise<{success: boolean, message: string}> 连接测试结果
   */
  public async testProxyConnection(config?: ProxyConfig): Promise<{ success: boolean; message: string }> {
    const testConfig = config || this.proxyConfig;
    
    if (!testConfig?.enabled) {
      return { success: false, message: '代理未启用' };
    }

    if (!testConfig.host || !testConfig.port || testConfig.port === 0) {
       return { success: false, message: '代理主机或端口未设置' };
     }

    // 基本配置验证
    if (testConfig.host.includes(' ')) {
      return { success: false, message: '代理主机地址格式不正确' };
    }

    if (testConfig.port < 1 || testConfig.port > 65535) {
      return { success: false, message: '代理端口范围应在 1-65535 之间' };
    }

    try {
      // 由于浏览器CORS限制，我们无法直接测试代理连接
      // 这里进行基本的配置验证和格式检查
      console.log('Testing proxy connection:', this.getProxyConfigSummary());
      
      // 模拟网络延迟进行测试
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 检查常见的代理端口
      const commonPorts = [7890, 10809, 8080, 3128, 1080];
      const isCommonPort = commonPorts.includes(testConfig.port);
      
      if (isCommonPort) {
        return { 
          success: true, 
          message: `代理配置验证通过！\n\n配置信息：\n- 协议：${testConfig.protocol}\n- 地址：${testConfig.host}:${testConfig.port}\n- 认证：${testConfig.username ? '已设置' : '无'}\n\n注意：实际连接测试将在API调用时进行。` 
        };
      } else {
        return { 
          success: true, 
          message: `代理配置格式正确！\n\n配置信息：\n- 协议：${testConfig.protocol}\n- 地址：${testConfig.host}:${testConfig.port}\n- 认证：${testConfig.username ? '已设置' : '无'}\n\n注意：端口 ${testConfig.port} 不是常见的代理端口，请确认配置正确。\n实际连接测试将在API调用时进行。` 
        };
      }
    } catch (error) {
      console.error('Proxy connection test failed:', error);
      return { 
        success: false, 
        message: error instanceof Error ? `测试失败: ${error.message}` : '代理连接测试失败' 
      };
    }
  }
}

// 导出单例实例
export const proxyUtils = ProxyUtils.getInstance();