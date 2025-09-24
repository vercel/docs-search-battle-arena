import {
  SearchProvider,
  SearchResult,
  UpstashSearchCredentials,
} from "./types";
import { Search } from "@upstash/search";

export class UpstashSearchProvider implements SearchProvider {
  private credentials: UpstashSearchCredentials;
  name = "upstash_search";

  constructor(credentials: UpstashSearchCredentials) {
    this.credentials = credentials;
  }

  private deduplicateByUrl(results: SearchResult[]): SearchResult[] {
    const urlMap = new Map<string, SearchResult>();

    for (const result of results) {
      const url = result.url || "";
      const existing = urlMap.get(url);

      // Keep the result with the higher score, or the first one if scores are equal
      if (!existing || (result.score || 0) > (existing.score || 0)) {
        urlMap.set(url, result);
      }
    }

    // Return results in the order they first appeared
    const seenUrls = new Set<string>();
    return results.filter((result) => {
      const url = result.url || "";
      if (seenUrls.has(url)) {
        return false;
      }
      const mapResult = urlMap.get(url);
      if (mapResult === result) {
        seenUrls.add(url);
        return true;
      }
      return false;
    });
  }

  private deduplicateByTitle(results: SearchResult[]): SearchResult[] {
    const titleMap = new Map<string, SearchResult>();

    for (const result of results) {
      const title = result.title || "";
      const existing = titleMap.get(title);

      // Keep the result with the higher score, or the first one if scores are equal
      if (!existing || (result.score || 0) > (existing.score || 0)) {
        titleMap.set(title, result);
      }
    }

    // Return results in the order they first appeared
    const seenTitles = new Set<string>();
    return results.filter((result) => {
      const title = result.title || "";
      if (seenTitles.has(title)) {
        return false;
      }
      const mapResult = titleMap.get(title);
      if (mapResult === result) {
        seenTitles.add(title);
        return true;
      }
      return false;
    });
  }

  async search(query: string): Promise<SearchResult[]> {
    try {
      // Initialize the Upstash Search client
      const client = new Search({
        url: this.credentials.url,
        token: this.credentials.token,
      });

      // Access the specified index
      const index = client.index<{ title: string; description: string }>(
        this.credentials.index
      );

      // Perform the search

      const options = {
        query,
        limit: 10,
        reranking: this.credentials.reranking,
        inputEnrichment: this.credentials.inputEnrichment,
        filter: {
          title: { notGlob: "*pages*" },
        },
      }

      console.log("Upstash search options:", options);

      const searchResults = await index.search(options);

      // Transform Upstash search results to the common SearchResult format
      const transformedResults = searchResults.map((result) => {
        
        // Try different ways to access the score
        const score1 = result.score;
        const score2 = (result as Record<string, unknown>).score;
        const score3 = result['score'];
        console.log("Score access methods:", { score1, score2, score3 });
        
        // Extract the document content and metadata
        const { id, content, metadata } = result;
        const score = Number(result.score || (result as Record<string, unknown>).score || 0);

        // Handle URL with proper type checking
        let url = "No URL available";
        if (metadata?.url) {
          const urlString = String(metadata.url);
          url = urlString.startsWith('https://vercel.com') 
            ? urlString 
            : `https://vercel.com${urlString}`;
        }

        return {
          id,
          title: content.title ?? "Untitled",
          description: content.description ?? "No description available",
          url: url,
          score: score,
        };
      });

      return this.deduplicateByTitle(transformedResults);
    } catch (error) {
      console.error("Error searching Upstash:", error);
      throw new Error(
        `Upstash search failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
