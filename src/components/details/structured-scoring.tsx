"use client";

import { motion } from "motion/react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { 
  Target, 
  FileText, 
  Shield, 
  Clock, 
  User, 
  TrendingUp,
  Info
} from "lucide-react";
import { SimpleTooltip } from "../ui/simple-tooltip";
import { SearchResult } from "@/api/providers/types";

interface StructuredScoringProps {
  scores: {
    topicalRelevance: number;
    contentQuality: number;
    userIntentMatch: number;
    overallScore: number;
    detailedFeedback: string;
  };
  databaseLabel: string;
  provider: string;
  isWinner?: boolean;
}

const scoringDimensions = [
  {
    key: 'topicalRelevance' as const,
    label: 'Topical Relevance',
    description: 'How well results match the query topic',
    icon: Target,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  {
    key: 'contentQuality' as const,
    label: 'Content Quality',
    description: 'Comprehensiveness and accuracy of content',
    icon: FileText,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
  },
  {
    key: 'userIntentMatch' as const,
    label: 'User Intent',
    description: 'How well results match likely user intent',
    icon: User,
    color: 'bg-pink-500',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
  },
];

export function StructuredScoring({ 
  scores, 
  databaseLabel, 
  provider, 
  isWinner = false 
}: StructuredScoringProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Poor';
  };

  return (
    <Card className={`${isWinner ? 'ring-2 ring-yellow-400' : ''} transition-all duration-300`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {databaseLabel}
            {isWinner && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <TrendingUp className="h-4 w-4 text-yellow-500" />
              </motion.div>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`text-xs font-mono ${getScoreColor(scores.overallScore)}`}
            >
              {scores.overallScore.toFixed(1)}/10
            </Badge>
            <Badge 
              variant="secondary" 
              className={`text-xs ${getScoreColor(scores.overallScore)}`}
            >
              {getScoreLabel(scores.overallScore)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Scoring Breakdown */}
        <div className="space-y-3">
          {scoringDimensions.map((dimension, index) => {
            const Icon = dimension.icon;
            const score = scores[dimension.key];
            const percentage = (score / 10) * 100;
            
            return (
              <motion.div
                key={dimension.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${dimension.textColor}`} />
                    <span className="text-sm font-medium">{dimension.label}</span>
                    <SimpleTooltip content={dimension.description}>
                      <Info className="h-3 w-3 text-gray-400 cursor-help" />
                    </SimpleTooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono ${getScoreColor(score)}`}>
                      {score.toFixed(1)}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${dimension.textColor} ${dimension.bgColor}`}
                    >
                      {getScoreLabel(score)}
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2"
                  style={{
                    '--progress-background': `linear-gradient(90deg, ${dimension.color} 0%, ${dimension.color}80 100%)`
                  } as React.CSSProperties}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Detailed Feedback */}
        {scores.detailedFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-3 bg-gray-50 rounded-lg"
          >
            <h4 className="text-sm font-medium text-gray-700 mb-2">LLM Analysis</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              {scores.detailedFeedback}
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

interface ComparisonViewProps {
  db1Scores: StructuredScoringProps['scores'];
  db2Scores: StructuredScoringProps['scores'];
  db1Label: string;
  db2Label: string;
  db1Provider: string;
  db2Provider: string;
  db1Results?: {
    results: SearchResult[];
  };
  db2Results?: {
    results: SearchResult[];
  };
}

export function StructuredScoringComparison({ 
  db1Scores, 
  db2Scores, 
  db1Label, 
  db2Label, 
  db1Provider, 
  db2Provider,
  db1Results,
  db2Results
}: ComparisonViewProps) {
  const db1Wins = db1Scores.overallScore > db2Scores.overallScore;
  const db2Wins = db2Scores.overallScore > db1Scores.overallScore;
  const isTie = db1Scores.overallScore === db2Scores.overallScore;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Structured Relevance Analysis
        </h3>
        <p className="text-sm text-gray-600">
          Detailed breakdown of search result quality across multiple dimensions
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StructuredScoring
          scores={db1Scores}
          databaseLabel={db1Label}
          provider={db1Provider}
          isWinner={db1Wins && !isTie}
        />
        <StructuredScoring
          scores={db2Scores}
          databaseLabel={db2Label}
          provider={db2Provider}
          isWinner={db2Wins && !isTie}
        />
      </div>

      {/* Overall Winner Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        {isTie ? (
          <Badge variant="outline" className="text-lg px-4 py-2">
            🤝 Tie - Both databases performed equally
          </Badge>
        ) : (
          <Badge 
            variant="outline" 
            className={`text-lg px-4 py-2 ${
              db1Wins ? 'text-blue-600 border-blue-600' : 'text-green-600 border-green-600'
            }`}
          >
            🏆 {db1Wins ? db1Label : db2Label} wins by{' '}
            {Math.abs(db1Scores.overallScore - db2Scores.overallScore).toFixed(1)} points
          </Badge>
        )}
      </motion.div>

      {/* Search Results Section */}
      {(db1Results || db2Results) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Search Results
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Database 1 Results */}
            {db1Results && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">
                  {db1Label}
                </h4>
                <div className="space-y-2">
                  {(db1Results.results || []).map((item: any, index: number) => (
                    <motion.div
                      key={index}
                      className="border rounded p-3 text-xs bg-white shadow-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
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
                          <p className="text-gray-600 mb-1 line-clamp-2">
                            {item.description}
                          </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Database 2 Results */}
            {db2Results && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">
                  {db2Label}
                </h4>
                <div className="space-y-2">
                  {(db2Results.results || []).map((item: any, index: number) => (
                    <motion.div
                      key={index}
                      className="border rounded p-3 text-xs bg-white shadow-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
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
                      <p className="text-gray-600 mb-1 line-clamp-2">
                        {item.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
