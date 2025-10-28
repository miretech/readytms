import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import "@/styles/print.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { generateSettlementPDF } from "@/lib/pdf-generator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Printer, Mail, Truck, Phone, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Settlement,
  Driver,
  Truck,
  SettlementLineItem,
  SettlementDeduction,
} from "@shared/schema";

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "Paid":
      return "default";
    case "Approved":
      return "secondary";
    case "Pending":
      return "outline";
    case "Cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

export default function SettlementDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const settlementId = params.id;
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!settlement) return;
    
    setIsGeneratingPDF(true);
    try {
      await generateSettlementPDF(
        settlement,
        driver,
        lineItems,
        deductions
      );
      toast({
        title: "PDF Downloaded",
        description: "Settlement PDF has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const { data: settlement, isLoading: settlementLoading } = useQuery<Settlement>({
    queryKey: [`/api/settlements/${settlementId}`],
    enabled: !!settlementId,
  });

  const { data: driver, isLoading: driverLoading } = useQuery<Driver>({
    queryKey: [`/api/drivers/${settlement?.driverId}`],
    enabled: !!settlement?.driverId,
  });

  const { data: truck, isLoading: truckLoading } = useQuery<Truck>({
    queryKey: [`/api/trucks/${driver?.assignedTruckId}`],
    enabled: !!driver?.assignedTruckId,
  });

  const { data: lineItems = [], isLoading: lineItemsLoading } = useQuery<SettlementLineItem[]>({
    queryKey: [`/api/settlements/${settlementId}/line-items`],
    enabled: !!settlementId,
  });

  const { data: deductions = [], isLoading: deductionsLoading } = useQuery<SettlementDeduction[]>({
    queryKey: [`/api/settlements/${settlementId}/deductions`],
    enabled: !!settlementId,
  });

  const isLoading = settlementLoading || driverLoading || truckLoading || lineItemsLoading || deductionsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardHeader>
            <CardTitle>Settlement Not Found</CardTitle>
            <CardDescription>
              The settlement you are looking for could not be found.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild data-testid="button-back">
              <Link href="/settlements">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Settlements
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalLoadRevenue = lineItems.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
  const totalFactoredAmount = lineItems.reduce((sum, item) => sum + parseFloat(item.factoredAmount?.toString() || "0"), 0);
  const totalDeductionsAmount = deductions.reduce((sum, deduction) => sum + parseFloat(deduction.amount.toString()), 0);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div id="settlement-content" className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/settlements")}
              data-testid="button-back"
              className="print:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-settlement-number">
                {settlement.settlementNumber}
              </h1>
              <p className="text-muted-foreground" data-testid="text-driver-name">
                {driver?.name || "Unknown Driver"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={handlePrint} data-testid="button-print">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF} data-testid="button-download-pdf">
              <Download className="mr-2 h-4 w-4" />
              {isGeneratingPDF ? "Generating..." : "Download PDF"}
            </Button>
          </div>
        </div>

        {/* Settlement Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Settlement Summary</CardTitle>
              <Badge variant={getStatusBadgeVariant(settlement.status)} data-testid="badge-status">
                {settlement.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Period Start</p>
                <p className="text-lg font-medium" data-testid="text-period-start">
                  {new Date(settlement.periodStart).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Period End</p>
                <p className="text-lg font-medium" data-testid="text-period-end">
                  {new Date(settlement.periodEnd).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Miles</p>
                <p className="text-lg font-medium" data-testid="text-total-miles">
                  {settlement.totalMiles?.toLocaleString() || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="text-lg font-medium" data-testid="text-payment-method">
                  {settlement.paymentMethod || "Not specified"}
                </p>
              </div>
            </div>
            {settlement.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm" data-testid="text-notes">
                    {settlement.notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Driver Information */}
        <Card>
          <CardHeader>
            <CardTitle>Driver Information</CardTitle>
            <CardDescription>
              Contact and assignment details for this settlement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {truck && (
                  <div className="flex items-start gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Truck Number</p>
                      <p className="text-lg font-medium" data-testid="text-truck-number">
                        {truck.truckNumber}
                      </p>
                    </div>
                  </div>
                )}
                {driver?.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <a 
                        href={`tel:${driver.phone}`}
                        className="text-lg font-medium hover:text-primary transition-colors"
                        data-testid="link-phone"
                      >
                        {driver.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {driver?.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="text-lg font-medium" data-testid="text-address">
                        {driver.address}
                      </p>
                    </div>
                  </div>
                )}
                {driver?.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <div className="flex items-center gap-2">
                        <a 
                          href={`mailto:${driver.email}`}
                          className="text-lg font-medium hover:text-primary transition-colors"
                          data-testid="link-email"
                        >
                          {driver.email}
                        </a>
                        <Button 
                          size="sm" 
                          variant="outline"
                          asChild
                          data-testid="button-send-email"
                        >
                          <a href={`mailto:${driver.email}?subject=Settlement ${settlement.settlementNumber}`}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loads (Line Items) */}
        <Card>
          <CardHeader>
            <CardTitle>Loads</CardTitle>
            <CardDescription>
              Detailed breakdown of all loads in this settlement period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lineItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No loads found for this settlement
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Factored Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.id} data-testid={`row-line-item-${item.id}`}>
                      <TableCell className="font-medium" data-testid={`text-description-${item.id}`}>
                        {item.description}
                      </TableCell>
                      <TableCell data-testid={`text-company-${item.id}`}>
                        {item.companyName || "-"}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-quantity-${item.id}`}>
                        {item.quantity ? parseFloat(item.quantity).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-rate-${item.id}`}>
                        {item.rate ? `$${parseFloat(item.rate).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}` : "-"}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-amount-${item.id}`}>
                        ${parseFloat(item.amount.toString()).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-factored-${item.id}`}>
                        ${parseFloat(item.factoredAmount?.toString() || "0").toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={4} className="font-semibold">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-semibold" data-testid="text-total-amount">
                      ${totalLoadRevenue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-semibold" data-testid="text-total-factored">
                      ${totalFactoredAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Deductions */}
        <Card>
          <CardHeader>
            <CardTitle>Deductions</CardTitle>
            <CardDescription>
              Itemized deductions from driver pay
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deductions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No deductions for this settlement
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.map((deduction) => (
                    <TableRow key={deduction.id} data-testid={`row-deduction-${deduction.id}`}>
                      <TableCell className="font-medium capitalize" data-testid={`text-category-${deduction.id}`}>
                        {deduction.category.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell data-testid={`text-description-${deduction.id}`}>
                        {deduction.description || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-period-${deduction.id}`}>
                        {deduction.periodStart && deduction.periodEnd
                          ? `${new Date(deduction.periodStart).toLocaleDateString()} - ${new Date(deduction.periodEnd).toLocaleDateString()}`
                          : "-"}
                      </TableCell>
                      <TableCell data-testid={`text-notes-${deduction.id}`}>
                        {deduction.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-amount-${deduction.id}`}>
                        ${parseFloat(deduction.amount.toString()).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={4} className="font-semibold">
                      Total Deductions
                    </TableCell>
                    <TableCell className="text-right font-semibold" data-testid="text-total-deductions">
                      ${totalDeductionsAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-lg">Total Revenue</span>
                <span className="text-lg font-medium" data-testid="text-summary-revenue">
                  ${parseFloat(settlement.totalRevenue.toString()).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              {settlement.factoringPercentage && (
                <>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Factoring Fee ({settlement.factoringPercentage}%)</span>
                    <span data-testid="text-factoring-fee">
                      -$
                      {(
                        (parseFloat(settlement.totalRevenue.toString()) *
                          parseFloat(settlement.factoringPercentage)) /
                        100
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg">Revenue After Factoring</span>
                    <span className="text-lg font-medium" data-testid="text-revenue-after-factoring">
                      ${parseFloat(settlement.revenueAfterFactoring?.toString() || "0").toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-lg">Driver Pay</span>
                <span className="text-lg font-medium" data-testid="text-summary-driver-pay">
                  ${parseFloat(settlement.driverPay.toString()).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-destructive">
                <span className="text-lg">Total Deductions</span>
                <span className="text-lg font-medium" data-testid="text-summary-deductions">
                  -${parseFloat(settlement.totalDeductions?.toString() || "0").toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">Net Pay</span>
                <span className="text-2xl font-bold text-primary" data-testid="text-summary-net-pay">
                  ${parseFloat(settlement.netPay.toString()).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              {settlement.paidDate && (
                <div className="text-sm text-muted-foreground text-center pt-2">
                  Paid on {new Date(settlement.paidDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
