import { SearchResult } from "@/api/providers/types";
import { BattleQuery, BattleResult } from "@/api/trpc";
import { PROVIDERS } from "@/lib/providers";
import { Checkbox } from "../ui/checkbox";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Badge } from "../ui/badge";
import { StructuredScoringComparison } from "./structured-scoring";
import { trpc } from "@/api/trpc/client";

export function QueryDetails({
  selectedQuery,
  battle,
}: {
  selectedQuery: BattleQuery;
  battle: BattleResult;
}) {
  const [hideDescriptions, setHideDescriptions] = useState(false);
  const [showStructuredView, setShowStructuredView] = useState(true);

  // Check if this battle uses LLM comparison
  const useLlmComparison = battle.useLlmComparison !== false; // Default to true for backward compatibility

  // Get detailed results if available
  const { data: detailedResults } = trpc.battle.getDetailedResults.useQuery(
    { battleId: battle.id },
    { enabled: !!battle.id }
  );

  // Get utils for invalidating queries
  const utils = trpc.useUtils();

  // Mutation for setting manual winners
  const setManualWinner = trpc.battle.setManualWinner.useMutation({
    onSuccess: () => {
      // Invalidate queries to refresh the data
      utils.battle.getById.invalidate({ id: battle.id });
    },
  });

  // Mutation for setting quality winners
  const setQualityWinner = trpc.battle.setQualityWinner.useMutation({
    onSuccess: () => {
      // No need to invalidate since we're using optimistic updates
    },
    onError: (error) => {
      console.error('Error setting quality winner:', error);
      // Revert optimistic update on error
      utils.battle.getById.invalidate({ id: battle.id });
    },
  });

  // Create structured scores from database or fallback to mock data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createStructuredScores = (result: any) => {
    const overallScore = result.score ? parseFloat(result.score) : 0;
    const feedback = result.llmFeedback || "No detailed analysis available";
    
    // Check if we have real structured scores from the database
    if (result.topicalRelevance && result.contentQuality && result.userIntentMatch) {
      return {
        topicalRelevance: parseFloat(result.topicalRelevance),
        contentQuality: parseFloat(result.contentQuality),
        userIntentMatch: parseFloat(result.userIntentMatch),
        overallScore: overallScore,
        detailedFeedback: feedback,
      };
    }

    // Fallback to deterministic mock scores for legacy data
    const seed = selectedQuery.queryText.split('').reduce((a, b) => a + b.charCodeAt(0), 0) + result.databaseId.charCodeAt(0);
    
    const generateDeterministicScore = (baseMultiplier: number, seedOffset: number) => {
      const randomFactor = ((seed + seedOffset) % 100) / 100;
      return Math.max(0, Math.min(10, overallScore * baseMultiplier + (randomFactor - 0.5) * 2));
    };

    const topicalRelevance = generateDeterministicScore(0.9, 0);
    const contentQuality = generateDeterministicScore(0.8, 50);
    const userIntentMatch = generateDeterministicScore(0.85, 100);

    return {
      topicalRelevance,
      contentQuality,
      userIntentMatch,
      overallScore: overallScore,
      detailedFeedback: `Mock evaluation for "${selectedQuery.queryText}": Topical relevance ${topicalRelevance.toFixed(1)}, Content quality ${contentQuality.toFixed(1)}, User intent match ${userIntentMatch.toFixed(1)}`,
    };
  };


  // Calculate average relevance scores for both databases
  const getAverageRelevanceScores = () => {
    const db1Result = selectedQuery.results.find(
      (r) => r.databaseId === battle.databaseId1
    );
    const db2Result = selectedQuery.results.find(
      (r) => r.databaseId === battle.databaseId2
    );

    // Use the stored score from the database, not calculate from individual results
    const db1AvgRelevance = db1Result?.score ? parseFloat(db1Result.score) : null;
    const db2AvgRelevance = db2Result?.score ? parseFloat(db2Result.score) : null;

    return { db1AvgRelevance, db2AvgRelevance };
  };

  return (
    <motion.div
      className="flex-grow overflow-y-auto border rounded bg-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.2 }}
    >
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center justify-between gap-2">
          <motion.h2
            className="text-sm font-medium flex justify-between grow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Results: &quot;{selectedQuery.queryText}&quot;
            {useLlmComparison ? (
              selectedQuery.results.at(0)?.llmDuration &&
              Number(selectedQuery.results.at(0)?.llmDuration) > 0 ? (
                <Badge className="bg-purple-100 text-purple-800 text-xs">
                  LLM:{" "}
                  {(
                    Number(selectedQuery.results.at(0)?.llmDuration) / 1000
                  ).toFixed(1)}
                  s
                </Badge>
              ) : (
                selectedQuery.results.at(0)?.score === "-1" && (
                  <Badge className="bg-gray-100 text-gray-600 text-xs">
                    LLM: Disabled
                  </Badge>
                )
              )
            ) : (
              <Badge className="bg-blue-100 text-blue-800 text-xs">
                Manual Selection Mode
              </Badge>
            )}
          </motion.h2>
          <motion.div
            className="flex items-center space-x-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {useLlmComparison && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="structured-view"
                  checked={showStructuredView}
                  onClick={() => setShowStructuredView(!showStructuredView)}
                  className="h-4 w-4 cursor-pointer"
                />
                <label
                  htmlFor="structured-view"
                  className="text-xs text-gray-600 cursor-pointer"
                >
                  Structured Analysis
                </label>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hide-descriptions"
                checked={hideDescriptions}
                onClick={() => setHideDescriptions(!hideDescriptions)}
                className="h-4 w-4 cursor-pointer"
              />
              <label
                htmlFor="hide-descriptions"
                className="text-xs text-gray-600 cursor-pointer"
              >
                Hide descriptions
              </label>
            </div>
          </motion.div>
        </div>
      </div>

      {selectedQuery.error && (
        <div className="p-3">
          <motion.div
            className="bg-red-50 border border-red-200 rounded p-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {selectedQuery.error}
            </motion.p>
          </motion.div>
        </div>
      )}

      <div className="p-3">
        {useLlmComparison && showStructuredView ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.2 }}
          >
            <StructuredScoringComparison
              db1Scores={createStructuredScores(
                selectedQuery.results.find(r => r.databaseId === battle.databaseId1),
              )}
              db2Scores={createStructuredScores(
                selectedQuery.results.find(r => r.databaseId === battle.databaseId2),
              )}
              db1Label={battle.database1.label}
              db2Label={battle.database2.label}
              db1Provider={battle.database1.provider}
              db2Provider={battle.database2.provider}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              db1Results={selectedQuery.results.find(r => r.databaseId === battle.databaseId1) as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              db2Results={selectedQuery.results.find(r => r.databaseId === battle.databaseId2) as any}
            />
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.2 }}
          >
          {selectedQuery.results
            .sort((a) => (a.databaseId === battle.databaseId1 ? -1 : 1))
            .map((result) => {
              const currentDatabase =
                result.databaseId === battle.databaseId1
                  ? battle.database1
                  : battle.database2;
              // Use the stored score from the database
              const averageRelevanceScore = result.score ? parseFloat(result.score) : null;

              return (
                <div key={result.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">
                      {result.databaseId === battle.databaseId1
                        ? battle.database1.label
                        : battle.database2.label}
                    </h3>
                    <div className="flex items-center gap-2">
                      {!useLlmComparison && (
                        <div className="flex items-center space-x-1">
                          <Checkbox
                            id={`quality-winner-${result.id}`}
                            checked={
                              selectedQuery.qualityWinner !== null && 
                              selectedQuery.qualityWinner !== undefined &&
                              (
                                (result.databaseId === battle.databaseId1 && String(selectedQuery.qualityWinner) === '0') ||
                                (result.databaseId === battle.databaseId2 && String(selectedQuery.qualityWinner) === '1')
                              )
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                // Set quality winner: 0 for database1, 1 for database2
                                const qualityWinner = result.databaseId === battle.databaseId1 ? 0 : 1;
                                
                                // Optimistic update
                                utils.battle.getById.setData({ id: battle.id }, (oldData) => {
                                  if (!oldData) return oldData;
                                  return {
                                    ...oldData,
                                    queries: oldData.queries.map((query) => {
                                      if (query.id === selectedQuery.id) {
                                        return {
                                          ...query,
                                          qualityWinner: String(qualityWinner),
                                        };
                                      }
                                      return query;
                                    }),
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  } as any;
                                });
                                
                                setQualityWinner.mutate({
                                  battleQueryId: selectedQuery.id,
                                  qualityWinner,
                                });
                              } else {
                                // Clear quality winner by setting to null
                                
                                // Optimistic update
                                utils.battle.getById.setData({ id: battle.id }, (oldData) => {
                                  if (!oldData) return oldData;
                                  return {
                                    ...oldData,
                                    queries: oldData.queries.map((query) => {
                                      if (query.id === selectedQuery.id) {
                                        return {
                                          ...query,
                                          qualityWinner: null,
                                        };
                                      }
                                      return query;
                                    }),
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  } as any;
                                });
                                
                                setQualityWinner.mutate({
                                  battleQueryId: selectedQuery.id,
                                  qualityWinner: -1, // We'll use -1 to indicate "clear"
                                });
                              }
                            }}
                            className="h-4 w-4"
                          />
                          <label
                            htmlFor={`quality-winner-${result.id}`}
                            className="text-xs text-gray-600 cursor-pointer"
                          >
                            Quality Winner
                          </label>
                        </div>
                      )}
                      <div className="flex gap-1">
                        {result.searchDuration && (
                          <Badge className="bg-amber-100 text-amber-800 text-xs">
                            Search: {Number(result.searchDuration).toFixed(0)}ms
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {useLlmComparison && result.llmFeedback && (
                    <p className="text-xs text-gray-500 my-2 h-[100px] overflow-scroll">
                      {result.llmFeedback}
                    </p>
                  )}
                  <div className="space-y-2">
                    <AnimatePresence>
                      {(result.results as SearchResult[]).map((item, index) => (
                        <motion.div
                          key={index}
                          className="border rounded p-2 text-xs"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{
                            duration: 0.3,
                            delay: index * 0.05,
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="font-medium">{item.title}</div>
                          </div>
                          {item.url && (
                            <div className="mb-1">
                              <a
                                href={
                                  item.url.startsWith("https://vercel.com")
                                    ? item.url
                                    : `https://vercel.com${item.url}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-xs underline break-all"
                              >
                                {item.url.startsWith("https://vercel.com")
                                  ? item.url
                                  : `https://vercel.com${item.url}`}
                              </a>
                            </div>
                          )}
                          <motion.p
                            initial={{
                              opacity: 0,
                              height: hideDescriptions ? "0" : "auto",
                            }}
                            animate={{
                              opacity: 1,
                              height: hideDescriptions ? "0" : "auto",
                            }}
                            transition={{ delay: index * 0.02 }}
                            className="text-gray-600 mb-1 line-clamp-2"
                          >
                            {item.description}
                          </motion.p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
