# Nano Bananary API接口文档

## 1. 概述

### 1.1 API简介
Nano Bananary 主要通过 Google Gemini AI API 提供图像处理服务。本文档详细描述了项目中使用的所有API接口、数据格式和调用方式。

### 1.2 技术栈
- **AI服务提供商**: Google Gemini AI
- **SDK版本**: @google/genai ^1.17.0
- **认证方式**: API Key
- **数据格式**: JSON + Base64编码图像

## 2. Google Gemini AI API

### 2.1 服务配置

#### 2.1.1 初始化配置
```typescript
import { GoogleGenAI, Modality } from "@google/genai";

// API密钥配置
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

// 初始化AI客户端
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
```

#### 2.1.2 环境变量
```bash
# 必需的环境变量
API_KEY=your_google_gemini_api_key_here
```

### 2.2 核心接口

#### 2.2.1 图像编辑接口

**接口名称**: `editImage`

**接口描述**: 使用AI对图像进行编辑和变换处理

**方法签名**:
```typescript
export async function editImage(
    base64ImageData: string, 
    mimeType: string, 
    prompt: string,
    maskBase64: string | null,
    secondaryImage: { base64: string; mimeType: string } | null
): Promise<GeneratedContent>
```

**请求参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| base64ImageData | string | 是 | 主图像的Base64编码数据（不包含data:前缀） |
| mimeType | string | 是 | 图像MIME类型（如：image/jpeg, image/png） |
| prompt | string | 是 | AI处理提示词，描述期望的变换效果 |
| maskBase64 | string \| null | 否 | 蒙版图像的Base64编码数据，用于局部编辑 |
| secondaryImage | object \| null | 否 | 辅助图像对象，用于多图像处理 |

**secondaryImage对象结构**:
```typescript
interface SecondaryImage {
  base64: string;    // 辅助图像的Base64编码数据
  mimeType: string;  // 辅助图像的MIME类型
}
```

**返回数据**:
```typescript
interface GeneratedContent {
  imageUrl: string | null;          // 生成的图像URL
  text: string | null;              // 生成的文本内容
  secondaryImageUrl?: string | null; // 辅助生成的图像URL
}
```

**请求示例**:
```typescript
// 基础图像处理
const result = await editImage(
  "/9j/4AAQSkZJRgABAQAAAQ...", // base64图像数据
  "image/jpeg",
  "Turn this photo into a 3D figurine",
  null,
  null
);

// 带蒙版的局部编辑
const maskedResult = await editImage(
  "/9j/4AAQSkZJRgABAQAAAQ...", // 主图像
  "image/jpeg",
  "Change the background to cyberpunk style",
  "iVBORw0KGgoAAAANSUhEUgAA...", // 蒙版数据
  null
);

// 多图像处理
const multiImageResult = await editImage(
  "/9j/4AAQSkZJRgABAQAAAQ...", // 主图像
  "image/jpeg",
  "Apply the pose from the second image to the character in the first image",
  null,
  {
    base64: "/9j/4AAQSkZJRgABAQEAAA...", // 辅助图像
    mimeType: "image/jpeg"
  }
);
```

**响应示例**:
```json
{
  "imageUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "text": null,
  "secondaryImageUrl": null
}
```

### 2.3 API调用流程

#### 2.3.1 请求构建流程
```typescript
// 1. 构建请求参数数组
const parts: any[] = [
  {
    inlineData: {
      data: base64ImageData,
      mimeType: mimeType,
    },
  },
];

// 2. 添加蒙版（如果存在）
if (maskBase64) {
  parts.push({
    inlineData: {
      data: maskBase64,
      mimeType: 'image/png', // 蒙版始终为PNG格式
    },
  });
  // 修改提示词以支持蒙版处理
  fullPrompt = `Apply the following instruction only to the masked area of the image: "${prompt}". Preserve the unmasked area.`;
}

// 3. 添加辅助图像（如果存在）
if (secondaryImage) {
  parts.push({
    inlineData: {
      data: secondaryImage.base64,
      mimeType: secondaryImage.mimeType,
    },
  });
}

// 4. 添加文本提示词
parts.push({ text: fullPrompt });
```

