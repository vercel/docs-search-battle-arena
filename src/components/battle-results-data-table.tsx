"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Clock,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCallback, useEffect, useMemo, useState } from "react";
import { trpc } from "@/api/trpc/client";
import { BattleResult } from "@/api/trpc";
import { SearchResult } from "@/api/providers/types";
import { ProviderBadge } from "./provider-badge";
import { SimpleTooltip } from "./ui/simple-tooltip";
import { motion, AnimatePresence } from "motion/react";
import { BattleSetupModal } from "./battle-setup-modal";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useRouter } from "next/navigation";

const emptyArray: BattleResult[] = [];

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

// Helper function to calculate average search timing
const calculateAverageSearchTiming = (battle: BattleResult) => {
  if (!battle.queries || battle.queries.length === 0) {
    return { db1AvgTiming: 0, db2AvgTiming: 0 };
  }

  let db1TotalTiming = 0;
  let db2TotalTiming = 0;
  let db1QueryCount = 0;
  let db2QueryCount = 0;

  battle.queries.forEach((query) => {
    const db1Result = query.results.find(
      (r) => r.databaseId === battle.databaseId1
    );
    const db2Result = query.results.find(
      (r) => r.databaseId === battle.databaseId2
    );

    if (db1Result && db1Result.searchDuration) {
      const timing = parseFloat(db1Result.searchDuration);
      if (!isNaN(timing) && timing > 0) {
        db1TotalTiming += timing;
        db1QueryCount++;
      }
    }

    if (db2Result && db2Result.searchDuration) {
      const timing = parseFloat(db2Result.searchDuration);
      if (!isNaN(timing) && timing > 0) {
        db2TotalTiming += timing;
        db2QueryCount++;
      }
    }
  });

  const db1AvgTiming = db1QueryCount > 0 ? db1TotalTiming / db1QueryCount : 0;
  const db2AvgTiming = db2QueryCount > 0 ? db2TotalTiming / db2QueryCount : 0;

  return { db1AvgTiming, db2AvgTiming };
};

