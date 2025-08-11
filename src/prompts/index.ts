import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PromptManager {
  private cache = new Map<string, string>();
  
  async getPrompt(name: string): Promise<string> {
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }
    
    const promptPath = path.join(__dirname, `${name}.txt`);
    const prompt = await fs.readFile(promptPath, 'utf-8');
    this.cache.set(name, prompt);
    return prompt;
  }
  
  fillTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key]?.toString() || match;
    });
  }
}

async function loadPrompt(name: string): Promise<string> {
  const promptPath = path.join(__dirname, `${name}.txt`);
  return fs.readFile(promptPath, 'utf-8');
}

export const prompts = {
  hypothesisEnrichment: await loadPrompt('hypothesis-enrichment'),
};

export const promptManager = new PromptManager(); 