import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Truck, Trailer } from "@shared/schema";

interface InsuranceRow {
  id: string;
  vehicleType: "Truck" | "Trailer";
  vehicleNumber: string;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  provider: string | null;
  policyNumber: string | null;
  startDate: string | null; // "Added"
  endDate: string | null;   // "Remove"
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(s: string | null | undefined): string {
  const d = parseDate(s);
  return d ? d.toLocaleDateString() : "—";
}

function insuranceStatus(endDateStr: string | null): { label: string; variant: "expired" | "expiring" | "active" | "missing" } {
  if (!endDateStr) return { label: "Not set", variant: "missing" };
  const end = parseDate(endDateStr);
  if (!end) return { label: "Not set", variant: "missing" };
  const now = Date.now();
  if (end.getTime() < now) return { label: "Expired", variant: "expired" };
  const days = Math.ceil((end.getTime() - now) / (24 * 60 * 60 * 1000));
  if (days <= 30) return { label: `${days}d left`, variant: "expiring" };
  return { label: "Active", variant: "active" };
}

function StatusBadge({ status }: { status: ReturnType<typeof insuranceStatus> }) {
  switch (status.variant) {
    case "expired":
      return (
        <Badge variant="destructive" data-testid={`badge-expired`}>
          <AlertTriangle className="mr-1 h-3 w-3" />
          {status.label}
        </Badge>
      );
    case "expiring":
      return (
        <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100" data-testid={`badge-expiring`}>
          <AlertTriangle className="mr-1 h-3 w-3" />
          {status.label}
        </Badge>
      );
    case "active":
      return (
        <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100" data-testid={`badge-active`}>
          <CheckCircle2 className="mr-1 h-3 w-3" />
          {status.label}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" data-testid={`badge-missing`}>
          {status.label}
        </Badge>
      );
  }
}

export default function Insurance() {
  const [search, setSearch] = useState("");
  const { data: trucks = [], isLoading: trucksLoading } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });
  const { data: trailers = [], isLoading: trailersLoading } = useQuery<Trailer[]>({
    queryKey: ["/api/trailers"],
  });

  const rows: InsuranceRow[] = useMemo(() => {
    const truckRows: InsuranceRow[] = trucks.map((t) => ({
      id: t.id,
      vehicleType: "Truck",
      vehicleNumber: t.truckNumber,
      vin: t.vin ?? null,
      year: t.year ?? null,
      make: t.make ?? null,
      model: t.model ?? null,
      provider: (t as any).insuranceProvider ?? null,
      policyNumber: (t as any).insurancePolicyNumber ?? null,
      startDate: (t as any).insuranceStartDate ?? null,
      endDate: (t as any).insuranceExpirationDate ?? null,
    }));
    const trailerRows: InsuranceRow[] = trailers.map((t) => ({
      id: t.id,
      vehicleType: "Trailer",
      vehicleNumber: t.trailerNumber,
      vin: t.vin ?? null,
      year: t.year ?? null,
      make: t.make ?? null,
      model: t.model ?? null,
      provider: (t as any).insuranceProvider ?? null,
      policyNumber: (t as any).insurancePolicyNumber ?? null,
      startDate: (t as any).insuranceStartDate ?? null,
      endDate: (t as any).insuranceExpirationDate ?? null,
    }));
    return [...truckRows, ...trailerRows];
  }, [trucks, trailers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.vehicleNumber, r.vin, r.make, r.model, r.provider, r.policyNumber, r.vehicleType]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  // Stats — at-a-glance counts for the page header.
  const stats = useMemo(() => {
    let active = 0, expiring = 0, expired = 0, missing = 0;
    for (const r of rows) {
      const s = insuranceStatus(r.endDate);
      if (s.variant === "active") active++;
      else if (s.variant === "expiring") expiring++;
      else if (s.variant === "expired") expired++;
      else missing++;
    }
    return { active, expiring, expired, missing, total: rows.length };
  }, [rows]);

  const isLoading = trucksLoading || trailersLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-insurance">
          Insurance
        </h1>
        <p className="text-muted-foreground">Track policy coverage across the fleet</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="mt-1 text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-emerald-700 dark:text-emerald-400">Active</div>
          <div className="mt-1 text-2xl font-bold" data-testid="stat-active">{stats.active}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-amber-700 dark:text-amber-400">Expiring ≤ 30d</div>
          <div className="mt-1 text-2xl font-bold" data-testid="stat-expiring">{stats.expiring}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-red-700 dark:text-red-400">Expired</div>
          <div className="mt-1 text-2xl font-bold" data-testid="stat-expired">{stats.expired}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Not set</div>
          <div className="mt-1 text-2xl font-bold" data-testid="stat-missing">{stats.missing}</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by vehicle #, VIN, provider, policy #, make/model..."
            className="pl-9"
            data-testid="input-search-insurance"
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Make</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Policy #</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Remove</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                    <Shield className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    {search ? "No vehicles match your search." : "No vehicles found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={`${r.vehicleType}-${r.id}`} data-testid={`row-insurance-${r.id}`}>
                    <TableCell className="font-medium">
                      <span className="text-xs text-muted-foreground mr-2">{r.vehicleType}</span>
                      {r.vehicleNumber}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.vin || "—"}</TableCell>
                    <TableCell>{r.year ?? "—"}</TableCell>
                    <TableCell>{r.make || "—"}</TableCell>
                    <TableCell>{r.model || "—"}</TableCell>
                    <TableCell>{r.provider || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.policyNumber || "—"}</TableCell>
                    <TableCell>{formatDate(r.startDate)}</TableCell>
                    <TableCell>{formatDate(r.endDate)}</TableCell>
                    <TableCell>
                      <StatusBadge status={insuranceStatus(r.endDate)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
