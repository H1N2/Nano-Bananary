import React, { useState, useEffect } from 'react';
import type { ProxyConfig } from '../types';
import { proxyUtils } from '../utils/proxyUtils';

interface ProxySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ProxyConfig) => void;
}

/**
 * 代理设置组件
 * 提供代理服务器配置界面，支持HTTP/HTTPS/SOCKS代理
 */
const ProxySettings: React.FC<ProxySettingsProps> = ({ isOpen, onClose, onSave }) => {
  const [config, setConfig] = useState<ProxyConfig>({
    enabled: false,
    host: '',
    port: 8080,
    username: '',
    password: '',
    protocol: 'http'
  });

  // 从localStorage加载代理配置
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('proxyConfig');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Failed to load proxy config:', error);
    }
  }, []);

  /**
   * 处理配置保存
   */
  const handleSave = () => {
    try {
      localStorage.setItem('proxyConfig', JSON.stringify(config));
      onSave(config);
      onClose();
    } catch (error) {
      console.error('Failed to save proxy config:', error);
    }
  };

  /**
   * 处理配置重置
   */
  const handleReset = () => {
    const defaultConfig: ProxyConfig = {
      enabled: false,
      host: '',
      port: 8080,
      username: '',
      password: '',
      protocol: 'http'
    };
    setConfig(defaultConfig);
  };

  const [isTesting, setIsTesting] = useState(false);

  /**
   * 测试代理连接
   */
  const handleTestConnection = async () => {
    if (!config.enabled) {
      alert('请先启用代理设置');
      return;
    }

    if (!config.host || !config.port || config.port === 0) {
      alert('请填写代理主机和端口');
      return;
    }

    setIsTesting(true);
    try {
      const result = await proxyUtils.testProxyConnection(config);
      if (result.success) {
        alert(result.message);
      } else {
        alert(`代理测试失败：${result.message}`);
      }
    } catch (error) {
      console.error('代理测试失败:', error);
      alert('代理测试过程中发生错误，请稍后重试');
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">代理设置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* 启用代理 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableProxy"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="enableProxy" className="text-gray-700">
              启用代理
            </label>
          </div>

          {/* 代理协议 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              协议类型
            </label>
            <select
              value={config.protocol}
              onChange={(e) => setConfig({ ...config, protocol: e.target.value as ProxyConfig['protocol'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!config.enabled}
            >
              <option value="http">HTTP</option>
              <option value="https">HTTPS</option>
              <option value="socks4">SOCKS4</option>
              <option value="socks5">SOCKS5</option>
            </select>
          </div>

          {/* 代理主机 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              代理主机
            </label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              placeholder="例如: 127.0.0.1 或 proxy.example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!config.enabled}
            />
          </div>

          {/* 代理端口 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              端口
            </label>
            <input
              type="number"
              value={config.port || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setConfig({ ...config, port: 0 });
                } else {
                  const numValue = parseInt(value);
                  if (!isNaN(numValue)) {
                    setConfig({ ...config, port: numValue });
                  }
                }
              }}
              placeholder="8080"
              min="1"
              max="65535"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!config.enabled}
            />
          </div>

          {/* 用户名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户名 (可选)
            </label>
            <input
              type="text"
              value={config.username || ''}
              onChange={(e) => setConfig({ ...config, username: e.target.value })}
              placeholder="代理认证用户名"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!config.enabled}
            />
          </div>

          {/* 密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码 (可选)
            </label>
            <input
              type="password"
              value={config.password || ''}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
              placeholder="代理认证密码"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!config.enabled}
            />
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex justify-between mt-6">
          <div className="space-x-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !config.enabled || !config.host || !config.port || config.port === 0}
               className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                 isTesting || !config.enabled || !config.host || !config.port || config.port === 0
                   ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                   : 'bg-blue-500 text-white hover:bg-blue-600'
               }`}
            >
              {isTesting ? '测试中...' : '测试连接'}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              重置
            </button>
          </div>
          <div className="space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              保存
            </button>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>使用说明：</strong>
          </p>
          <ul className="text-xs text-blue-700 mt-1 space-y-1">
            <li>• 启用代理后，所有API请求将通过代理服务器</li>
            <li>• 支持HTTP、HTTPS、SOCKS4、SOCKS5协议</li>
            <li>• 用户名和密码仅在代理需要认证时填写</li>
            <li>• 配置将保存在本地浏览器中</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProxySettings;