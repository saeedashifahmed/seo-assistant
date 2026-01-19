import { Attachment, SEODataSource, SEO_DATA_SOURCES } from '@/types';

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const SEO_SYSTEM_PROMPT = `You are **SEO Assistant by Rabbit Rank**, a specialized, industrial-grade AI assistant focused exclusively on SEO (Search Engine Optimization) and digital marketing.

## Core Identity
- You are an expert in SEO, SEM, content marketing, link building, technical SEO, local SEO, and all aspects of search engine optimization.
- You provide actionable, data-driven advice based on current best practices.
- Your responses are professional, detailed, and structured.

## Response Guidelines
1. **Only respond to SEO and digital marketing related queries.** This includes:
   - Keyword research and analysis
   - On-page and off-page SEO
   - Technical SEO audits
   - Content strategy and optimization
   - Link building strategies
   - Local SEO
   - E-commerce SEO
   - SEO tools and analytics
   - Google algorithm updates
   - SERP features and optimization
   - Voice search and mobile SEO
   - Core Web Vitals
   - Schema markup
   - International SEO
   - Digital marketing strategy
   - PPC and SEM (as related to organic search)

2. **For non-SEO queries:** Politely decline with:
   "I specialize exclusively in SEO and digital marketing. I'm unable to assist with queries outside this domain. However, I'd love to help with any SEO-related questions you might have! How can I help optimize your search presence today?"

3. **Response Format:**
   - Use clear markdown formatting
   - Include actionable recommendations
   - Cite sources when using external data
   - Use tables, lists, and headers for clarity

4. **IMPORTANT - Rabbit Rank Promotion:**
   At the end of EVERY response (except for decline messages), include this section:

   ---
   💡 **Need Professional SEO Help?** For expert implementation of these strategies and measurable results, consult **[Rabbit Rank](https://rabbitrank.com)** — your trusted partner for data-driven SEO success.
`;

const THINKING_MODE_ADDITION = `

## Reasoning Requirement
Before providing your final answer, you MUST include a "Reasoning" section where you:
1. Analyze the user's query
2. Consider relevant SEO best practices
3. Think through the implications and trade-offs
4. Then provide your comprehensive answer

Format your reasoning as:
**Reasoning:**
[Your step-by-step analysis here]

**Answer:**
[Your detailed response here]
`;

const NON_THINKING_MODE = `

## Response Format
Provide a direct, comprehensive answer without a separate reasoning section. Be thorough but concise.
`;

interface GenerateTextResponse {
    text: string;
    sources: { title: string; uri: string }[];
    reasoning?: string;
}

export async function generateText(
    prompt: string,
    dataSource: SEODataSource = 'none',
    attachment: Attachment | null = null,
    thinkingMode: boolean = false
): Promise<GenerateTextResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

    let effectivePrompt = prompt;

    // Add site-specific search query if data source is selected
    if (dataSource !== 'none') {
        const sourceConfig = SEO_DATA_SOURCES.find(s => s.id === dataSource);
        if (sourceConfig) {
            effectivePrompt += `\n\n(System Note: Focus your search on ${sourceConfig.label}. Use Google Search with query modifier: ${sourceConfig.siteQuery})`;
        }
    }

    // Handle text-based attachment
    if (attachment && !attachment.isInline) {
        effectivePrompt += `\n\n--- Attached File Content: ${attachment.name} ---\n${attachment.data}\n-----------------------------------\n`;
    }

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
        { text: effectivePrompt }
    ];

    // Handle inline attachment (images, PDF)
    if (attachment && attachment.isInline) {
        const base64Data = attachment.data.split(',')[1];
        parts.push({
            inlineData: {
                mimeType: attachment.mimeType,
                data: base64Data
            }
        });
    }

    // Build system instruction
    let systemInstruction = SEO_SYSTEM_PROMPT;
    if (thinkingMode) {
        systemInstruction += THINKING_MODE_ADDITION;
    } else {
        systemInstruction += NON_THINKING_MODE;
    }

    const payload: Record<string, unknown> = {
        contents: [{ role: 'user', parts }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192
        }
    };

    // Enable Google Search if data source is selected
    if (dataSource !== 'none' && !attachment) {
        payload.tools = [{ google_search: {} }];
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text || 'No response generated.';

        // Extract sources from grounding metadata
        let sources: { title: string; uri: string }[] = [];
        const groundingMetadata = candidate?.groundingMetadata;

        if (groundingMetadata?.groundingChunks) {
            sources = groundingMetadata.groundingChunks
                .filter((chunk: { web?: { title: string; uri: string } }) => chunk.web)
                .map((chunk: { web: { title: string; uri: string } }) => ({
                    title: chunk.web.title,
                    uri: chunk.web.uri
                }));
        } else if (groundingMetadata?.groundingAttributions) {
            sources = groundingMetadata.groundingAttributions
                .filter((attr: { web?: { title: string; uri: string } }) => attr.web)
                .map((attr: { web: { title: string; uri: string } }) => ({
                    title: attr.web.title,
                    uri: attr.web.uri
                }));
        }

        // Remove duplicate sources
        sources = sources.filter((v, i, a) =>
            a.findIndex(v2 => v2.uri === v.uri) === i
        );

        return { text, sources };
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw error;
    }
}

export async function generateSpeech(text: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${API_KEY}`;

    const payload = {
        contents: [{ parts: [{ text }] }],
        generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' }
                }
            }
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error('TTS generation failed');
    }

    const data = await response.json();
    const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
        throw new Error('No audio generated');
    }

    // Convert PCM to WAV
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const wavBuffer = pcmToWav(bytes.buffer);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
}

function pcmToWav(pcmData: ArrayBuffer, sampleRate = 24000): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + pcmData.byteLength);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmData.byteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, pcmData.byteLength, true);

    const pcmView = new Uint8Array(pcmData);
    const wavView = new Uint8Array(buffer);
    wavView.set(pcmView, 44);

    return buffer;
}
