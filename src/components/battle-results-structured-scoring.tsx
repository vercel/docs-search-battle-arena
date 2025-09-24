"use client";

import { motion } from "motion/react";
import { Badge } from "./ui/badge";
import { 
  Target, 
  FileText, 
  Shield, 
  Clock, 
  User, 
  TrendingUp,
  BarChart3
} from "lucide-react";
import { SimpleTooltip } from "./ui/simple-tooltip";
import { useState } from "react";

interface StructuredScoringData {
  topicalRelevance: number;
  contentQuality: number;
  userIntentMatch: number;
  overallScore: number;
}

interface StructuredScoringCellProps {
  db1Scores: StructuredScoringData;
  db2Scores: StructuredScoringData;
  db1Label: string;
  db2Label: string;
  compact?: boolean;
}

const scoringDimensions = [
  {
    key: 'topicalRelevance' as const,
    label: 'Topical',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    key: 'contentQuality' as const,
    label: 'Content',
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    key: 'userIntentMatch' as const,
    label: 'Intent',
    icon: User,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
];

export function StructuredScoringCell({ 
  db1Scores, 
  db2Scores, 
  db1Label, 
  db2Label,
  compact = false 
}: StructuredScoringCellProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getWinner = (db1Score: number, db2Score: number) => {
    if (db1Score > db2Score) return 'db1';
    if (db2Score > db1Score) return 'db2';
    return 'tie';
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Overall Score Comparison */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-blue-600">{db1Label}</span>
            <span className={`text-sm font-bold ${getScoreColor(db1Scores.overallScore)}`}>
              {db1Scores.overallScore.toFixed(1)}
            </span>
            {getWinner(db1Scores.overallScore, db2Scores.overallScore) === 'db1' && (
              <TrendingUp className="h-3 w-3 text-yellow-500" />
            )}
          </div>
          <span className="text-xs text-gray-400">vs</span>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-green-600">{db2Label}</span>
            <span className={`text-sm font-bold ${getScoreColor(db2Scores.overallScore)}`}>
              {db2Scores.overallScore.toFixed(1)}
            </span>
            {getWinner(db1Scores.overallScore, db2Scores.overallScore) === 'db2' && (
              <TrendingUp className="h-3 w-3 text-yellow-500" />
            )}
          </div>
        </div>

        {/* Quick Breakdown */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <BarChart3 className="h-3 w-3" />
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>

        {/* Detailed Breakdown */}
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 text-xs"
          >
            {scoringDimensions.map((dimension, index) => {
              const Icon = dimension.icon;
              const db1Score = db1Scores[dimension.key];
              const db2Score = db2Scores[dimension.key];
              const winner = getWinner(db1Score, db2Score);

              return (
                <div key={dimension.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Icon className={`h-3 w-3 ${dimension.color}`} />
                    <span className="text-gray-600">{dimension.label}:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono ${getScoreColor(db1Score)}`}>
                      {db1Score.toFixed(1)}
                    </span>
                    <span className="text-gray-400">vs</span>
                    <span className={`font-mono ${getScoreColor(db2Score)}`}>
                      {db2Score.toFixed(1)}
                    </span>
                    {winner !== 'tie' && (
                      <TrendingUp className={`h-3 w-3 ${
                        winner === 'db1' ? 'text-blue-500' : 'text-green-500'
                      }`} />
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>
    );
  }

  // Full detailed view
  return (
    <div className="space-y-3">
      {/* Overall Score Comparison */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-blue-600">{db1Label}</span>
          <Badge 
            variant="outline" 
            className={`text-xs font-mono ${getScoreColor(db1Scores.overallScore)}`}
          >
            {db1Scores.overallScore.toFixed(1)}/10
          </Badge>
          {getWinner(db1Scores.overallScore, db2Scores.overallScore) === 'db1' && (
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          )}
        </div>
        <span className="text-sm text-gray-400">vs</span>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-green-600">{db2Label}</span>
          <Badge 
            variant="outline" 
            className={`text-xs font-mono ${getScoreColor(db2Scores.overallScore)}`}
          >
            {db2Scores.overallScore.toFixed(1)}/10
          </Badge>
          {getWinner(db1Scores.overallScore, db2Scores.overallScore) === 'db2' && (
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          )}
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-2 gap-2">
        {scoringDimensions.map((dimension, index) => {
          const Icon = dimension.icon;
          const db1Score = db1Scores[dimension.key];
          const db2Score = db2Scores[dimension.key];
          const winner = getWinner(db1Score, db2Score);

          return (
            <motion.div
              key={dimension.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Icon className={`h-3 w-3 ${dimension.color}`} />
                  <span className="text-xs font-medium">{dimension.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-mono ${getScoreColor(db1Score)}`}>
                    {db1Score.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-400">vs</span>
                  <span className={`text-xs font-mono ${getScoreColor(db2Score)}`}>
                    {db2Score.toFixed(1)}
                  </span>
                  {winner !== 'tie' && (
                    <TrendingUp className={`h-3 w-3 ${
                      winner === 'db1' ? 'text-blue-500' : 'text-green-500'
                    }`} />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Helper function to create mock structured scores from battle data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMockStructuredScoresFromBattle(battle: any) {
  if (!battle.queries || battle.queries.length === 0) {
    return {
      db1: {
        topicalRelevance: 0,
        contentQuality: 0,
        authorityScore: 0,
        freshnessScore: 0,
        userIntentMatch: 0,
        overallScore: 0,
      },
      db2: {
        topicalRelevance: 0,
        contentQuality: 0,
        authorityScore: 0,
        freshnessScore: 0,
        userIntentMatch: 0,
        overallScore: 0,
      },
    };
  }

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  battle.queries.forEach((query: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db1Result = query.results.find((r: any) => r.databaseId === battle.databaseId1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db2Result = query.results.find((r: any) => r.databaseId === battle.databaseId2);

    if (db1Result && db2Result) {
      const db1Overall = parseFloat(db1Result.score || "0");
      const db2Overall = parseFloat(db2Result.score || "0");

      // Create deterministic mock structured scores based on overall scores
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const querySeed = query.queryText.split('').reduce((a: any, b: string) => a + b.charCodeAt(0), 0);
      const db1Seed = querySeed + battle.databaseId1.charCodeAt(0);
      const db2Seed = querySeed + battle.databaseId2.charCodeAt(0);

      // Generate deterministic scores
      const generateDeterministicScore = (overall: number, seed: number, multiplier: number, offset: number) => {
        const randomFactor = ((seed + offset) % 100) / 100;
        return Math.max(0, Math.min(10, overall * multiplier + (randomFactor - 0.5) * 2));
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

  if (queryCount === 0) {
    return {
      db1: {
        topicalRelevance: 0,
        contentQuality: 0,
        userIntentMatch: 0,
        overallScore: 0,
      },
      db2: {
        topicalRelevance: 0,
        contentQuality: 0,
        userIntentMatch: 0,
        overallScore: 0,
      },
    };
  }

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
}
