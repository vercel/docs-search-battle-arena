import { BattleQuery, BattleResult } from "@/api/trpc";
import { SearchResult } from "@/api/providers/types";
import { Trophy } from "lucide-react";

export function QueryItem({
  queryResult,
  battle,
  index,
  isSelected,
  onSelect,
}: {
  queryResult: BattleQuery;
  battle: BattleResult;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
}) {
  // Find database results
  const db1Result = queryResult.results.find(
    (r) => r.databaseId === battle?.databaseId1
  );
  const db2Result = queryResult.results.find(
    (r) => r.databaseId === battle?.databaseId2
  );

  // Calculate average relevance scores
  const calculateAverageRelevanceScore = (results: SearchResult[]) => {
    const scores = results
      .map((item) => item.score)
      .filter(
        (score): score is number => score !== undefined && score !== null && !isNaN(score)
      );

    if (scores.length === 0) return null;
    const average =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return average;
  };

  const db1AvgRelevance = db1Result 
    ? calculateAverageRelevanceScore(db1Result.results as SearchResult[])
    : null;
  const db2AvgRelevance = db2Result 
    ? calculateAverageRelevanceScore(db2Result.results as SearchResult[])
    : null;

  // Calculate score difference using average relevance scores
  const scoreDiff = Math.abs(
    (db1AvgRelevance || 0) - (db2AvgRelevance || 0)
  );

  // Determine winner using average relevance scores
  const db1Wins = (db1AvgRelevance || 0) > (db2AvgRelevance || 0);
  const db2Wins = (db2AvgRelevance || 0) > (db1AvgRelevance || 0);
  const isRelevanceDisabled = db1AvgRelevance === null && db2AvgRelevance === null;

  return (
    <div
      key={index}
      className={`p-2 cursor-pointer hover:bg-gray-50 ${
        isSelected ? "bg-gray-100 border-l-2 border-blue-600" : ""
      }`}
      onClick={() => onSelect(index)}
    >
      <div className="text-xs font-medium truncate mb-1">
        {queryResult.queryText}
      </div>
      {queryResult.error ? (
        <div className="text-red-500 text-xs truncate whitespace-normal max-h-[50px]">
          {queryResult.error}
        </div>
      ) : !isRelevanceDisabled ? (
        <div className="flex items-center justify-between text-xs">
          <div className="flex space-x-2">
            <span className="text-blue-600 font-mono">
              {db1AvgRelevance?.toFixed(2) || "-"}
            </span>
            <span className="text-gray-400">vs</span>
            <span className="text-green-600 font-mono">
              {db2AvgRelevance?.toFixed(2) || "-"}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-gray-500 font-mono">
              Δ{scoreDiff.toFixed(2)}
            </span>
            {db1Wins ? (
              <Trophy className="h-3 w-3 text-blue-500" />
            ) : db2Wins ? (
              <Trophy className="h-3 w-3 text-green-500" />
            ) : (
              <Trophy className="h-3 w-3 text-gray-400" />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
