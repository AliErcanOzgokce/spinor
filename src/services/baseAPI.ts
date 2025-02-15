/**
 * Make an API request with caching and rate limiting
 */
protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<APIResponse<T>> {
    const cacheKey = this.getCacheKey(endpoint, options);

    // Check cache first
    const cachedData = this.getFromCache<T>(cacheKey);
    if (cachedData) {
        return {
            success: true,
            data: cachedData,
            timestamp: Date.now()
        };
    }

    // Apply rate limiting
    await this.applyRateLimit(endpoint);

    // Make the request with retries
    let attempt = 0;
    while (attempt < (this.config.maxRetries || 3)) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 10000);

            const response = await fetch(
                `${this.config.baseURL}${endpoint}`,
                {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...(this.config.apiKey && {
                            'Authorization': `Bearer ${this.config.apiKey}`
                        }),
                        ...options.headers
                    },
                    signal: controller.signal
                }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            
            // Cache the successful response
            this.setCache(cacheKey, data);

            return {
                success: true,
                data,
                timestamp: Date.now()
            };
        } catch (error) {
            attempt++;
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    console.error(`Request timeout after ${this.config.timeout}ms`);
                }
            }
            if (attempt === this.config.maxRetries) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: Date.now()
                };
            }
            // Exponential backoff with jitter
            const backoffTime = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
    }

    return {
        success: false,
        error: 'Max retries exceeded',
        timestamp: Date.now()
    };
} 