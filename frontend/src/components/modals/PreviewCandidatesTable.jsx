import { useMemo, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { Box, Text } from '@chakra-ui/react';
import DataTable from '../Datatable/DataTable';
import { themeColor } from '../../utils/constants/constants';

// Helper function to sort rows
const sortRows = (rows, sortField, sortDirection) => {
  if (!sortField) return rows;
  const sorted = [...rows].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });
  return sorted;
};

// Helper function to create checkbox handler
const createCheckboxHandler = (candidates, setSelected) => {
  return (rowId, checked, row) => {
    try {
      if (rowId === null || rowId === undefined) {
        // Header checkbox (select all)
        const candidateIds = candidates
          .filter(c => c !== null && c !== undefined)
          .map(c => c.id || c.uuid)
          .filter(Boolean);
        setSelected(checked ? candidateIds : []);
        return;
      }
      // Individual row checkbox
      if (rowId) {
        const id = (row && (row.id || row.uuid)) || rowId;
        if (!id) {
          console.warn('Checkbox clicked but no valid ID found', {
            rowId,
            row,
          });
          return;
        }
        setSelected(prev => {
          if (!Array.isArray(prev)) {
            return checked ? [id] : [];
          }
          if (checked) {
            if (!prev.includes(id)) {
              return [...prev, id];
            }
            return prev;
          } else {
            return prev.filter(prevId => prevId !== id);
          }
        });
      }
    } catch (error) {
      console.error('Error in checkbox handler:', error);
    }
  };
};

const PreviewCandidatesTable = memo(
  ({
    candidates,
    selectedRows,
    setSelectedRows,
    sortField,
    sortDirection,
    onSort,
  }) => {
    // Columns for Candidates Preview table
    const columns = useMemo(
      () => [
        {
          field: 'name',
          headerName: 'Full Name',
          width: 300,
          sortable: true,
        },
        {
          field: 'email',
          headerName: 'Email',
          width: 300,
        },
        {
          field: 'phone',
          headerName: 'Phone Number',
          width: 200,
          renderCell: (value, row) => {
            return row.phone || row.phone_number || '-';
          },
        },
      ],
      [],
    );

    // Rows with sorting
    const rows = useMemo(() => {
      if (!Array.isArray(candidates)) {
        return [];
      }
      const mappedRows = candidates
        .filter(candidate => candidate !== null && candidate !== undefined)
        .map(candidate => ({
          id: candidate.id || candidate.uuid,
          uuid: candidate.id || candidate.uuid,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone || candidate.phone_number || '-',
          phone_number: candidate.phone_number || candidate.phone,
        }))
        .filter(row => row.id || row.uuid); // Filter out rows without id

      return sortRows(mappedRows, sortField, sortDirection);
    }, [candidates, sortField, sortDirection]);

    // Memoized selectedRows for DataTable
    const memoizedSelectedRows = useMemo(() => {
      if (!Array.isArray(rows) || !Array.isArray(selectedRows)) {
        return [];
      }
      return rows
        .filter(row => row !== null && row !== undefined && row.id)
        .filter(row => selectedRows.includes(row.id || row.uuid));
    }, [rows, selectedRows]);

    // Handler for setSelectedRows
    const handleSetSelectedRows = useCallback(
      newSelectedRows => {
        if (!Array.isArray(newSelectedRows)) {
          return;
        }
        setSelectedRows(
          newSelectedRows
            .filter(row => row !== null && row !== undefined)
            .map(row => row.id || row.uuid)
            .filter(Boolean),
        );
      },
      [setSelectedRows],
    );

    // Handler for checkbox clicks
    const handleCheckboxClick = useMemo(
      () => createCheckboxHandler(candidates, setSelectedRows),
      [candidates, setSelectedRows],
    );

    // Handler for select all
    const handleSelectAll = useCallback(
      isSelected => {
        if (isSelected) {
          setSelectedRows(
            rows
              .filter(row => row !== null && row !== undefined)
              .map(row => row.id || row.uuid)
              .filter(Boolean),
          );
        } else {
          setSelectedRows([]);
        }
      },
      [rows, setSelectedRows],
    );

    // Safety check for candidates
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return null;
    }

    return (
      <Box>
        <Text fontWeight="semibold" mb={3}>
          Candidates Preview
        </Text>
        <Box w="100%" overflow="hidden">
          <DataTable
            columns={columns}
            rows={rows}
            totalRows={rows.length}
            noPagination={true}
            checkboxSelection={true}
            selectedRows={memoizedSelectedRows}
            setSelectedRows={handleSetSelectedRows}
            loading={false}
            noRecordMessage="No candidates found."
            onCheckboxClick={handleCheckboxClick}
            setAllSelected={handleSelectAll}
            onSort={onSort}
            currentSortState={
              sortField
                ? { sort_field: sortField, sort_order: sortDirection }
                : null
            }
            tableHeaderBg={themeColor.TAG_BG_COLOR}
          />
        </Box>
      </Box>
    );
  },
);

PreviewCandidatesTable.propTypes = {
  candidates: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      uuid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      email: PropTypes.string,
      phone: PropTypes.string,
      phone_number: PropTypes.string,
    }),
  ).isRequired,
  selectedRows: PropTypes.array.isRequired,
  setSelectedRows: PropTypes.func.isRequired,
  sortField: PropTypes.string,
  sortDirection: PropTypes.oneOf(['asc', 'desc']),
  onSort: PropTypes.func.isRequired,
};

PreviewCandidatesTable.displayName = 'PreviewCandidatesTable';

export default PreviewCandidatesTable;
