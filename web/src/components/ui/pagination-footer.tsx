import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationConfig, PaginationFunctions } from "@/lib/pagination";

interface PaginationFooterProps {
  paginationConfig: PaginationConfig;
  paginationFunctions: PaginationFunctions;
  pageSizeOptions?: number[];
  className?: string;
  showFirstLast?: boolean;
}

export default function PaginationFooter({
  paginationConfig,
  paginationFunctions,
  pageSizeOptions = [10, 20, 25, 50, 100],
  className = "",
  showFirstLast = true,
}: PaginationFooterProps) {
  const {
    currentPage,
    pageSize,
    totalItems,
    totalPages
  } = paginationConfig;

  const {
    goToPage,
    setPageSize,
    goToFirstPage,
    prevPage,
    nextPage,
    goToLastPage
  } = paginationFunctions;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const pageButtons = getPageButtons(currentPage, totalPages);

  return (
    <div className={`mt-4 flex items-center justify-between ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Showing {startItem}-{endItem} of {totalItems} items
        </span>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => setPageSize(Number(value))}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

        <div className="flex items-center space-x-2">
          {showFirstLast && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
            >
              First
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={prevPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pageButtons.map((pageNum) => (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              onClick={() => goToPage(pageNum)}
            >
              {pageNum}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {showFirstLast && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          )}
        </div>
    </div>
  );
}

function getPageButtons(currentPage: number, totalPages: number): number[] {
  const buttons = [];
  const maxVisibleButtons = 5;
  const halfMax = Math.floor(maxVisibleButtons / 2);

  if (totalPages <= maxVisibleButtons) {
    for (let i = 1; i <= totalPages; i++) {
      buttons.push(i);
    }
  } else {
    let startPage = Math.max(1, currentPage - halfMax);
    let endPage = Math.min(totalPages, currentPage + halfMax);
    if (currentPage <= halfMax) {
      endPage = maxVisibleButtons;
    } else if (currentPage >= totalPages - halfMax) {
      startPage = totalPages - maxVisibleButtons + 1;
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(i);
    }
  }

  return buttons;
}