#### 2.3.2 API调用流程
```typescript
// 1. 获取生成模型
const model = ai.getGenerativeModel({ 
  model: "gemini-2.0-flash-exp" 
});

// 2. 发送生成请求
const result = await model.generateContent({
  contents: [{ role: "user", parts }],
});

// 3. 处理响应
const response = result.response;
const candidates = response.candidates;
```

#### 2.3.3 响应处理流程
```typescript
// 1. 检查响应有效性
if (!candidates || candidates.length === 0) {
  throw new Error("No candidates returned from AI service");
}

// 2. 提取内容
const candidate = candidates[0];
const parts = candidate.content?.parts || [];

// 3. 处理不同类型的内容
let imageUrl: string | null = null;
let text: string | null = null;

for (const part of parts) {
  if (part.inlineData) {
    // 处理图像数据
    const { mimeType, data } = part.inlineData;
    imageUrl = `data:${mimeType};base64,${data}`;
  } else if (part.text) {
    // 处理文本数据
    text = part.text;
  }
}

// 4. 返回结果
return { imageUrl, text };
```

### 2.4 错误处理

#### 2.4.1 错误类型

| 错误类型 | 错误码 | 描述 | 处理方式 |
|----------|--------|------|----------|
| 认证错误 | 401 | API密钥无效或过期 | 检查API密钥配置 |
| 配额错误 | 429 | API调用频率超限 | 实现重试机制 |
| 请求错误 | 400 | 请求参数无效 | 验证输入参数 |
| 服务错误 | 500 | AI服务内部错误 | 重试或降级处理 |
| 网络错误 | - | 网络连接问题 | 重试机制 |

#### 2.4.2 错误处理实现
```typescript
try {
  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  });
  // 处理成功响应
} catch (error: any) {
  console.error("AI service error:", error);
  
  // 根据错误类型进行处理
  if (error.status === 429) {
    // 频率限制错误，等待后重试
    throw new Error("API rate limit exceeded. Please try again later.");
  } else if (error.status === 401) {
    // 认证错误
    throw new Error("Invalid API key. Please check your configuration.");
  } else if (error.status >= 500) {
    // 服务器错误
    throw new Error("AI service temporarily unavailable. Please try again.");
  } else {
    // 其他错误
    throw new Error(`AI processing failed: ${error.message || 'Unknown error'}`);
  }
}
```

## 3. 内部API接口

### 3.1 文件处理API

#### 3.1.1 dataUrlToFile

**功能**: 将DataURL转换为File对象

**方法签名**:
```typescript
export function dataUrlToFile(dataUrl: string, filename: string): File
```

**参数**:
- `dataUrl`: 包含图像数据的DataURL字符串
- `filename`: 目标文件名

**返回**: File对象

**使用示例**:
```typescript
const file = dataUrlToFile(
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "generated-image.jpg"
);
```

#### 3.1.2 loadImage

**功能**: 异步加载图像

**方法签名**:
```typescript
export function loadImage(src: string): Promise<HTMLImageElement>
```

**参数**:
- `src`: 图像源URL或DataURL

**返回**: Promise<HTMLImageElement>

**使用示例**:
```typescript
const img = await loadImage("data:image/jpeg;base64,/9j/4AAQ...");
console.log(`Image loaded: ${img.width}x${img.height}`);
```

#### 3.1.3 resizeImageToMatch

**功能**: 调整图像尺寸以匹配目标尺寸

**方法签名**:
```typescript
export async function resizeImageToMatch(
  sourceDataUrl: string, 
  targetWidth: number, 
  targetHeight: number
): Promise<string>
```

**参数**:
- `sourceDataUrl`: 源图像DataURL
- `targetWidth`: 目标宽度
- `targetHeight`: 目标高度

**返回**: 调整后的图像DataURL

#### 3.1.4 embedWatermark

**功能**: 在图像中嵌入水印

**方法签名**:
```typescript
export async function embedWatermark(
  imageDataUrl: string, 
  watermarkText: string
): Promise<string>
```

