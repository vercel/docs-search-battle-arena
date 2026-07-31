import {
  SearchProvider,
  SearchResult,
  MixedBreadSearchCredentials,
} from "./types";
import {
  ScoredAudioURLInputChunk,
  ScoredImageURLInputChunk,
  ScoredTextInputChunk,
  ScoredVideoURLInputChunk,
} from "@mixedbread/sdk/resources/vector-stores";
import slugify from "slugify";
import Mixedbread from "@mixedbread/sdk";

export class MixedBreadSearchProvider implements SearchProvider {
  private credentials: MixedBreadSearchCredentials;
  name = "mxbai_search";

  constructor(credentials: MixedBreadSearchCredentials) {
    this.credentials = credentials;
  }

  async search(query: string): Promise<SearchResult[]> {
    try {
      // Initialize the MXBAI Search client
      const mxbai = new Mixedbread({
        apiKey: this.credentials.apiKey ?? "",
      });

      const res = await mxbai.vectorStores.search({
        query,
        vector_store_identifiers: [this.credentials.storeId],
        top_k: 10,
        search_options: {
          return_metadata: true,
          rerank: this.credentials.reranking,
        },
      });



      const structuredResponse = res.data.flatMap(
        (
          item:
            | ScoredTextInputChunk
            | ScoredImageURLInputChunk
            | ScoredAudioURLInputChunk
            | ScoredVideoURLInputChunk,
          index: number
        ) => {
          const description = item.text;
          const headingContext = Array.isArray(
            item.generated_metadata?.heading_context
          )
            ? (item.generated_metadata.heading_context as Array<{
              text: string;
              level: number;
            }>)
            : [];
          const chunkHeadings = Array.isArray(
            item.generated_metadata?.chunk_headings
          )
            ? (item.generated_metadata.chunk_headings as Array<{
              text: string;
              level: number;
            }>)
            : [];
          const pageTitle =
            item.generated_metadata?.title ||
            headingContext.find(
              (h: { text: string; level: number }) => h.level === 1
            )?.text ||
            chunkHeadings.find(
              (h: { text: string; level: number }) => h.level === 1
            )?.text ||
            "Untitled";

          // Get section_title: first level 2 heading from chunk_headings, then heading_context
          const secondaryTitle =
            chunkHeadings.find(
              (h: { text: string; level: number }) => h.level === 2
            )?.text || "";
          const anchor = slugify(secondaryTitle, { lower: true });
          const sectionTitle =
            chunkHeadings.find(
              (h: { text: string; level: number }) => h.level === 2
            )?.text ||
            headingContext.find(
              (h: { text: string; level: number }) => h.level === 2
            )?.text ||
            "";

          let url = "";
          if (item.generated_metadata?.path) {
            url =
              anchor !== ""
                ? `${item.generated_metadata.path}#${anchor}`
                : `${item.generated_metadata.path}`;
          } else if (item.filename) {
            // Extract path starting from /docs/ and remove file extension
            const docsIndex = item.filename.indexOf("/docs/");
            if (docsIndex !== -1) {
              const pathFromDocs = item.filename.substring(docsIndex);
              // Remove file extension (.md, .mdx, etc.)
              url = pathFromDocs.replace(/\.[^/.]+$/, "");
            }
          }

          return [
            {
              id: `${item.file_id}-${index}-page`,
              title: pageTitle as string,
              description: description as string,
              url,
              score: item.score,
            },
          ];
        }
      );

      return structuredResponse;
    } catch (error) {
      console.error("Error searching MXBAI:", error);
      throw new Error(
        `MXBAI search failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
