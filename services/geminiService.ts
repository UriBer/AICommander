
import { GoogleGenAI, Type } from "@google/genai";
import { pluginManager } from "./pluginManager";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const agentSystemInstruction = `
You are Commander-AI, a world-class system administrator and cloud architect.
You operate within a Norton Commander style interface.
Your job is to help the user perform file operations, cloud management, and data analysis.

You have access to plugins:
1. Local FS (local-fs)
2. Cloud Storage (cloud-storage)

Use the provided tools to interact with these systems.
Always explain what you are doing.
`;

export async function runAgentTask(prompt: string, onUpdate: (msg: string) => void) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: agentSystemInstruction,
        tools: [
          {
            functionDeclarations: [
              {
                name: 'list_files',
                description: 'List items in a specific plugin and path',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    pluginId: { type: Type.STRING, description: 'ID of the plugin' },
                    path: { type: Type.STRING, description: 'Path to list' }
                  },
                  required: ['pluginId', 'path']
                }
              },
              {
                name: 'move_item',
                description: 'Move an item from one plugin/path to another',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    sourcePluginId: { type: Type.STRING },
                    sourceId: { type: Type.STRING },
                    targetPluginId: { type: Type.STRING },
                    targetPath: { type: Type.STRING }
                  },
                  required: ['sourcePluginId', 'sourceId', 'targetPluginId', 'targetPath']
                }
              }
            ]
          }
        ]
      }
    });

    const text = response.text;
    onUpdate(text || "Task processed.");
    
    if (response.functionCalls) {
        for (const call of response.functionCalls) {
            onUpdate(`Executing: ${call.name}(${JSON.stringify(call.args)})`);
            // In a real app, we'd execute the actual plugin calls here
        }
    }

  } catch (error) {
    console.error("Agent Error:", error);
    onUpdate("Error processing agent task.");
  }
}
