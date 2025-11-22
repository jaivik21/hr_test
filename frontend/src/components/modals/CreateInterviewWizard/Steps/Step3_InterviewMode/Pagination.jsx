import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Text, HStack, Select, Divider, Button } from '@chakra-ui/react';
import {
  MODE_STYLES,
  MODE_COLORS,
} from '../../../../../utils/constants/interviewModeConstants';

const Pagination = ({
  currentPage = 1,
  totalPages = 10,
  onPageChange,
  showPageSelect = true,
}) => {
  // Validate and normalize props
  const normalizedCurrentPage = useMemo(() => {
    const page = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));
    return page;
  }, [currentPage, totalPages]);

  const normalizedTotalPages = useMemo(() => {
    return Math.max(0, totalPages);
  }, [totalPages]);

  // Early return if no pages
  if (normalizedTotalPages <= 0) {
    return null;
  }

  // Calculate which pages to display
  const displayPages = useMemo(() => {
    if (normalizedTotalPages <= 1) {
      return [1];
    }

    if (normalizedTotalPages <= 5) {
      // If 5 or fewer pages, show all
      return Array.from({ length: normalizedTotalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const current = normalizedCurrentPage;

    // Always show first page
    pages.push(1);

    // Calculate pages around current
    let start = Math.max(2, current - 1);
    let end = Math.min(normalizedTotalPages - 1, current + 1);

    // Adjust if we're near the start
    if (current <= 3) {
      end = Math.min(4, normalizedTotalPages - 1);
    }

    // Adjust if we're near the end
    if (current >= normalizedTotalPages - 2) {
      start = Math.max(2, normalizedTotalPages - 3);
    }

    // Add pages in the middle range
    for (let i = start; i <= end; i++) {
      if (i > 1 && i < normalizedTotalPages && !pages.includes(i)) {
        pages.push(i);
      }
    }

    // Always show last page if not already included
    if (normalizedTotalPages > 1 && !pages.includes(normalizedTotalPages)) {
      pages.push(normalizedTotalPages);
    }

    return pages.sort((a, b) => a - b);
  }, [normalizedCurrentPage, normalizedTotalPages]);

  const handlePrevClick = useCallback(() => {
    if (normalizedCurrentPage > 1 && onPageChange) {
      onPageChange(normalizedCurrentPage - 1);
    }
  }, [normalizedCurrentPage, onPageChange]);

  const handleNextClick = useCallback(() => {
    if (normalizedCurrentPage < normalizedTotalPages && onPageChange) {
      onPageChange(normalizedCurrentPage + 1);
    }
  }, [normalizedCurrentPage, normalizedTotalPages, onPageChange]);

  const handlePageSelect = useCallback(
    e => {
      const newPage = parseInt(e.target.value, 10);
      if (
        onPageChange &&
        !isNaN(newPage) &&
        newPage >= 1 &&
        newPage <= normalizedTotalPages
      ) {
        onPageChange(newPage);
      }
    },
    [onPageChange, normalizedTotalPages],
  );

  const handlePageClick = useCallback(
    page => {
      if (onPageChange && page >= 1 && page <= normalizedTotalPages) {
        onPageChange(page);
      }
    },
    [onPageChange, normalizedTotalPages],
  );

  // Memoize disabled states
  const isPrevDisabled = useMemo(
    () => normalizedCurrentPage <= 1,
    [normalizedCurrentPage],
  );
  const isNextDisabled = useMemo(
    () => normalizedCurrentPage >= normalizedTotalPages,
    [normalizedCurrentPage, normalizedTotalPages],
  );

  // Don't render if only one page and no page selector
  if (normalizedTotalPages <= 1 && !showPageSelect) {
    return null;
  }

  return (
    <Box as="nav" aria-label="Pagination">
      <Divider my={4} borderColor={MODE_COLORS.DIVIDER} />
      <HStack spacing={3} justify="center">
        {/* Previous Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevClick}
          disabled={isPrevDisabled}
          aria-label="Previous page"
          color="gray.600"
          _hover={!isPrevDisabled ? { color: 'primary.500' } : {}}
          _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}>
          ‹
        </Button>

        {/* Page Numbers */}
        {displayPages.map((page, index) => {
          const isActive = page === normalizedCurrentPage;
          const showEllipsis = index > 0 && page - displayPages[index - 1] > 1;

          return (
            <React.Fragment key={page}>
              {showEllipsis && (
                <Text color="gray.400" px={1} aria-hidden="true">
                  ...
                </Text>
              )}
              <Button
                variant={isActive ? 'solid' : 'outline'}
                size="sm"
                onClick={() => handlePageClick(page)}
                disabled={!onPageChange}
                w={MODE_STYLES.PAGINATION_BUTTON_SIZE}
                h={MODE_STYLES.PAGINATION_BUTTON_SIZE}
                minW={MODE_STYLES.PAGINATION_BUTTON_SIZE}
                borderRadius="full"
                bg={isActive ? 'primary.500' : 'white'}
                color={isActive ? 'white' : 'gray.700'}
                borderColor={isActive ? 'primary.500' : MODE_COLORS.DIVIDER}
                _hover={
                  onPageChange && !isActive
                    ? {
                        borderColor: 'primary.300',
                        bg: 'primary.50',
                      }
                    : {}
                }
                _disabled={{
                  opacity: 1,
                  cursor: onPageChange ? 'pointer' : 'default',
                }}
                aria-label={`Go to page ${page}`}
                aria-current={isActive ? 'page' : undefined}
                transition="all 0.2s">
                {page}
              </Button>
            </React.Fragment>
          );
        })}

        {/* Next Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextClick}
          disabled={isNextDisabled}
          aria-label="Next page"
          color="gray.600"
          _hover={!isNextDisabled ? { color: 'primary.500' } : {}}
          _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}>
          ›
        </Button>

        {/* Page Selector */}
        {showPageSelect && normalizedTotalPages > 1 && (
          <HStack spacing={2} ml={6}>
            <Text color="gray.700">Page</Text>
            <Select
              size="sm"
              w={MODE_STYLES.PAGE_SELECT_WIDTH}
              bg="white"
              value={normalizedCurrentPage}
              onChange={handlePageSelect}
              aria-label="Select page number">
              {Array.from(
                { length: normalizedTotalPages },
                (_, i) => i + 1,
              ).map(page => (
                <option key={page} value={page}>
                  {page}
                </option>
              ))}
            </Select>
            <Text color="gray.700">of {normalizedTotalPages}</Text>
          </HStack>
        )}
      </HStack>
    </Box>
  );
};

Pagination.propTypes = {
  currentPage: PropTypes.number,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func,
  showPageSelect: PropTypes.bool,
};

export default React.memo(Pagination);