const useBattleTable = ({
  handleEditBattle,
  handleDeleteBattle,
  isDemo,
}: {
  handleEditBattle: (id: string) => void;
  handleDeleteBattle: (id: string) => void;
  isDemo: boolean;
}) => {
  const { isAdmin } = useIsAdmin();
  const { data: battleResults = emptyArray } = trpc.battle.getAll.useQuery({
    isDemo,
  });

  const columns: ColumnDef<BattleResult>[] = useMemo(
    () => [
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          const getStatusConfig = (status: string) => {
            switch (status) {
              case "completed":
                return {
                  variant: "default" as const,
                  text: "Completed",
                };
              case "in_progress":
                return {
                  variant: "secondary" as const,
                  icon: <Loader2 className="h-3 w-3 animate-spin" />,
                  text: "Battle running",
                };
              case "pending":
                return {
                  variant: "outline" as const,
                  icon: <Clock className="h-3 w-3" />,
                  text: "Pending",
                };
              case "failed":
                return {
                  variant: "destructive" as const,
                  icon: <AlertTriangle className="h-3 w-3" />,
                  text: "Failed",
                };
              default:
                return {
                  variant: "outline" as const,
                  icon: <Clock className="h-3 w-3" />,
                  text: status,
                };
            }
          };

          const config = getStatusConfig(status);
          return (
            <SimpleTooltip content={row.original.error}>
              <Badge
                variant={config.variant}
                className="text-xs font-medium capitalize"
              >
                {config.icon}
                {config.text}
              </Badge>
            </SimpleTooltip>
          );
        },
      },
      {
        accessorKey: "label",
        header: "Battle",
        cell: ({ row }) => {
          const battle = row.original;
          return (
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-sm">{battle.label}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "database1",
        header: "Database 1",
        cell: ({ row }) => {
          const db = row.original.database1;
          return (
            <div className="flex items-center space-x-2">
              <SimpleTooltip content={<ProviderBadge provider={db.provider} />}>
                <span className="text-sm font-medium truncate max-w-[120px]">
                  {db.label}
                </span>
              </SimpleTooltip>
            </div>
          );
        },
      },
      {
        accessorKey: "database2",
        header: "Database 2",
        cell: ({ row }) => {
          const db = row.original.database2;
          return (
            <div className="flex items-center space-x-2">
              <SimpleTooltip content={<ProviderBadge provider={db.provider} />}>
                <span className="text-sm font-medium truncate max-w-[120px]">
                  {db.label}
                </span>
              </SimpleTooltip>
            </div>
          );
        },
      },
      {
        header: "Query Count",
        cell: ({ row }) => {
          const battle = row.original;
          return (
            <span className="text-sm text-gray-700">
              {battle.queries?.length || 0}
            </span>
          );
        },
      },
      {
        accessorKey: "results",
        header: () => (
          <SimpleTooltip content="Average relevance scores (0.00-1.00) from search providers">
            <div className="flex items-center gap-1 cursor-help">
              <span>Avg Relevance</span>
              <Badge variant="outline" className="text-xs px-1 py-0">0-1</Badge>
            </div>
          </SimpleTooltip>
        ),
        sortingFn: (rowA, rowB) => {
          const battleA = rowA.original;
          const battleB = rowB.original;

          if (battleA.status !== "completed" || !battleA.queries || battleA.queries.length === 0) return 1;
          if (battleB.status !== "completed" || !battleB.queries || battleB.queries.length === 0) return -1;

          // Calculate average relevance for both battles
          const calculateBattleAvgRelevance = (battle: BattleResult) => {
            let db1TotalRelevance = 0;
            let db2TotalRelevance = 0;
            let db1QueryCount = 0;
            let db2QueryCount = 0;

            battle.queries.forEach((query) => {
              const db1Result = query.results.find((r) => r.databaseId === battle.databaseId1);
              const db2Result = query.results.find((r) => r.databaseId === battle.databaseId2);

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
            return Math.max(db1AvgRelevance, db2AvgRelevance);
          };

          const relevanceA = calculateBattleAvgRelevance(battleA);
          const relevanceB = calculateBattleAvgRelevance(battleB);

          return relevanceB - relevanceA; // Higher relevance first
        },
        cell: ({ row }) => {
          const battle = row.original;

          if (battle.status !== "completed" || !battle.queries || battle.queries.length === 0) {
            return <span className="text-xs text-gray-400">-</span>;
          }

          // Calculate average relevance scores for both databases
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

          // Check if both scores are 0 (no relevance data)
          const isRelevanceDisabled = db1AvgRelevance === 0 && db2AvgRelevance === 0;

          return (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <span className="text-sm font-bold text-blue-600">
                  {db1AvgRelevance > 0 ? db1AvgRelevance.toFixed(2) : "-"}
                </span>
                {!isRelevanceDisabled && db1AvgRelevance > db2AvgRelevance && (
                  <Trophy className="h-3 w-3 text-yellow-500" />
                )}
              </div>
              <span className="text-xs text-gray-400">vs</span>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-bold text-green-600">
                  {db2AvgRelevance > 0 ? db2AvgRelevance.toFixed(2) : "-"}
                </span>
                {!isRelevanceDisabled && db2AvgRelevance > db1AvgRelevance && (
                  <Trophy className="h-3 w-3 text-yellow-500" />
                )}
                {!isRelevanceDisabled && db1AvgRelevance === db2AvgRelevance && (
                  <Trophy className="h-3 w-3 text-gray-400" />
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "searchTiming",
        header: () => (
          <SimpleTooltip content="Average search response times in milliseconds">
            <div className="flex items-center gap-1 cursor-help">
              <span>Avg Timing</span>
              <Badge variant="outline" className="text-xs px-1 py-0">ms</Badge>
            </div>
          </SimpleTooltip>
        ),
        sortingFn: (rowA, rowB) => {
          const battleA = rowA.original;
          const battleB = rowB.original;

          if (battleA.status !== "completed" || !battleA.queries || battleA.queries.length === 0) return 1;
          if (battleB.status !== "completed" || !battleB.queries || battleB.queries.length === 0) return -1;

          const timingA = calculateAverageSearchTiming(battleA);
          const timingB = calculateAverageSearchTiming(battleB);

          // Use the faster (lower) timing for comparison
          const fastestA = Math.min(timingA.db1AvgTiming || Infinity, timingA.db2AvgTiming || Infinity);
          const fastestB = Math.min(timingB.db1AvgTiming || Infinity, timingB.db2AvgTiming || Infinity);

          return fastestA - fastestB; // Faster timing first
        },
        cell: ({ row }) => {
          const battle = row.original;

          if (battle.status !== "completed" || !battle.queries || battle.queries.length === 0) {
            return <span className="text-xs text-gray-400">-</span>;
          }

          const { db1AvgTiming, db2AvgTiming } = calculateAverageSearchTiming(battle);

          // Check if both timings are 0 (no timing data)
          const isTimingDisabled = db1AvgTiming === 0 && db2AvgTiming === 0;

          return (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <span className="text-sm font-bold text-blue-600">
                  {db1AvgTiming > 0 ? `${db1AvgTiming.toFixed(0)}ms` : "-"}
                </span>
                {!isTimingDisabled && db1AvgTiming < db2AvgTiming && (
                  <Trophy className="h-3 w-3 text-yellow-500" />
                )}
              </div>
              <span className="text-xs text-gray-400">vs</span>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-bold text-green-600">
                  {db2AvgTiming > 0 ? `${db2AvgTiming.toFixed(0)}ms` : "-"}
                </span>
                {!isTimingDisabled && db2AvgTiming < db1AvgTiming && (
                  <Trophy className="h-3 w-3 text-yellow-500" />
                )}
                {!isTimingDisabled && db1AvgTiming === db2AvgTiming && (
                  <Trophy className="h-3 w-3 text-gray-400" />
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created At",
        cell: ({ row }) => {
          const createdAt = row.original.createdAt;
          return (
            <span className="text-xs text-gray-500">
              {/* With time */}
              {createdAt ? new Date(createdAt).toLocaleString() : "Unknown"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const battle = row.original;

          return (
            <div className="flex items-center space-x-2">
              <SimpleTooltip content="Edit & Re-run">
                <Button
                  variant="ghost"
                  onClick={() => handleEditBattle(battle.id)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                </Button>
              </SimpleTooltip>
              {(!isDemo || isAdmin) && (
                <SimpleTooltip content="Delete Battle">
                  <Button
                    variant="ghost"
                    onClick={() => handleDeleteBattle(battle.id)}
                    className="hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                  </Button>
                </SimpleTooltip>
              )}
            </div>
          );
        },
      },
    ],
    [isDemo, isAdmin, handleEditBattle, handleDeleteBattle]
  );

  const table = useReactTable<BattleResult>({
    getRowId: (row) => row.id,
    data: battleResults,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return table;
};

export default function BattleResultsDataTable({
  isDemo,
}: {
  isDemo: boolean;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const { data: battleResults, isLoading } = trpc.battle.getAll.useQuery(
    {
      isDemo,
    },
    {
      refetchInterval: shouldRefetch ? 4000 : undefined,
    }
  );
  console.log("isLoading", isLoading);
  useEffect(() => {
    if (isDemo) return;

    setShouldRefetch(
      battleResults?.some(
        (battle) =>
          battle.status === "in_progress" || battle.status === "pending"
      ) ?? false
    );
  }, [battleResults, isDemo]);

  const [editBattleData, setEditBattleData] = useState<{
    open: boolean;
    data: {
      label: string;
      databaseId1: string;
      databaseId2: string;
      queries: string;
    } | null;
  }>({
    open: false,
    data: null,
  });

  const deleteBattleMutation = trpc.battle.delete.useMutation({
    onSuccess: () => {
      utils.battle.getAll.invalidate();
    },
    onError: (error) => {
      console.error("Failed to delete battle:", error.message);
    },
  });

  const handleEditBattle = useCallback(
    (id: string) => {
      const battle = battleResults?.find((b) => b.id === id);
      if (battle) {
        // Convert queries array to string format for the modal
        const queriesString = Array.isArray(battle.queries) 
          ? battle.queries.map(q => q.queryText).join('\n')
          : battle.queries;
          
        setEditBattleData({
          open: true,
          data: {
            label: battle.label,
            databaseId1: battle.databaseId1,
            databaseId2: battle.databaseId2,
            queries: queriesString,
          },
        });
      }
    },
    [battleResults]
  );

  const handleNewBattle = useCallback(() => {
    setEditBattleData({
      open: true,
      data: null,
    });
  }, []);

  const handleDeleteBattle = useCallback(
    (id: string) => {
      deleteBattleMutation.mutate({ battleId: id });
    },
    [deleteBattleMutation]
  );

  const table = useBattleTable({
    handleEditBattle,
    handleDeleteBattle,
    isDemo,
  });

  return (
    <div className="w-full">
      <BattleSetupModal
        open={editBattleData.open}
        onClose={() => setEditBattleData({ open: false, data: null })}
        initialData={editBattleData.data || undefined}
      />
      {!isDemo && (
        <div className="flex items-center justify-between py-4">
          <Input
            placeholder="Filter battles..."
            value={(table.getColumn("label")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("label")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />

          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleNewBattle}>
              <Plus /> New Battle
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                utils.battle.getAll.invalidate();
              }}
            >
              {trpc.battle.getAll.useQuery({ isDemo }).isFetching ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
            </Button>
          </div>
        </div>
      )}
      <div className="rounded-md border">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="skeleton-table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell className="h-12">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          ) : (
            <motion.div
              key="real-table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className="hover:bg-gray-100 cursor-pointer"
                        onClick={(e) => {
                          // Prevent navigation if the click is on the action buttons
                          if (
                            e.target instanceof HTMLElement &&
                            e.target.closest("button")
                          )
                            return;
                          router.push(`/battle/${row.original.id}`);
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="p-4">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9999} className="h-24 text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
