import { BattleResult, BattleQuery } from "@/api/trpc";
import { SearchResult } from "@/api/providers/types";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

export type SortOptions =
  | "default"
  | "db1-score"
  | "db2-score"
  | "score-diff-1"
  | "score-diff-2"
  | "diff";

export function QueryListSortSelect({
  sortBy,
  setSortBy,
  battle,
}: {
  sortBy: SortOptions;
  setSortBy: (value: SortOptions) => void;
  battle: BattleResult;
}) {
  return (
    <div className="p-3 border-b bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Queries</h3>
        <ArrowUpDown className="h-3 w-3 text-gray-400" />
      </div>
      <Select
        value={sortBy}
        onValueChange={(value: SortOptions) => setSortBy(value)}
      >
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default Order</SelectItem>
          <SelectItem value="db1-score">
            <code className="bg-blue-100 px-1">{battle.database1.label}</code>{" "}
            Score ↓
          </SelectItem>
          <SelectItem value="db2-score">
            <code className="bg-green-100 px-1">{battle.database2.label}</code>{" "}
            Score ↓
          </SelectItem>
          <SelectItem value="score-diff-1">
            <code className="bg-blue-100 px-1">{battle.database1.label}</code>{" "}
            Highlight ↓
          </SelectItem>
          <SelectItem value="score-diff-2">
            <code className="bg-green-100 px-1">{battle.database2.label}</code>{" "}
            Highlight ↓
          </SelectItem>
          <SelectItem value="diff">Diff ↓</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

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

export function sortQueryResults({
  queries,
  sortBy,
  battle,
}: {
  queries: BattleQuery[];
  sortBy: SortOptions;
  battle: BattleResult;
}) {
  return [...queries].sort((a, b) => {
    const aDb1Result = a.results.find(
      (r) => r.databaseId === battle?.databaseId1
    );
    const aDb2Result = a.results.find(
      (r) => r.databaseId === battle?.databaseId2
    );

    const bDb1Result = b.results.find(
      (r) => r.databaseId === battle?.databaseId1
    );
    const bDb2Result = b.results.find(
      (r) => r.databaseId === battle?.databaseId2
    );

    if (!aDb1Result || !aDb2Result || !bDb1Result || !bDb2Result) {
      return 0;
    }

    // Use stored scores from the database
    const aDb1AvgRelevance = aDb1Result.score ? parseFloat(aDb1Result.score) : 0;
    const aDb2AvgRelevance = aDb2Result.score ? parseFloat(aDb2Result.score) : 0;
    const bDb1AvgRelevance = bDb1Result.score ? parseFloat(bDb1Result.score) : 0;
    const bDb2AvgRelevance = bDb2Result.score ? parseFloat(bDb2Result.score) : 0;

    switch (sortBy) {
      case "db1-score":
        return bDb1AvgRelevance - aDb1AvgRelevance; // Higher scores first
      case "db2-score":
        return bDb2AvgRelevance - aDb2AvgRelevance; // Higher scores first
      case "score-diff-1":
        const firstDiff = bDb1AvgRelevance - bDb2AvgRelevance;
        const secondDiff = aDb1AvgRelevance - aDb2AvgRelevance;
        return firstDiff - secondDiff; // Larger differences first
      case "score-diff-2":
        const firstDiff2 = bDb2AvgRelevance - bDb1AvgRelevance;
        const secondDiff2 = aDb2AvgRelevance - aDb1AvgRelevance;
        return firstDiff2 - secondDiff2; // Larger differences first
      case "diff":
        const firstDiff3 = Math.abs(bDb1AvgRelevance - bDb2AvgRelevance);
        const secondDiff3 = Math.abs(aDb1AvgRelevance - aDb2AvgRelevance);
        return firstDiff3 - secondDiff3; // Larger differences first
      default:
        return 0;
    }
  });
}