**参数**:
- `imageDataUrl`: 原始图像DataURL
- `watermarkText`: 水印文本

**返回**: 带水印的图像DataURL

#### 3.1.5 downloadImage

**功能**: 下载图像文件

**方法签名**:
```typescript
export function downloadImage(dataUrl: string, filename: string): void
```

**参数**:
- `dataUrl`: 图像DataURL
- `filename`: 下载文件名

**使用示例**:
```typescript
downloadImage(
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "my-generated-image.jpg"
);
```

### 3.2 Canvas API封装

#### 3.2.1 Canvas绘制接口

**功能**: 提供Canvas绘制功能的封装

**主要方法**:
```typescript
interface CanvasAPI {
  // 初始化Canvas
  initCanvas(canvas: HTMLCanvasElement, image: HTMLImageElement): void;
  
  // 开始绘制
  startDrawing(x: number, y: number): void;
  
  // 绘制过程
  draw(x: number, y: number): void;
  
  // 结束绘制
  stopDrawing(): void;
  
  // 清除Canvas
  clearCanvas(): void;
  
  // 获取蒙版数据
  getMaskData(): string;
}
```

## 4. 数据格式规范

### 4.1 图像数据格式

#### 4.1.1 支持的图像格式
- **JPEG**: image/jpeg
- **PNG**: image/png
- **WebP**: image/webp
- **GIF**: image/gif（静态）

#### 4.1.2 图像尺寸限制
- **最大尺寸**: 4096 x 4096 像素
- **最小尺寸**: 64 x 64 像素
- **文件大小**: 最大 10MB

#### 4.1.3 Base64编码规范
```typescript
// 标准DataURL格式
const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...";

// API调用时需要去除前缀
const base64Data = dataUrl.split(',')[1]; // "/9j/4AAQSkZJRgABAQAAAQ..."
const mimeType = "image/jpeg";
```

### 4.2 变换配置格式

#### 4.2.1 Transformation接口
```typescript
interface Transformation {
  title: string;                    // 变换名称
  prompt: string;                   // AI提示词
  emoji: string;                    // 显示图标
  description: string;              // 功能描述
  isMultiImage?: boolean;           // 是否需要多图像
  isTwoStep?: boolean;              // 是否为两步处理
  stepTwoPrompt?: string;           // 第二步提示词
  primaryUploaderTitle?: string;    // 主上传器标题
  secondaryUploaderTitle?: string;  // 辅助上传器标题
  primaryUploaderDescription?: string;   // 主上传器描述
  secondaryUploaderDescription?: string; // 辅助上传器描述
}
```

#### 4.2.2 变换配置示例
```typescript
const transformation: Transformation = {
  title: "3D Figurine",
  prompt: "turn this photo into a character figure. Behind it, place a box with the character's image printed on it...",
  emoji: "🧍",
  description: "Turns your photo into a collectible 3D character figurine, complete with packaging.",
  isMultiImage: false,
  isTwoStep: false
};
```

### 4.3 历史记录格式

#### 4.3.1 HistoryItem接口
```typescript
interface HistoryItem {
  id: string;                    // 唯一标识符
  timestamp: number;             // 创建时间戳
  transformation: Transformation; // 使用的变换
  originalImage: string;         // 原始图像DataURL
  resultImage: string;           // 结果图像DataURL
  prompt?: string;               // 自定义提示词（如果有）
  maskData?: string;             // 蒙版数据（如果有）
}
```

## 5. API使用最佳实践

### 5.1 性能优化

#### 5.1.1 图像预处理
```typescript
// 压缩大尺寸图像
const compressImage = async (file: File, maxSize: number = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      const { width, height } = img;
      const scale = Math.min(maxSize / width, maxSize / height, 1);
      
      canvas.width = width * scale;
      canvas.height = height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    
    img.src = URL.createObjectURL(file);
  });
};
```

