import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@shared/schema";

export function CompanySwitcher() {
  const { toast } = useToast();

  const { data: companies = [], isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: currentCompany, isLoading: currentLoading } = useQuery<Company | null>({
    queryKey: ["/api/companies/current"],
  });

  const switchMutation = useMutation({
    mutationFn: async (companyId: string) => {
      return await apiRequest("POST", "/api/companies/switch", { companyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries();
      toast({
        title: "Company Switched",
        description: "You are now viewing data for the selected company.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Switch Company",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const isLoading = companiesLoading || currentLoading;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-sidebar-accent/50">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-sidebar-accent/50">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No company assigned</span>
      </div>
    );
  }

  if (companies.length === 1) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-sidebar-accent/50">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium truncate">{companies[0].displayName || companies[0].name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between p-2 h-auto hover-elevate"
          data-testid="button-company-switcher"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-medium truncate">
              {currentCompany?.displayName || currentCompany?.name || "Select Company"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => {
              if (company.id !== currentCompany?.id) {
                switchMutation.mutate(company.id);
              }
            }}
            className="flex items-center justify-between"
            data-testid={`menu-item-company-${company.id}`}
          >
            <span className="truncate">{company.displayName || company.name}</span>
            {company.id === currentCompany?.id && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
