import { SearchResult } from "../providers";
import { generateText } from "ai";

interface EvaluationResult {
  score: number;
  feedback: string;
}

interface StructuredRelevanceEvaluation {
  topicalRelevance: number;    // Does it match the query topic? (0-10)
  contentQuality: number;      // Is the content comprehensive/accurate? (0-10)
  userIntentMatch: number;     // Does it match likely user intent? (0-10)
  overallScore: number;        // Weighted average of all scores
  detailedFeedback: string;    // Detailed explanation of scoring
}

interface ContentEnrichedResult extends SearchResult {
  content?: string;
  contentLength?: number;
  fetchError?: string;
}

export class LLMService {
  private modelName = "gemini-2.5-flash";
  private hasApiKey: boolean;
  private useMockData: boolean;

  constructor() {
    const key =
      process.env.AI_GATEWAY_API_KEY ||
      "";

    if (process.env.AI_GATEWAY_API_KEY) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.AI_GATEWAY_API_KEY;
    }

    this.hasApiKey = !!key;
    this.useMockData = process.env.USE_MOCK_LLM_DATA === 'true';
  }

  /**
   * Generates mock structured scores for testing
   */
  private generateMockStructuredScores(
    query: string,
    results1: SearchResult[],
    results2: SearchResult[]
  ): {
    db1: StructuredRelevanceEvaluation;
    db2: StructuredRelevanceEvaluation;
    llmDuration: number;
  } {
    // Generate consistent mock scores based on query and result count
    const queryHash = query.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const seed1 = queryHash % 1000;
    const seed2 = (queryHash + 1) % 1000;

    const generateScores = (seed: number, resultCount: number) => {
      // Base scores influenced by result count (more results = better scores)
      const resultQuality = Math.min(1, resultCount / 5);
      
      return {
        topicalRelevance: Math.max(3, Math.min(10, 5 + (seed % 100) / 20 + resultQuality * 2)),
        contentQuality: Math.max(3, Math.min(10, 4 + ((seed + 50) % 100) / 20 + resultQuality * 1.5)),
        userIntentMatch: Math.max(3, Math.min(10, 4.5 + ((seed + 100) % 100) / 20 + resultQuality * 1.8)),
      };
    };

    const db1Scores = generateScores(seed1, results1.length);
    const db2Scores = generateScores(seed2, results2.length);

    // Calculate overall scores with proper weighting
    const db1Overall = (
      db1Scores.topicalRelevance * 0.4 +
      db1Scores.contentQuality * 0.35 +
      db1Scores.userIntentMatch * 0.25
    );

    const db2Overall = (
      db2Scores.topicalRelevance * 0.4 +
      db2Scores.contentQuality * 0.35 +
      db2Scores.userIntentMatch * 0.25
    );

    return {
      db1: {
        ...db1Scores,
        overallScore: Math.round(db1Overall * 100) / 100,
        detailedFeedback: `Mock evaluation for "${query}": Topical relevance ${db1Scores.topicalRelevance.toFixed(1)}, Content quality ${db1Scores.contentQuality.toFixed(1)}, User intent match ${db1Scores.userIntentMatch.toFixed(1)}`,
      },
      db2: {
        ...db2Scores,
        overallScore: Math.round(db2Overall * 100) / 100,
        detailedFeedback: `Mock evaluation for "${query}": Topical relevance ${db2Scores.topicalRelevance.toFixed(1)}, Content quality ${db2Scores.contentQuality.toFixed(1)}, User intent match ${db2Scores.userIntentMatch.toFixed(1)}`,
      },
      llmDuration: 50 + (queryHash % 100), // Deterministic timing
    };
  }

  /**
   * Fetches content from a URL with timeout and error handling
   */
  private async fetchPageContent(url: string): Promise<{ content: string; length: number } | null> {
    // Handle relative URLs by adding https://vercel.com prefix
    const fullUrl = url.startsWith('http') 
      ? url 
      : `https://vercel.com${url.startsWith('/') ? url : `/${url}`}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(fullUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SearchArena/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      
      // Simple HTML content extraction (remove scripts, styles, etc.)
      const content = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000); // Limit to 5000 characters

      return {
        content,
        length: content.length
      };
    } catch (error) {
      console.warn(`Failed to fetch content from ${fullUrl} (original: ${url}):`, error);
      return null;
    }
  }

  /**
   * Enriches search results with actual page content
   */
  private async enrichResultsWithContent(results: SearchResult[]): Promise<ContentEnrichedResult[]> {
    const enrichedResults: ContentEnrichedResult[] = [];
    
    // Only fetch content for top 3 results to avoid rate limiting
    const topResults = results.slice(0, 3);
    
    for (const result of topResults) {
      const enriched: ContentEnrichedResult = { ...result };
      
      if (result.url) {
        const contentData = await this.fetchPageContent(result.url);
        if (contentData) {
          enriched.content = contentData.content;
          enriched.contentLength = contentData.length;
        } else {
          enriched.fetchError = "Failed to fetch content";
        }
      }
      
      enrichedResults.push(enriched);
    }
    
    // Add remaining results without content fetching
    enrichedResults.push(...results.slice(3).map(result => ({ ...result })));
    
    return enrichedResults;
  }

  /**
   * Enhanced evaluation with content access and structured scoring
   */
  async evaluateSearchResultsWithContent(
    query: string,
    results1: SearchResult[],
    results2: SearchResult[]
  ): Promise<{
    db1: StructuredRelevanceEvaluation;
    db2: StructuredRelevanceEvaluation;
    llmDuration: number;
  }> {
    // Return mock data if environment variable is set
    if (this.useMockData) {
      console.log("Using mock LLM data for testing");
      return this.generateMockStructuredScores(query, results1, results2);
    }

    // Return fallback scores if no API key is available
    if (!this.hasApiKey) {
      console.log("No LLM API key available, returning fallback scores");
      return {
        db1: {
          topicalRelevance: -1,
          contentQuality: -1,
          userIntentMatch: -1,
          overallScore: -1,
          detailedFeedback: "LLM API key not available",
        },
        db2: {
          topicalRelevance: -1,
          contentQuality: -1,
          userIntentMatch: -1,
          overallScore: -1,
          detailedFeedback: "LLM API key not available",
        },
        llmDuration: 0,
      };
    }

    // Enrich results with actual content
    const enrichedResults1 = await this.enrichResultsWithContent(results1);
    const enrichedResults2 = await this.enrichResultsWithContent(results2);

    const formatEnrichedOutput = (results: ContentEnrichedResult[]) => {
      return results
        .map((result, index) => {
          const contentInfo = result.content 
            ? `\nContent Preview: ${result.content.substring(0, 500)}...` 
            : result.fetchError 
            ? `\nContent Error: ${result.fetchError}` 
            : "\nContent: Not available";
          
          return `Result ${index + 1}:
Title: ${result.title}
Description: ${result.description || "No description"}
URL: ${result.url}${contentInfo}`;
        })
        .join("\n\n");
    };

    // Format the enriched search results for the prompt
    const formattedResults1 = formatEnrichedOutput(enrichedResults1);
    const formattedResults2 = formatEnrichedOutput(enrichedResults2);

    // Create the enhanced prompt for structured evaluation
    const prompt = `
You are a search quality evaluator specializing in relevance assessment. Evaluate the following search results for the query: "${query}"

There are two different search databases, database 1 and database 2. You need to compare the results and assign structured scores based on multiple relevance dimensions.

Database 1 results:
${formattedResults1}

Database 2 results:
${formattedResults2}

EVALUATION CRITERIA:
1. Topical Relevance (0-10): How well do the results match the query topic? Consider both title/description and actual content.
2. Content Quality (0-10): How comprehensive, accurate, and useful is the content? Assess depth and accuracy.
3. User Intent Match (0-10): How well do the results match the likely user intent behind the query?

IMPORTANT: 
- Irrelevant results should be heavily penalized (low topical relevance)
- Consider both metadata (title/description) AND actual content when available
- If content is not available, focus on title/description but note this limitation
- Ordering matters - better results should appear first
- Provide specific feedback explaining your scoring rationale

CRITICAL: You must respond with ONLY valid JSON. No additional text, explanations, or formatting outside the JSON object.

Provide your evaluation in the following EXACT JSON format:
{
  "db1": {
    "topicalRelevance": 8,
    "contentQuality": 7,
    "userIntentMatch": 9,
    "overallScore": 7.95,
    "detailedFeedback": "Database 1 results show strong topical relevance with comprehensive content quality and excellent user intent matching."
  },
  "db2": {
    "topicalRelevance": 6,
    "contentQuality": 8,
    "userIntentMatch": 7,
    "overallScore": 6.95,
    "detailedFeedback": "Database 2 results have good content quality but weaker topical relevance and user intent matching."
  }
}

IMPORTANT: 
- Use only numbers for scores (no quotes around numbers)
- Ensure all required fields are present
- No trailing commas
- No additional text before or after the JSON object`.trim();

    // Generate content with the model and measure timing
    const llmStart = performance.now();
    let result;
    let text;
    try {
      result = await generateText({
        model: "google/gemini-2.5-flash",
        prompt: prompt,
      });
      text = result.text;
    } catch (error) {
      console.error("LLM API call failed:", error);
      // Return fallback scores on API failure
      return {
        db1: {
          topicalRelevance: -1,
          contentQuality: -1,
          userIntentMatch: -1,
          overallScore: -1,
          detailedFeedback: "LLM API call failed",
        },
        db2: {
          topicalRelevance: -1,
          contentQuality: -1,
          userIntentMatch: -1,
          overallScore: -1,
          detailedFeedback: "LLM API call failed",
        },
        llmDuration: 0,
      };
    }
    const llmEnd = performance.now();
    const llmDuration = llmEnd - llmStart;

    // Parse the JSON response with improved error handling
    let jsonResponse;
    try {
      // Try to find JSON object in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON object found in LLM response");
      }

      // Clean up the JSON string - remove any trailing commas or extra characters
      let jsonString = jsonMatch[0];
      
      // Remove trailing commas before closing braces/brackets
      jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
      
      // Try to parse the cleaned JSON
      jsonResponse = JSON.parse(jsonString);
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
      console.error("Failed to parse LLM JSON response:", parseError);
      console.error("Raw LLM response:", text);
      
      // Return fallback scores on JSON parsing failure
      return {
        db1: {
          topicalRelevance: -1,
          contentQuality: -1,
          userIntentMatch: -1,
          overallScore: -1,
          detailedFeedback: `JSON parsing failed: ${errorMessage}`,
        },
        db2: {
          topicalRelevance: -1,
          contentQuality: -1,
          userIntentMatch: -1,
          overallScore: -1,
          detailedFeedback: `JSON parsing failed: ${errorMessage}`,
        },
        llmDuration,
      };
    }

    // Validate and process db1 response
    const db1Failed = !jsonResponse.db1 || 
      typeof jsonResponse.db1.topicalRelevance !== 'number' ||
      typeof jsonResponse.db1.contentQuality !== 'number' ||
      typeof jsonResponse.db1.userIntentMatch !== 'number';

    // Validate and process db2 response
    const db2Failed = !jsonResponse.db2 || 
      typeof jsonResponse.db2.topicalRelevance !== 'number' ||
      typeof jsonResponse.db2.contentQuality !== 'number' ||
      typeof jsonResponse.db2.userIntentMatch !== 'number';

    const processEvaluation = (dbData: {
      topicalRelevance?: number;
      contentQuality?: number;
      userIntentMatch?: number;
      detailedFeedback?: string;
    }, failed: boolean): StructuredRelevanceEvaluation => {
      if (failed) {
        return {
          topicalRelevance: -1,
          contentQuality: -1,
          userIntentMatch: -1,
          overallScore: -1,
          detailedFeedback: "LLM response validation failed",
        };
      }

      const scores = {
        topicalRelevance: Math.max(0, Math.min(10, dbData.topicalRelevance || 0)),
        contentQuality: Math.max(0, Math.min(10, dbData.contentQuality || 0)),
        userIntentMatch: Math.max(0, Math.min(10, dbData.userIntentMatch || 0)),
      };

      // Calculate weighted overall score
      const overallScore = (
        scores.topicalRelevance * 0.4 +      // 40% - Most important
        scores.contentQuality * 0.35 +       // 35% - Very important
        scores.userIntentMatch * 0.25        // 25% - Important for user satisfaction
      );

      return {
        ...scores,
        overallScore: Math.round(overallScore * 100) / 100,
        detailedFeedback: dbData.detailedFeedback || "No detailed feedback provided",
      };
    };

    return {
      db1: processEvaluation(jsonResponse.db1, db1Failed),
      db2: processEvaluation(jsonResponse.db2, db2Failed),
      llmDuration,
    };
  }

  /**
   * Legacy evaluation method for backward compatibility
   * Evaluates search results and assigns a score using Gemini 2.5 Flash
   * If no API key is available, returns fallback scores of 0
   */
  async evaluateSearchResults(
    query: string,
    results1: SearchResult[],
    results2: SearchResult[]
  ): Promise<{
    db1: EvaluationResult;
    db2: EvaluationResult;
    llmDuration: number;
  }> {
    // Return fallback scores if no API key is available
    if (!this.hasApiKey) {
      console.log("No LLM API key available, returning fallback scores");
      return {
        db1: {
          score: -1,
          feedback: "",
        },
        db2: {
          score: -1,
          feedback: "",
        },
        llmDuration: 0,
      };
    }
    const formatOutput = (results: SearchResult[]) => {
      return results
        .map((result, index) => {
          return `Result ${index + 1}:\nTitle: ${result.title}\nDescription: ${result.description || "No description"}\nURL: ${result.url}\n`;
        })
        .join("\n");
    };

    // Format the search results for the prompt
    const formattedResults1 = formatOutput(results1);
    const formattedResults2 = formatOutput(results2);

    // Create the prompt for evaluation
    const prompt = `
You are a search quality evaluator. Evaluate the relevance of the following search results for the query: "${query}"
There are two different databases, database 1 and database 2. You have to compare the results of these two databases
and assign a score to each database based on the quality of the results and their relevance to the query.

Database 1 results:
${formattedResults1}

Database 2 results:
${formattedResults2}

EVALUATION CRITERIA:
- Relevance to the query is the most important factor
- Irrelevant results should be heavily penalized
- Result ordering matters - better results should appear first
- Consider both title/description and overall result quality
- Focus on whether users can find what they're looking for

Provide your evaluation in the following JSON format only:
{
  "db1": {
    "score": [a number between 1.0 and 10.0, where 10 is perfect],
    "feedback": [a brief explanation of your score and assessment of the results]
  },
  "db2": {
    "score": [a number between 1.0 and 10.0, where 10 is perfect],
    "feedback": [a brief explanation of your score and assessment of the results]
  }
}`.trim();

    // Generate content with the model and measure timing
    const llmStart = performance.now();
    let result;
    let text;
    try {
      result = await generateText({
        model: "google/gemini-2.5-flash",
        prompt: prompt,
      });
      text = result.text;
    } catch (error) {
      console.error("LLM API call failed:", error);
      // Return fallback scores on API failure
      return {
        db1: {
          score: -1,
          feedback: "",
        },
        db2: {
          score: -1,
          feedback: "",
        },
        llmDuration: 0,
      };
    }
    const llmEnd = performance.now();
    const llmDuration = llmEnd - llmStart;

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/); // Extract JSON object from text
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from LLM response");
    }

    try {
      const jsonResponse = JSON.parse(jsonMatch[0]);
      const db1Failed =
        !jsonResponse.db1 ||
        !jsonResponse.db1.score ||
        !jsonResponse.db1.feedback;
      const db2Failed =
        !jsonResponse.db2 ||
        !jsonResponse.db2.score ||
        !jsonResponse.db2.feedback;

      return {
        db1: {
          score: db1Failed ? -1 : parseFloat(jsonResponse.db1.score), // Default to 5.0 if parsing fails
          feedback: db1Failed
            ? "LLM response parsing failed: " + jsonMatch[0]
            : jsonResponse.db1.feedback,
        },
        db2: {
          score: db2Failed ? -1 : parseFloat(jsonResponse.db2.score), // Default to 5.0 if parsing fails
          feedback: db2Failed
            ? "LLM response parsing failed: " + jsonMatch[0]
            : jsonResponse.db2.feedback,
        },
        llmDuration,
      };
    } catch (parseError) {
      console.error("Failed to parse LLM response:", parseError);
      throw new Error("Failed to parse LLM evaluation response");
    }
  }
}