#### 5.1.2 请求缓存
```typescript
// 简单的请求缓存实现
const requestCache = new Map<string, Promise<GeneratedContent>>();

const cachedEditImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  maskBase64: string | null = null,
  secondaryImage: { base64: string; mimeType: string } | null = null
): Promise<GeneratedContent> => {
  // 生成缓存键
  const cacheKey = JSON.stringify({
    image: base64ImageData.substring(0, 100), // 使用图像数据的前100个字符
    prompt,
    mask: maskBase64?.substring(0, 100),
    secondary: secondaryImage?.base64.substring(0, 100)
  });
  
  // 检查缓存
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey)!;
  }
  
  // 发起新请求
  const request = editImage(base64ImageData, mimeType, prompt, maskBase64, secondaryImage);
  requestCache.set(cacheKey, request);
  
  return request;
};
```

### 5.2 错误处理最佳实践

#### 5.2.1 重试机制
```typescript
const retryEditImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  maskBase64: string | null = null,
  secondaryImage: { base64: string; mimeType: string } | null = null,
  maxRetries: number = 3
): Promise<GeneratedContent> => {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await editImage(base64ImageData, mimeType, prompt, maskBase64, secondaryImage);
    } catch (error) {
      lastError = error as Error;
      
      // 如果是频率限制错误，等待后重试
      if (error.message.includes('rate limit')) {
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
        continue;
      }
      
      // 其他错误直接抛出
      throw error;
    }
  }
  
  throw lastError!;
};
```

### 5.3 安全考虑

#### 5.3.1 输入验证
```typescript
const validateImageInput = (file: File): boolean => {
  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported image format');
  }
  
  // 检查文件大小（10MB限制）
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image file too large (max 10MB)');
  }
  
  return true;
};
```

#### 5.3.2 API密钥保护
```typescript
// 在生产环境中，API密钥应该通过环境变量设置
// 不要在代码中硬编码API密钥
const getApiKey = (): string => {
  const apiKey = process.env.API_KEY || process.env.REACT_APP_API_KEY;
  
  if (!apiKey) {
    throw new Error('API key not configured. Please set API_KEY environment variable.');
  }
  
  return apiKey;
};
```

## 6. 调试和测试

### 6.1 API调试

#### 6.1.1 日志记录
```typescript
const debugEditImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  maskBase64: string | null = null,
  secondaryImage: { base64: string; mimeType: string } | null = null
): Promise<GeneratedContent> => {
  console.log('API Request:', {
    imageSize: base64ImageData.length,
    mimeType,
    prompt,
    hasMask: !!maskBase64,
    hasSecondaryImage: !!secondaryImage
  });
  
  const startTime = Date.now();
  
  try {
    const result = await editImage(base64ImageData, mimeType, prompt, maskBase64, secondaryImage);
    
    console.log('API Response:', {
      duration: Date.now() - startTime,
      hasImage: !!result.imageUrl,
      hasText: !!result.text
    });
    
    return result;
  } catch (error) {
    console.error('API Error:', {
      duration: Date.now() - startTime,
      error: error.message
    });
    throw error;
  }
};
```

### 6.2 单元测试

#### 6.2.1 API接口测试
```typescript
// Jest测试示例
describe('editImage API', () => {
  test('should process image successfully', async () => {
    const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const result = await editImage(mockBase64, 'image/png', 'test prompt');
    
    expect(result).toBeDefined();
    expect(result.imageUrl || result.text).toBeTruthy();
  });
  
  test('should handle invalid input', async () => {
    await expect(editImage('', 'image/jpeg', 'test'))
      .rejects.toThrow();
  });
});
```

## 7. 版本更新和兼容性

### 7.1 API版本管理

当前使用的API版本：
- **Google Gemini API**: gemini-2.0-flash-exp
- **SDK版本**: @google/genai ^1.17.0

### 7.2 向后兼容性

在API更新时，需要考虑以下兼容性问题：
1. 请求参数格式变化
2. 响应数据结构变化
3. 错误码和错误信息变化
4. 性能和限制变化

### 7.3 升级指南

当需要升级API版本时：
1. 查看官方更新日志
2. 测试新版本兼容性
3. 更新错误处理逻辑
4. 更新文档和示例代码
5. 进行充分的回归测试

---

本文档将随着项目的发展和API的更新持续维护和更新。如有疑问或建议，请参考项目的GitHub仓库或联系开发团队。