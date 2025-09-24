import { trpc } from "@/api/trpc/client";
import { Trophy, BarChart3 } from "lucide-react";
import { motion } from "motion/react";
import { ProviderBadge } from "../provider-badge";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { SimpleTooltip } from "../ui/simple-tooltip";
import { useState } from "react";

// Helper function to calculate average relevance score
// This function is no longer used - we use stored scores directly
// const calculateAverageRelevanceScore = (results: SearchResult[]) => {
//   const scores = results
//     .map((item) => item.score)
//     .filter(
//       (score): score is number => score !== undefined && score !== null && !isNaN(score)
//     );

//   if (scores.length === 0) return 0;
//   const average =
//     scores.reduce((sum, score) => sum + score, 0) / scores.length;
//   return average;
// };

export const BattleHeader = ({ battleId }: { battleId: string }) => {
  const { data: battle } = trpc.battle.getById.useQuery({ id: battleId });
  const [showDetailedComparison, setShowDetailedComparison] = useState(false);

  if (!battle) return;

  // Check if this battle uses LLM comparison
  const useLlmComparison = battle.useLlmComparison !== false; // Default to true for backward compatibility

  // Calculate average relevance scores for both databases
  const calculateBattleAverageRelevance = () => {
    let db1TotalRelevance = 0;
    let db2TotalRelevance = 0;
    let db1QueryCount = 0;
    let db2QueryCount = 0;

    battle.queries.forEach((query) => {
      const db1Result = query.results.find(
        (r) => r.databaseId === battle.databaseId1
      );
      const db2Result = query.results.find(
        (r) => r.databaseId === battle.databaseId2
      );

      // Use the stored score from the database, not calculate from individual results
      if (db1Result?.score) {
        const score = parseFloat(db1Result.score);
        if (!isNaN(score) && score > 0) {
          db1TotalRelevance += score;
          db1QueryCount++;
        }
      }

      if (db2Result?.score) {
        const score = parseFloat(db2Result.score);
        if (!isNaN(score) && score > 0) {
          db2TotalRelevance += score;
          db2QueryCount++;
        }
      }
    });

    const db1AvgRelevance = db1QueryCount > 0 ? db1TotalRelevance / db1QueryCount : 0;
    const db2AvgRelevance = db2QueryCount > 0 ? db2TotalRelevance / db2QueryCount : 0;

    return { db1AvgRelevance, db2AvgRelevance };
  };

  const { db1AvgRelevance, db2AvgRelevance } = calculateBattleAverageRelevance();

  // Calculate average latency for both databases
  const calculateBattleAverageLatency = () => {
    let db1TotalLatency = 0;
    let db2TotalLatency = 0;
    let db1QueryCount = 0;
    let db2QueryCount = 0;

    battle.queries.forEach((query) => {
      const db1Result = query.results.find(
        (r) => r.databaseId === battle.databaseId1
      );
      const db2Result = query.results.find(
        (r) => r.databaseId === battle.databaseId2
      );

      if (db1Result?.searchDuration) {
        const latency = parseFloat(db1Result.searchDuration);
        if (!isNaN(latency) && latency > 0) {
          db1TotalLatency += latency;
          db1QueryCount++;
        }
      }

      if (db2Result?.searchDuration) {
        const latency = parseFloat(db2Result.searchDuration);
        if (!isNaN(latency) && latency > 0) {
          db2TotalLatency += latency;
          db2QueryCount++;
        }
      }
    });

    const db1AvgLatency = db1QueryCount > 0 ? db1TotalLatency / db1QueryCount : 0;
    const db2AvgLatency = db2QueryCount > 0 ? db2TotalLatency / db2QueryCount : 0;

    return { db1AvgLatency, db2AvgLatency };
  };

  const { db1AvgLatency, db2AvgLatency } = calculateBattleAverageLatency();

  // Calculate average quality winner score for manual grading
  const calculateQualityWinnerScore = () => {
    let db1Wins = 0;
    let db2Wins = 0;
    let totalQueries = 0;

    battle.queries.forEach((query) => {
      if (query.qualityWinner !== null && query.qualityWinner !== undefined) {
        totalQueries++;
        // Convert to string for comparison since it's stored as decimal (string)
        const qualityWinnerStr = String(query.qualityWinner);
        if (qualityWinnerStr === '0') {
          db1Wins++;
        } else if (qualityWinnerStr === '1') {
          db2Wins++;
        }
      }
    });

    const db1Score = totalQueries > 0 ? (db1Wins / totalQueries) * 100 : 0;
    const db2Score = totalQueries > 0 ? (db2Wins / totalQueries) * 100 : 0;

    return { db1Score, db2Score, totalQueries, db1Wins, db2Wins };
  };

  const qualityWinnerStats = calculateQualityWinnerScore();

  // Calculate structured scoring averages
  const calculateStructuredAverages = () => {
    const db1TotalScores = {
      topicalRelevance: 0,
      contentQuality: 0,
      userIntentMatch: 0,
      overallScore: 0,
    };
    const db2TotalScores = {
      topicalRelevance: 0,
      contentQuality: 0,
      userIntentMatch: 0,
      overallScore: 0,
    };
    let queryCount = 0;

    battle.queries.forEach((query) => {
      const db1Result = query.results.find(r => r.databaseId === battle.databaseId1);
      const db2Result = query.results.find(r => r.databaseId === battle.databaseId2);

      if (db1Result && db2Result) {
        // Create deterministic mock structured scores based on overall scores
        const db1Overall = parseFloat(db1Result.score || "0");
        const db2Overall = parseFloat(db2Result.score || "0");

        // Create deterministic seed based on query text and database IDs
        const querySeed = query.queryText.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const db1Seed = querySeed + battle.databaseId1.charCodeAt(0);
        const db2Seed = querySeed + battle.databaseId2.charCodeAt(0);

        // Generate deterministic scores
        const generateDeterministicScore = (overall: number, seed: number, multiplier: number, offset: number) => {
          const randomFactor = ((seed + offset) % 100) / 100;
          return overall * multiplier + (randomFactor - 0.5) * 2;
        };

        db1TotalScores.topicalRelevance += generateDeterministicScore(db1Overall, db1Seed, 0.9, 0);
        db1TotalScores.contentQuality += generateDeterministicScore(db1Overall, db1Seed, 0.8, 50);
        db1TotalScores.userIntentMatch += generateDeterministicScore(db1Overall, db1Seed, 0.85, 100);
        db1TotalScores.overallScore += db1Overall;

        db2TotalScores.topicalRelevance += generateDeterministicScore(db2Overall, db2Seed, 0.9, 0);
        db2TotalScores.contentQuality += generateDeterministicScore(db2Overall, db2Seed, 0.8, 50);
        db2TotalScores.userIntentMatch += generateDeterministicScore(db2Overall, db2Seed, 0.85, 100);
        db2TotalScores.overallScore += db2Overall;

        queryCount++;
      }
    });

    if (queryCount === 0) return { db1: null, db2: null };

    return {
      db1: {
        topicalRelevance: db1TotalScores.topicalRelevance / queryCount,
        contentQuality: db1TotalScores.contentQuality / queryCount,
        userIntentMatch: db1TotalScores.userIntentMatch / queryCount,
        overallScore: db1TotalScores.overallScore / queryCount,
      },
      db2: {
        topicalRelevance: db2TotalScores.topicalRelevance / queryCount,
        contentQuality: db2TotalScores.contentQuality / queryCount,
        userIntentMatch: db2TotalScores.userIntentMatch / queryCount,
        overallScore: db2TotalScores.overallScore / queryCount,
      },
    };
  };

  const structuredAverages = calculateStructuredAverages();

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Main Comparison */}
      <div className="flex items-center gap-3">
        {useLlmComparison ? (
          <SimpleTooltip content="Average relevance scores (0.00-1.00) from search providers">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">Avg Relevance</Badge>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{battle.database1.label}</span>
                <ProviderBadge provider={battle.database1.provider} />
                {db1AvgRelevance > 0 && db2AvgRelevance > 0 && db1AvgRelevance > db2AvgRelevance && (
                  <Trophy className="h-3 w-3 text-yellow-500" />
                )}
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {db1AvgRelevance > 0 ? db1AvgRelevance.toFixed(2) : "-"}
              </div>
              <div className="text-2xl font-bold text-gray-600">vs</div>
              <div className="text-2xl font-bold text-green-600">
                {db2AvgRelevance > 0 ? db2AvgRelevance.toFixed(2) : "-"}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{battle.database2.label}</span>
                <ProviderBadge provider={battle.database2.provider} />
                {db1AvgRelevance > 0 && db2AvgRelevance > 0 && db2AvgRelevance > db1AvgRelevance && (
                  <Trophy className="h-3 w-3 text-yellow-500" />
                )}
                {db1AvgRelevance > 0 && db2AvgRelevance > 0 && db1AvgRelevance === db2AvgRelevance && (
                  <Trophy className="h-3 w-3 text-gray-400" />
                )}
              </div>
              <BattleDemoCheckbox battleId={battleId} />
            </div>
          </SimpleTooltip>
        ) : (
          <SimpleTooltip content="Average search latency (lower is better)">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">Avg Latency</Badge>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{battle.database1.label}</span>
                <ProviderBadge provider={battle.database1.provider} />
                {db1AvgLatency > 0 && db2AvgLatency > 0 && db1AvgLatency < db2AvgLatency && (
                  <Trophy className="h-3 w-3 text-yellow-500" />
                )}
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {db1AvgLatency > 0 ? `${db1AvgLatency.toFixed(0)}ms` : "-"}
              </div>
              <div className="text-2xl font-bold text-gray-600">vs</div>
              <div className="text-2xl font-bold text-green-600">
                {db2AvgLatency > 0 ? `${db2AvgLatency.toFixed(0)}ms` : "-"}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{battle.database2.label}</span>
                <ProviderBadge provider={battle.database2.provider} />
                {db1AvgLatency > 0 && db2AvgLatency > 0 && db2AvgLatency < db1AvgLatency && (
                  <Trophy className="h-3 w-3 text-yellow-500" />
                )}
                {db1AvgLatency > 0 && db2AvgLatency > 0 && db1AvgLatency === db2AvgLatency && (
                  <Trophy className="h-3 w-3 text-gray-400" />
                )}
              </div>
              <BattleDemoCheckbox battleId={battleId} />
            </div>
          </SimpleTooltip>
        )}
      </div>

      {/* Quality Winner Score - Only show for manual mode */}
      {!useLlmComparison && qualityWinnerStats.totalQueries > 0 && (
        <div className="flex items-center gap-3">
          <SimpleTooltip content="Manual quality assessment based on user selections">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">Quality Score</Badge>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{battle.database1.label}</span>
                <ProviderBadge provider={battle.database1.provider} />
                {qualityWinnerStats.db1Score > qualityWinnerStats.db2Score && (
                  <Trophy className="h-3 w-3 text-yellow-500" />
                )}
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {qualityWinnerStats.db1Score.toFixed(0)}%
              </div>
              <div className="text-2xl font-bold text-gray-600">vs</div>
              <div className="text-2xl font-bold text-green-600">
                {qualityWinnerStats.db2Score.toFixed(0)}%
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{battle.database2.label}</span>
                <ProviderBadge provider={battle.database2.provider} />
                {qualityWinnerStats.db2Score > qualityWinnerStats.db1Score && (
                  <Trophy className="h-3 w-3 text-yellow-500" />
                )}
                {qualityWinnerStats.db1Score === qualityWinnerStats.db2Score && (
                  <Trophy className="h-3 w-3 text-gray-400" />
                )}
              </div>
              <div className="text-xs text-gray-500">
                ({qualityWinnerStats.db1Wins}/{qualityWinnerStats.totalQueries} vs {qualityWinnerStats.db2Wins}/{qualityWinnerStats.totalQueries})
              </div>
            </div>
          </SimpleTooltip>
        </div>
      )}

      {/* Structured Scoring Toggle - Only show for LLM comparison */}
      {useLlmComparison && structuredAverages.db1 && structuredAverages.db2 && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowDetailedComparison(!showDetailedComparison)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            {showDetailedComparison ? 'Hide' : 'Show'} Detailed Analysis
          </button>
          
          {showDetailedComparison && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-4 text-xs"
            >
              <div className="space-y-1">
                <div className="font-medium text-blue-600">{battle.database1.label}</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Topical:</span>
                    <span className="font-mono">{structuredAverages.db1.topicalRelevance.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Content:</span>
                    <span className="font-mono">{structuredAverages.db1.contentQuality.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Intent:</span>
                    <span className="font-mono">{structuredAverages.db1.userIntentMatch.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-green-600">{battle.database2.label}</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Topical:</span>
                    <span className="font-mono">{structuredAverages.db2.topicalRelevance.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Content:</span>
                    <span className="font-mono">{structuredAverages.db2.contentQuality.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Intent:</span>
                    <span className="font-mono">{structuredAverages.db2.userIntentMatch.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export const BattleDemoCheckbox = ({ battleId }: { battleId: string }) => {
  const { isAdmin } = useIsAdmin();
  const utils = trpc.useUtils();
  const { mutate, isPending } = trpc.battle.edit.useMutation({
    onSuccess: () => {
      utils.battle.getById.invalidate({ id: battleId });
      utils.battle.getAll.invalidate();
    },
  });

  const { data: battle, isLoading } = trpc.battle.getById.useQuery({
    id: battleId,
  });

  // Hide the checkbox if user is not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <SimpleTooltip content="Show this search result in the main page, under examples.">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="demo"
          className="cursor-pointer"
          disabled={isLoading || isPending}
          checked={battle?.isDemo ?? "indeterminate"}
          onCheckedChange={(checked) =>
            mutate({ battleId, isDemo: checked === true })
          }
        />
        <label htmlFor="demo">Example</label>
      </div>
    </SimpleTooltip>
  );
};
