import PropTypes from 'prop-types';
import { useTheme } from '@chakra-ui/react';
import { BsSortDown, BsSortUp } from 'react-icons/bs';
import { RxCaretSort } from 'react-icons/rx';

/**
 * SortIcon Component
 * Displays the appropriate sort icon based on current sort state
 */
const SortIcon = ({ column, currentSortState, isSort, sortDirection }) => {
  const theme = useTheme();

  // Use currentSortState if provided, otherwise use internal state
  const currentField =
    currentSortState?.field || currentSortState?.sort_field || isSort;
  const currentDirection =
    currentSortState?.direction ||
    currentSortState?.sort_order ||
    sortDirection;
  const isCurrentField = currentField === column?.field;

  const iconColor = theme?.colors?.primary?.['600'];

  if (isCurrentField && currentDirection === 'asc') {
    return <BsSortUp color={iconColor} />;
  } else if (isCurrentField && currentDirection === 'desc') {
    return <BsSortDown color={iconColor} />;
  } else {
    return <RxCaretSort color={iconColor} />;
  }
};

SortIcon.propTypes = {
  column: PropTypes.shape({
    field: PropTypes.string,
  }),
  currentSortState: PropTypes.shape({
    field: PropTypes.string,
    sort_field: PropTypes.string,
    direction: PropTypes.string,
    sort_order: PropTypes.string,
  }),
  isSort: PropTypes.string,
  sortDirection: PropTypes.string,
};

export default SortIcon;
