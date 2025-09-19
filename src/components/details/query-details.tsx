import { SearchResult } from "@/api/providers/types";
import { BattleQuery, BattleResult } from "@/api/trpc";
import { PROVIDERS } from "@/lib/providers";
import { Checkbox } from "../ui/checkbox";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Badge } from "../ui/badge";

export function QueryDetails({
  selectedQuery,
  battle,
}: {
  selectedQuery: BattleQuery;
  battle: BattleResult;
}) {
  const [hideDescriptions, setHideDescriptions] = useState(false);

  const database =
    selectedQuery.results.at(0)?.databaseId === battle.databaseId1
      ? battle.database1
      : battle.database2;

  // Calculate average relevance score for each provider
  const calculateAverageRelevanceScore = (results: SearchResult[]) => {
    const scores = results
      .map(item => item.score)
      .filter(score => score !== undefined && score !== null && !isNaN(score));
    
    if (scores.length === 0) return null;
    
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return average;
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
            {selectedQuery.results.at(0)?.llmDuration &&
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
            )}
          </motion.h2>
          <motion.div
            className="flex items-center space-x-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Checkbox
              id="hide-descriptions"
              checked={hideDescriptions}
              onClick={() => setHideDescriptions(!hideDescriptions)}
              className="h-5 w-5 cursor-pointer"
            />
            <label
              htmlFor="hide-descriptions"
              className="text-xs text-gray-600 cursor-pointer"
            >
              Hide descriptions
            </label>
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
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.2 }}
        >
          {selectedQuery.results
            .sort((a) => (a.databaseId === battle.databaseId1 ? -1 : 1))
            .map((result) => {
              const currentDatabase = result.databaseId === battle.databaseId1
                ? battle.database1
                : battle.database2;
              const averageRelevanceScore = calculateAverageRelevanceScore(result.results as SearchResult[]);
              
              return (
                <div key={result.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">
                      {result.databaseId === battle.databaseId1
                        ? battle.database1.label
                        : battle.database2.label}
                    </h3>
                    <div className="flex gap-1">
                      {result.score && Number(result.score) !== -1 && (
                        <Badge
                          className="text-xs"
                          style={{
                            backgroundColor:
                              PROVIDERS[currentDatabase.provider].color["100"],
                            color: PROVIDERS[currentDatabase.provider].color["800"],
                          }}
                        >
                          Score:{" "}
                          {Number(result.score) === -1 ? "-" : result.score}
                        </Badge>
                      )}
                      {averageRelevanceScore !== null && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          Avg Relevance: {averageRelevanceScore.toFixed(2)}
                        </Badge>
                      )}
                      {result.searchDuration && (
                        <Badge className="bg-amber-100 text-amber-800 text-xs">
                          Search: {Number(result.searchDuration).toFixed(0)}ms
                        </Badge>
                      )}
                    </div>
                  </div>
                {result.llmFeedback && (
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
                          <span className="text-zinc-500">
                            {item.score?.toFixed(2)}
                          </span>
                        </div>
                        {item.url && (
                          <div className="mb-1">
                            <a
                              href={item.url.startsWith('https://vercel.com') ? item.url : `https://vercel.com${item.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs underline break-all"
                            >
                              {item.url.startsWith('https://vercel.com') ? item.url : `https://vercel.com${item.url}`}
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
      </div>
    </motion.div>
  );
}
