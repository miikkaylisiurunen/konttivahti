import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useContainerTable } from '../hooks/useContainerTable';
import { CompactButton } from './Button';

export function ContainersTablePagination() {
  const { currentPage, totalPages, handlePrevious, handleNext } = useContainerTable();

  return (
    <div className="mt-6 flex items-center justify-center p-4">
      <CompactButton
        onClick={handlePrevious}
        disabled={currentPage === 1}
        variant="ghost"
        icon={<ChevronLeft className="size-4" aria-hidden="true" />}
        label="Previous"
      />
      <span className="text-sm font-medium text-foreground-muted mx-4">
        Page {currentPage} of {totalPages}
      </span>
      <CompactButton
        onClick={handleNext}
        disabled={currentPage === totalPages || totalPages === 0}
        variant="ghost"
        icon={<ChevronRight className="size-4" aria-hidden="true" />}
        iconPosition="right"
        label="Next"
      />
    </div>
  );
}
