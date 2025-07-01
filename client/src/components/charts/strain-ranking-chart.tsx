import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Target, Star, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrainRankingProps {
  startMaterialFilter?: string;
}

interface StrainPerformance {
  strain: string;
  overallScore: number;
  rank: number;
  totalBatches: number;
  avgYield: number;
  yieldConsistency: number;
  bestYield: number;
  recentPerformance: number;
  qualityScore: number;
}

export function StrainRankingChart({ startMaterialFilter = "all" }: StrainRankingProps) {
  const { data: rankings, isLoading, error } = useQuery<StrainPerformance[]>({
    queryKey: ["/api/analytics/strain-performance-ranking", startMaterialFilter],
    enabled: true,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Strain Performance Rankings
          </CardTitle>
          <CardDescription>
            Strains ranked by yield, consistency, and quality metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !rankings || rankings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Strain Performance Rankings
          </CardTitle>
          <CardDescription>
            Strains ranked by yield, consistency, and quality metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {error ? "Failed to load strain rankings" : "No strain data available yet"}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200";
    if (rank === 2) return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200";
    if (rank === 3) return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200";
    return "bg-muted text-muted-foreground border-border";
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 dark:text-green-400";
    if (score >= 6) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Strain Performance Rankings
        </CardTitle>
        <CardDescription>
          Strains ranked by yield, consistency, quality, and recent performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rankings.map((strain) => (
            <div
              key={strain.strain}
              className={cn(
                "p-4 rounded-lg border bg-card transition-colors hover:bg-accent/50",
                strain.rank <= 3 && "ring-2 ring-primary/10"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={cn("px-2 py-1 font-semibold", getRankBadgeColor(strain.rank))}
                  >
                    #{strain.rank}
                  </Badge>
                  <div>
                    <h3 className="font-semibold text-lg">{strain.strain}</h3>
                    <p className="text-sm text-muted-foreground">
                      {strain.totalBatches} batch{strain.totalBatches !== 1 ? 'es' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-current" />
                    <span className={cn("text-xl font-bold", getScoreColor(strain.overallScore))}>
                      {strain.overallScore}
                    </span>
                    <span className="text-sm text-muted-foreground">/10</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-muted-foreground">Avg Yield</p>
                    <p className="font-semibold">{strain.avgYield}%</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-muted-foreground">Consistency</p>
                    <p className="font-semibold">
                      {strain.yieldConsistency < 2 ? "Excellent" : 
                       strain.yieldConsistency < 4 ? "Good" : 
                       strain.yieldConsistency < 6 ? "Fair" : "Variable"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-muted-foreground">Best Yield</p>
                    <p className="font-semibold">{strain.bestYield}%</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-muted-foreground">Quality</p>
                    <p className="font-semibold">{strain.qualityScore}/10</p>
                  </div>
                </div>
              </div>

              {strain.rank <= 3 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Recent Performance: {strain.recentPerformance}%</span>
                    <span>Consistency Score: ±{strain.yieldConsistency.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {rankings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No strain data available for ranking
          </div>
        )}
      </CardContent>
    </Card>
  );
}