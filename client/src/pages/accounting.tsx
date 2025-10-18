import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, TrendingDown, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MetricCard } from "@/components/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Load } from "@shared/schema";

export default function Accounting() {
  const { data: loads = [], isLoading } = useQuery<Load[]>({
    queryKey: ["/api/loads"],
  });

  const totalRevenue = loads.reduce((sum, load) => sum + Number(load.rate), 0);
  const totalExpenses = loads.reduce((sum, load) => sum + Number(load.expenses || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0";

  const invoicedLoads = loads.filter(l => l.status === "invoiced");
  const deliveredLoads = loads.filter(l => l.status === "delivered");
  const pendingRevenue = deliveredLoads.reduce((sum, load) => sum + Number(load.rate), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Accounting</h1>
        <p className="text-sm text-muted-foreground">Financial overview and load profitability</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 22, isPositive: true }}
        />
        <MetricCard
          title="Total Expenses"
          value={`$${totalExpenses.toLocaleString()}`}
          icon={TrendingDown}
        />
        <MetricCard
          title="Net Profit"
          value={`$${netProfit.toLocaleString()}`}
          icon={TrendingUp}
          description={`${profitMargin}% margin`}
        />
        <MetricCard
          title="Pending Revenue"
          value={`$${pendingRevenue.toLocaleString()}`}
          icon={Package}
          description={`${deliveredLoads.length} delivered loads`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Load Profitability</CardTitle>
          <CardDescription>Revenue, expenses, and profit by load</CardDescription>
        </CardHeader>
        <CardContent>
          {loads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-medium">No financial data yet</h3>
              <p className="text-sm text-muted-foreground">
                Create loads to start tracking your financials
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Load #</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loads.map((load) => {
                    const revenue = Number(load.rate);
                    const expenses = Number(load.expenses || 0);
                    const profit = revenue - expenses;
                    const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0";
                    const isProfit = profit >= 0;

                    return (
                      <TableRow key={load.id} data-testid={`row-accounting-${load.id}`}>
                        <TableCell className="font-medium">{load.loadNumber}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {load.pickupLocation} → {load.deliveryLocation}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium">
                            {load.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${revenue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ${expenses.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${isProfit ? 'text-chart-2' : 'text-destructive'}`}>
                          ${profit.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right ${isProfit ? 'text-chart-2' : 'text-destructive'}`}>
                          {margin}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
