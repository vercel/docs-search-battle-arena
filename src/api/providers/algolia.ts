import { AlgoliaCredentials, SearchProvider, SearchResult } from "./types";
import { algoliasearch } from "algoliasearch";
import { createFetchRequester } from "@algolia/requester-fetch";

export class AlgoliaSearchProvider implements SearchProvider {
  private credentials: AlgoliaCredentials;
  name = "algolia";

  constructor(credentials: AlgoliaCredentials) {
    this.credentials = credentials;
  }

  async search(query: string): Promise<SearchResult[]> {
    try {
      // Initialize the Algolia client with application ID and API key
      const client = algoliasearch(
        this.credentials.applicationId,
        this.credentials.apiKey,
        {
          requester: createFetchRequester(),
        }
      );

      // Define the type for search hits
      interface AlgoliaHit {
        id: number;
        objectID?: string;
        title?: string;
        overview?: string;
        content?: string;
        url?: string;
        _rankingInfo?: {
          promoted: boolean;
          nbTypos: number;
          firstMatchedWord: number;
          proximityDistance: number;
          userScore: number;
          geoDistance: number;
          geoPrecision: number;
          nbExactWords: number;
          words: number;
          filters: number;
          sumOrFiltersScores: number;
          sumAndFiltersScores: number;
        };
      }

      // Perform the search using client.search
      console.log("Algolia search request:", {
        indexName: this.credentials.index,
        query,
        hitsPerPage: 10,
        getRankingInfo: true,
      });
      
      const { results } = await client.search({
        requests: [
          {
            indexName: this.credentials.index,
            query,
            hitsPerPage: 10,
            getRankingInfo: true, // Enable ranking information
          },
        ],
      });
      
      console.log("Algolia search response:", JSON.stringify(results, null, 2));

      // Transform Algolia results to the common SearchResult format
      // Get hits from the first result
      // TypeScript needs a type assertion here
      const firstResult = results[0] as {
        hits?: Array<Record<string, unknown>>;
      };
      const hits = firstResult?.hits || [];

      // @ts-expect-error alksjdalksjd
      return hits.map((hit: AlgoliaHit, index: number) => {
        // Debug: Log the hit structure and ranking info
        console.log(`Algolia hit ${index}:`, JSON.stringify(hit, null, 2));
        console.log(`Algolia ranking info:`, hit._rankingInfo);
        
        // Create a synthetic relevance score based on ranking position
        // Use a more gradual scoring system that ensures different scores
        const totalHits = hits.length;
        let relevanceScore = 1.0 - (index / Math.max(totalHits - 1, 1)) * 0.8; // Base score from 1.0 to 0.2
        
        // Add some variation based on content length and title matching
        const titleLength = (hit.title || '').length;
        const contentLength = (hit.content || '').length;
        
        // Slight bonus for longer, more descriptive content
        if (titleLength > 20) relevanceScore += 0.05;
        if (contentLength > 100) relevanceScore += 0.05;
        
        // Ensure we have some variation even without ranking info
        relevanceScore += (index % 3) * 0.01; // Small variation based on position
        
        // Adjust score based on ranking information if available
        if (hit._rankingInfo) {
          const rankingInfo = hit._rankingInfo;
          console.log(`Ranking info for hit ${index}:`, rankingInfo);
          
          // Penalize for typos (more significant penalty)
          if (rankingInfo.nbTypos > 0) {
            relevanceScore -= Math.min(0.3, rankingInfo.nbTypos * 0.15);
          }
          
          // Reward exact word matches
          if (rankingInfo.nbExactWords > 0) {
            relevanceScore += Math.min(0.2, rankingInfo.nbExactWords * 0.1);
          }
          
          // Reward word proximity (lower distance is better)
          if (rankingInfo.proximityDistance > 0) {
            const proximityBonus = Math.max(0, 0.15 - (rankingInfo.proximityDistance * 0.02));
            relevanceScore += proximityBonus;
          }
          
          // Reward user score if available
          if (rankingInfo.userScore > 0) {
            relevanceScore += Math.min(0.1, rankingInfo.userScore * 0.05);
          }
        } else {
          console.log(`No ranking info available for hit ${index}`);
        }
        
        // Ensure score is between 0 and 1
        relevanceScore = Math.max(0, Math.min(1, relevanceScore));
        
        console.log(`Final relevance score for hit ${index}:`, relevanceScore);
        
        return {
          id: hit.objectID,
          title: hit.title,
          description: hit.content,
          url: `https://vercel.com${hit.url}`,
          score: relevanceScore,
        };
      });
    } catch (error) {
      console.error("Error searching Algolia:", error);
      throw new Error(
        `Algolia search failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
