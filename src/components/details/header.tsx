import { trpc } from "@/api/trpc/client";
import { Trophy } from "lucide-react";
import { motion } from "motion/react";
import { ProviderBadge } from "../provider-badge";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { SimpleTooltip } from "../ui/simple-tooltip";
import { SearchResult } from "@/api/providers/types";

// Helper function to calculate average relevance score
const calculateAverageRelevanceScore = (results: SearchResult[]) => {
  const scores = results
    .map((item) => item.score)
    .filter(
      (score): score is number => score !== undefined && score !== null && !isNaN(score)
    );

  if (scores.length === 0) return 0;
  const average =
    scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return average;
};

export const BattleHeader = ({ battleId }: { battleId: string }) => {
  const { data: battle } = trpc.battle.getById.useQuery({ id: battleId });

  if (!battle) return;

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

      if (db1Result) {
        const avgRelevance = calculateAverageRelevanceScore(db1Result.results as SearchResult[]);
        if (avgRelevance > 0) {
          db1TotalRelevance += avgRelevance;
          db1QueryCount++;
        }
      }

      if (db2Result) {
        const avgRelevance = calculateAverageRelevanceScore(db2Result.results as SearchResult[]);
        if (avgRelevance > 0) {
          db2TotalRelevance += avgRelevance;
          db2QueryCount++;
        }
      }
    });

    const db1AvgRelevance = db1QueryCount > 0 ? db1TotalRelevance / db1QueryCount : 0;
    const db2AvgRelevance = db2QueryCount > 0 ? db2TotalRelevance / db2QueryCount : 0;

    return { db1AvgRelevance, db2AvgRelevance };
  };

  const { db1AvgRelevance, db2AvgRelevance } = calculateBattleAverageRelevance();

  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
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
