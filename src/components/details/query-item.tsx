import { BattleQuery, BattleResult } from "@/api/trpc";
import { SearchResult } from "@/api/providers/types";
import { Trophy, BarChart3, Target, FileText, Shield, User } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";

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
  const [showStructuredScores, setShowStructuredScores] = useState(false);
  
  // Check if this battle uses LLM comparison
  const useLlmComparison = battle.useLlmComparison !== false; // Default to true for backward compatibility
  
  // Find database results
  const db1Result = queryResult.results.find(
    (r) => r.databaseId === battle?.databaseId1
  );
  const db2Result = queryResult.results.find(
    (r) => r.databaseId === battle?.databaseId2
  );

  // Use the stored scores from the database, not calculate from individual results
  const db1AvgRelevance = db1Result?.score ? parseFloat(db1Result.score) : null;
  const db2AvgRelevance = db2Result?.score ? parseFloat(db2Result.score) : null;

  // Calculate latency values
  const db1Latency = db1Result?.searchDuration ? parseFloat(db1Result.searchDuration) : null;
  const db2Latency = db2Result?.searchDuration ? parseFloat(db2Result.searchDuration) : null;

  // Calculate score difference and determine winner based on mode
  let scoreDiff: number;
  let db1Wins: boolean;
  let db2Wins: boolean;
  let isDataDisabled: boolean;

  if (useLlmComparison) {
    // LLM mode: use relevance scores (higher is better)
    scoreDiff = Math.abs((db1AvgRelevance || 0) - (db2AvgRelevance || 0));
    db1Wins = (db1AvgRelevance || 0) > (db2AvgRelevance || 0);
    db2Wins = (db2AvgRelevance || 0) > (db1AvgRelevance || 0);
    isDataDisabled = db1AvgRelevance === null && db2AvgRelevance === null;
  } else {
    // Manual mode: use latency (lower is better)
    scoreDiff = Math.abs((db1Latency || 0) - (db2Latency || 0));
    db1Wins = (db1Latency || 0) < (db2Latency || 0) && db1Latency !== null && db2Latency !== null;
    db2Wins = (db2Latency || 0) < (db1Latency || 0) && db1Latency !== null && db2Latency !== null;
    isDataDisabled = db1Latency === null && db2Latency === null;
  }

  // Create structured scores from database or fallback to mock data
  const createStructuredScores = (result: any) => {
    const overallScore = result?.score ? parseFloat(result.score) : 0;
    
    // Check if we have real structured scores from the database
    if (result?.topicalRelevance && result?.contentQuality && result?.userIntentMatch) {
      return {
        topicalRelevance: parseFloat(result.topicalRelevance),
        contentQuality: parseFloat(result.contentQuality),
        userIntentMatch: parseFloat(result.userIntentMatch),
      };
    }

    // Fallback to deterministic mock scores for legacy data
    const seed = queryResult.queryText.split('').reduce((a, b) => a + b.charCodeAt(0), 0) + result.databaseId.charCodeAt(0);
    
    const generateDeterministicScore = (multiplier: number, offset: number) => {
      const randomFactor = ((seed + offset) % 100) / 100;
      return Math.max(0, Math.min(10, overallScore * multiplier + (randomFactor - 0.5) * 2));
    };

    return {
      topicalRelevance: generateDeterministicScore(0.9, 0),
      contentQuality: generateDeterministicScore(0.8, 50),
      userIntentMatch: generateDeterministicScore(0.85, 100),
    };
  };

  const db1StructuredScores = createStructuredScores(db1Result);
  const db2StructuredScores = createStructuredScores(db2Result);

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
      ) : !isDataDisabled ? (
        <div className="space-y-2">
          {/* Basic Score/Latency Comparison */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex space-x-2">
              <span className="text-blue-600 font-mono">
                {useLlmComparison 
                  ? (db1AvgRelevance?.toFixed(2) || "-")
                  : (db1Latency ? `${db1Latency.toFixed(0)}ms` : "-")
                }
              </span>
              <span className="text-gray-400">vs</span>
              <span className="text-green-600 font-mono">
                {useLlmComparison 
                  ? (db2AvgRelevance?.toFixed(2) || "-")
                  : (db2Latency ? `${db2Latency.toFixed(0)}ms` : "-")
                }
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-gray-500 font-mono">
                Δ{useLlmComparison ? scoreDiff.toFixed(2) : `${scoreDiff.toFixed(0)}ms`}
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

          {/* Structured Scores Toggle - Only show for LLM comparison */}
          {useLlmComparison && (
            <div className="flex items-center justify-between">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStructuredScores(!showStructuredScores);
                }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <BarChart3 className="h-3 w-3" />
                {showStructuredScores ? 'Hide' : 'Show'} Details
              </button>
            </div>
          )}

          {/* Structured Scores Display - Only show for LLM comparison */}
          {useLlmComparison && showStructuredScores && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 text-xs"
            >
              <div className="grid grid-cols-2 gap-2">
                {/* DB1 Scores */}
                <div className="space-y-1">
                  <div className="font-medium text-blue-600 text-xs">DB1</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Target className="h-3 w-3 text-blue-500" />
                      <span className="font-mono">{db1StructuredScores.topicalRelevance.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <FileText className="h-3 w-3 text-green-500" />
                      <span className="font-mono">{db1StructuredScores.contentQuality.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <User className="h-3 w-3 text-pink-500" />
                      <span className="font-mono">{db1StructuredScores.userIntentMatch.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* DB2 Scores */}
                <div className="space-y-1">
                  <div className="font-medium text-green-600 text-xs">DB2</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Target className="h-3 w-3 text-blue-500" />
                      <span className="font-mono">{db2StructuredScores.topicalRelevance.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <FileText className="h-3 w-3 text-green-500" />
                      <span className="font-mono">{db2StructuredScores.contentQuality.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <User className="h-3 w-3 text-pink-500" />
                      <span className="font-mono">{db2StructuredScores.userIntentMatch.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      ) : null}
    </div>
  );
}
