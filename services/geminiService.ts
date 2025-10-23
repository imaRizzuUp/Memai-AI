import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
import type { CropRect, DetectedObject } from "../types";
import { resizeImage, createExtendedImageAndMask } from "../utils/canvasUtils";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn("API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

function base64ToInlineData(base64String: string) {
    const match = base64String.match(/^data:(image\/.+);base64,(.+)$/);
    if (!match) {
        throw new Error("Invalid base64 string format");
    }
    return { mimeType: match[1], data: match[2] };
}

async function callGeminiForImage(parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[], errorKey: string): Promise<string> {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const firstPart = response.candidates?.[0]?.content?.parts?.[0];
        if (firstPart && firstPart.inlineData) {
            const newBase64Data = firstPart.inlineData.data;
            const newMimeType = firstPart.inlineData.mimeType;
            return `data:${newMimeType};base64,${newBase64Data}`;
        } else {
            const textResponse = response.text?.trim();
            if (textResponse) {
                console.error("API returned text instead of image:", textResponse);
                throw new Error(`AI failed to process the image. Reason: ${textResponse}`);
            }
            throw new Error("No image data returned from API. The model may not have been able to process the request.");
        }
    } catch (error) {
        console.error("Error with Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(errorKey);
        }
        throw new Error(errorKey);
    }
}

export async function editImage(
  base64Image: string,
  base64Mask: string,
  prompt: string
): Promise<string> {
    const imagePart = { inlineData: base64ToInlineData(base64Image) };
    const maskPart = { inlineData: base64ToInlineData(base64Mask) };
    const textPart = { text: prompt };

    return callGeminiForImage([imagePart, maskPart, textPart], 'errorFailedToProcess');
}

export async function extendImage(
  base64Image: string,
  rect: { x: number; y: number; width: number; height: number; }
): Promise<string> {
    const { extendedImage, mask } = await createExtendedImageAndMask(base64Image, rect);

    const imagePart = { inlineData: base64ToInlineData(extendedImage) };
    const maskPart = { inlineData: base64ToInlineData(mask) };
    
    const textPart = { text: "You are an expert AI image editor performing an outpainting task. Fill in the masked (white) areas of the image by extending the existing scene naturally and photo-realistically. The final image must be a seamless, high-quality composition that perfectly matches the style, lighting, and content of the original, unmasked area." };

    return callGeminiForImage([imagePart, maskPart, textPart], 'errorFailedToExtend');
}

export async function upscaleImage(base64Image: string, factor: number): Promise<string> {
    const imagePart = { inlineData: base64ToInlineData(base64Image) };
    const textPart = { text: `You are an expert in AI-powered image restoration and enhancement. Your task is to upscale the provided image to ${factor}x its original size with the highest possible fidelity.

Your primary goals are:
1.  **Detail Enhancement:** Intelligently add realistic detail to textures, fabrics, hair, and fine lines. Sharpen blurry edges without creating harsh halos.
2.  **Quality Improvement:** Increase the overall clarity and crispness of the image. Correct any minor compression artifacts present in the source.
3.  **Maintain Authenticity:** The upscaled image must look natural and photo-realistic. Avoid an over-processed or "plastic" appearance. The original character and content of the image must be perfectly preserved.
4.  **Technical Specs:** The final image must be exactly ${factor} times the original resolution, maintaining the original aspect ratio.

Execute this task with precision to produce a high-quality, professional result.` };
    return callGeminiForImage([imagePart, textPart], 'errorFailedToUpscale');
}


export async function detectObjectsInImage(base64Image: string, language: 'en' | 'id'): Promise<DetectedObject[]> {
    const resizedImageBase64 = await resizeImage(base64Image, 1024);
    const imagePart = { inlineData: base64ToInlineData(resizedImageBase64) };
    
    const languageInstruction = language === 'id' 
        ? `Your response MUST be in Indonesian. The 'objectName' must be in Indonesian.`
        : `Your response MUST be in English. The 'objectName' must be in English.`;

    const prompt = `You are a specialist in computer vision. Your task is to perform precise object detection on the given image. ${languageInstruction}

Your goal is to identify distinct, editable objects and provide extremely accurate bounding boxes for them.

Instructions:
1.  **Identify Key Objects:** Look for significant items that a user might want to edit, such as clothing (shirt, jacket), accessories (eyeglasses, hat, jewelry), and distinct features (hair).
2.  **Generate Precise Bounding Boxes:** For each object, define a bounding box that fits it as tightly as possible.
    *   **Minimize empty space:** The rectangle should hug the object's contours, leaving minimal background padding inside the box.
    *   **No cropping:** Ensure the entire object is within the box.
    *   **Coordinates:** The coordinates must be normalized (from 0.0 to 1.0) for the top-left (x_min, y_min) and bottom-right (x_max, y_max) corners.
3.  **Provide a Name:** Give each object a short, clear name (e.g., "eyeglasses", "white cupcake").

Precision is the highest priority. The bounding boxes must be as accurate as possible. Avoid including large areas of background or other objects in the box.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Use the faster model
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            objectName: { type: Type.STRING },
                            boundingBox: {
                                type: Type.OBJECT,
                                properties: {
                                    x_min: { type: Type.NUMBER },
                                    y_min: { type: Type.NUMBER },
                                    x_max: { type: Type.NUMBER },
                                    y_max: { type: Type.NUMBER },
                                },
                                required: ["x_min", "y_min", "x_max", "y_max"],
                            },
                        },
                        required: ["objectName", "boundingBox"],
                    },
                },
            },
        });

        const jsonText = response.text.trim();
        const detectedData = JSON.parse(jsonText);

        // Transform the API response to match the app's CropRect structure
        return detectedData.map((item: any) => ({
            label: item.objectName,
            box: {
                x: item.boundingBox.x_min,
                y: item.boundingBox.y_min,
                width: item.boundingBox.x_max - item.boundingBox.x_min,
                height: item.boundingBox.y_max - item.boundingBox.y_min,
            },
        }));

    } catch (error) {
        console.error("Error detecting objects:", error);
        throw new Error("errorFailedToDetect");
    }
}

export async function identifyObjectInCrop(base64Image: string, crop: CropRect, language: 'en' | 'id'): Promise<string | null> {
    const resizedImageBase64 = await resizeImage(base64Image, 1024);
    const imagePart = { inlineData: base64ToInlineData(resizedImageBase64) };
    
    const languageInstruction = language === 'id' 
        ? `Your response MUST be in Indonesian. The 'objectName' must be in Indonesian.`
        : `Your response MUST be in English. The 'objectName' must be in English.`;

    const prompt = `Given the image, identify the main, distinct object inside the specified normalized bounding box. The bounding box is defined by {x: ${crop.x.toFixed(4)}, y: ${crop.y.toFixed(4)}, width: ${crop.width.toFixed(4)}, height: ${crop.height.toFixed(4)}}. Provide a short, clear name for the object (e.g., "red jacket", "sunglasses"). ${languageInstruction} If no single, distinct object can be identified, respond with an empty string for the object name.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        objectName: { 
                            type: Type.STRING,
                            description: "The name of the identified object."
                        },
                    },
                    required: ["objectName"],
                },
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        if (result.objectName && result.objectName.trim() !== "") {
            return result.objectName;
        }
        return null;

    } catch (error) {
        console.error("Error identifying object in crop:", error);
        // We don't throw an error here, as failing to identify is a valid outcome.
        // The user can still proceed with their manual prompt.
        return null;
    }
}