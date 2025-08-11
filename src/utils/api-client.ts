import { config } from '../config/index.js';
import { logger } from './logger.js';

export class ApiClient {
  async callWithRetry<T>(
    apiName: string,
    fn: () => Promise<T>,
    maxRetries = config.retryPolicy.maxRetries,
    baseDelay = config.retryPolicy.baseDelayMs
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          logger.error(`${apiName} failed after ${maxRetries} attempts`, error);
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.warn(`${apiName} attempt ${attempt} failed, retrying in ${delay}ms`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Unreachable');
  }
} 