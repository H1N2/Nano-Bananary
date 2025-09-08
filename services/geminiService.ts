
import { GoogleGenAI, Modality } from "@google/genai";
import type { GeneratedContent } from '../types';
import { proxyUtils } from '../utils/proxyUtils';

const API_KEY = import.meta.env.VITE_API_KEY;
if (!API_KEY) {
  console.warn('VITE_API_KEY environment variable is not set. Please set it in .env file.');
}

/**
 * 创建GoogleGenAI实例，支持代理配置
 */
function createGoogleGenAI(): GoogleGenAI {
  const baseConfig = { apiKey: API_KEY };
  
  // 检查是否启用了代理
  if (proxyUtils.isProxyEnabled()) {
    const proxyConfig = proxyUtils.getProxyConfig();
    console.log('Using proxy configuration:', proxyUtils.getProxyConfigSummary());
    
    // 注意：@google/genai 库可能不直接支持代理配置
    // 在实际部署中，可能需要通过环境变量或其他方式配置代理
    // 这里我们记录代理配置，实际的代理设置可能需要在网络层面处理
    
    if (proxyConfig) {
      // 可以在这里添加代理相关的配置
      // 例如设置环境变量或使用代理中间件
      console.log(`Proxy enabled: ${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`);
    }
  }
  
  return new GoogleGenAI(baseConfig);
}

let ai = createGoogleGenAI();

/**
 * 重新初始化AI实例（当代理配置更改时调用）
 */
export function reinitializeAI(): void {
  ai = createGoogleGenAI();
}

export async function editImage(
    base64ImageData: string, 
    mimeType: string, 
    prompt: string,
    maskBase64: string | null,
    secondaryImage: { base64: string; mimeType: string } | null
): Promise<GeneratedContent> {
  try {
    let fullPrompt = prompt;
    const parts: any[] = [
      {
        inlineData: {
          data: base64ImageData,
          mimeType: mimeType,
        },
      },
    ];

    // The mask should immediately follow the image it applies to.
    if (maskBase64) {
      parts.push({
        inlineData: {
          data: maskBase64,
          mimeType: 'image/png', // Masks are always drawn as PNGs
        },
      });
      fullPrompt = `Apply the following instruction only to the masked area of the image: "${prompt}". Preserve the unmasked area.`;
    }
    
    if (secondaryImage) {
        parts.push({
            inlineData: {
                data: secondaryImage.base64,
                mimeType: secondaryImage.mimeType,
            },
        });
    }

    parts.push({ text: fullPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const result: GeneratedContent = { imageUrl: null, text: null };

    // Safely access response parts to prevent crashes
    const responseParts = response.candidates?.[0]?.content?.parts;

    if (responseParts) {
      for (const part of responseParts) {
        if (part.text) {
          result.text = (result.text ? result.text + "\n" : "") + part.text;
        } else if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          result.imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
      }
    }

    if (!result.imageUrl) {
        const finishReason = response.candidates?.[0]?.finishReason;
        const safetyRatings = response.candidates?.[0]?.safetyRatings;
        let errorMessage = "The model did not return an image. It might have refused the request. Please try a different image or prompt.";
        
        if (finishReason === 'SAFETY') {
            const blockedCategories = safetyRatings?.filter(r => r.blocked).map(r => r.category).join(', ');
            errorMessage = `The request was blocked for safety reasons. Categories: ${blockedCategories || 'Unknown'}. Please modify your prompt or image.`;
        }
        
        throw new Error(errorMessage);
    }

    return result;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        let errorMessage = error.message;
        try {
            // The error message from the SDK might be a JSON string.
            const parsedError = JSON.parse(errorMessage);
            if (parsedError.error && parsedError.error.message) {
                // Add a user-friendly message for common errors.
                if (parsedError.error.status === 'RESOURCE_EXHAUSTED') {
                    errorMessage = "You've likely exceeded the request limit. Please wait a moment before trying again.";
                } else if (parsedError.error.code === 500 || parsedError.error.status === 'UNKNOWN') {
                    errorMessage = "An unexpected server error occurred. This might be a temporary issue. Please try again in a few moments.";
                } else {
                    errorMessage = parsedError.error.message;
                }
            }
        } catch (e) {
            // Not a JSON string, use the original message.
        }
        throw new Error(errorMessage);
    }
    throw new Error("An unknown error occurred while communicating with the API.");
  }
}
