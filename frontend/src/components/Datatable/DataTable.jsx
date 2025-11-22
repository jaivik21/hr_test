import PropTypes from 'prop-types';
import {
  Box,
  Flex,
  Text,
  Select,
  IconButton,
  Checkbox,
  Spinner,
  Tooltip,
  useTheme,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RxDragHandleDots2 } from 'react-icons/rx';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { IoIosArrowDown, IoIosArrowUp } from 'react-icons/io';
import _ from 'lodash';
import useViewport from '../../hooks/useViewport';
import ExpandTableComponent from './ExpandTableComponent';
import SortIcon from './SortIcon';
import messages from '../../utils/constants/messages';
import { dataTableRowsPerPageSize } from '../../utils/helper';
import Storage from '../../services/Storage';
import React from 'react';
import { defaultListTextColorStaticVal } from '../../utils/constants/constants';

// Global state for multi-table column width synchronization
window.globalColumnWidths = window.globalColumnWidths || {};

const DataTable = ({
  columns,
  rows,
  page = 1,
  pageSize = dataTableRowsPerPageSize(),
  height,
  maxHeight,
  pageSizeOptions = [10, 20, 30, 50],
  checkboxSelection = false,
  allowReorder,
  onReorderComplete,
  onPageSizeChange,
  onPageChange,
  loading,
  noPagination,
  selectedRows,
  setSelectedRows,
  totalRows,
  demoReorder,
  onOrderChange,
  onCheckboxClick,
  setAllSelected,
  boxStyle,
  tableHeaderBg = 'var(--chakra-colors-primary-50)',
  module_id = null,
  location_list = null,
  isCustomSecondExpandedTable = false,
  isCustomFirstExpandedTable = false,

  // Expand Component
  isDropdownTable,
  expandalbleTableColumn,
  expandalbleTableData,
  handleExpandableData,
  expandTableHeight,
  expandTableMaxHeight,
  customExpandTableWidth,
  showCheckboxInExpandable = false,
  selectedExpRows,
  setSelectedExpRows,
  onExpCheckboxClick,
  setExpAllSelected,
  CustomExpandTableComponent,
  extraPropsForCustomExpandTable,
  expandTableHeaderBg,
  expandTableAccordionBg,

  // Sorting
  onSort,
  currentSortState = null,
  customRowHeight = 'auto',
  noRecordMessage = '',
  noRecordMY = '',
  totalRowData,
  isRenderTotalRow = false,

  // Left Column Sticky
  isLeftColumnSticky = false,

  // Multi-table column width synchronization
  IsMultiTableResize = false,
}) => {
  const theme = useTheme();
  const tableRef = useRef(null);
  const firstUpdate = useRef(true);
  const firstUpdateTrackTwo = useRef(true);
  const { width } = useViewport();

  const [data, setData] = useState([...rows]);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [expandedRows, setExpandedRows] = useState({});

  const [indexH, setIndexH] = useState(null);
  const [columnLength, setColumnLength] = useState({});

  const [isSort, setIsSort] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [columnWidths, setColumnWidths] = useState({});
  const baseHeaderRef = useRef(null);

  // Multi-table resize: Listen for global column width changes
  useEffect(() => {
    if (!IsMultiTableResize) return;

    const handleGlobalColumnResize = event => {
      const { field, width } = event.detail;
      setColumnWidths(prevWidths => {
        const newWidths = {
          ...prevWidths,
          [field]: width,
        };

        // Check if any column uses this field in its multi_column_combine_fields_arr
        // and recalculate the combined width immediately
        columns.forEach(column => {
          if (
            column.is_multi_column_combine &&
            column.multi_column_combine_fields_arr?.includes(field)
          ) {
            let combinedWidth = 0;
            column.multi_column_combine_fields_arr.forEach(fieldName => {
              // Special handling for expand_action - always use fixed width of 50
              let fieldWidth;
              if (fieldName === 'expand_action') {
                fieldWidth = 50;
              } else {
                // Use updated global widths for calculation
                fieldWidth =
                  newWidths[fieldName] ||
                  window.globalColumnWidths?.[fieldName] ||
                  110;
              }
              combinedWidth += fieldWidth;
            });
            newWidths[column.field] = combinedWidth;

            // Force update by setting a unique value that will trigger recalculation
            newWidths[`${column.field}_update`] = Date.now();
          }
        });

        return newWidths;
      });
    };

    window.addEventListener('globalColumnResize', handleGlobalColumnResize);

    // Initialize with existing global widths
    setColumnWidths(prevWidths => ({
      ...prevWidths,
      ...window.globalColumnWidths,
    }));

    return () => {
      window.removeEventListener(
        'globalColumnResize',
        handleGlobalColumnResize,
      );
    };
  }, [IsMultiTableResize, columns]);

  useEffect(() => {
    if (!currentSortState) return;
    // Support both field/direction and sort_field/sort_order formats
    setIsSort(currentSortState?.field || currentSortState?.sort_field);
    setSortDirection(
      currentSortState?.direction || currentSortState?.sort_order || 'asc',
    );
  }, [currentSortState]);

  useEffect(() => {
    setCurrentPageSize(pageSize);
  }, [pageSize]);

  useEffect(() => {
    if (page === 1) {
      setCurrentPage(0);
    } else {
      setCurrentPage(page - 1);
    }
  }, [page]);

  const pageCount = Math.ceil((totalRows || data.length) / currentPageSize);

  useEffect(() => {
    setData([...rows]);

    if (rows.length < currentPageSize && currentPage + 1 !== pageCount) {
      if (page === 1) {
        setCurrentPage(0);
      } else {
        setCurrentPage(page - 1);
      }
    }
    const columnLength = {};
    if (rows) {
      for (let row of rows) {
        for (let key of Object.keys(row)) {
          if (row[key]) {
            if (!(row[key]?.length < columnLength[key])) {
              columnLength[key] = row[key].length;
            }
          }
        }
      }
    }
    setColumnLength(columnLength);
  }, [rows, page]);

  const handlePreviousPage = () => {
    if (currentPage === 0) return;

    setCurrentPage(prevPage => prevPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage === pageCount - 1) return;

    setCurrentPage(prevPage => prevPage + 1);
  };

  useEffect(() => {
    if (!checkboxSelection) return;
  }, [selectedRows]);

  useEffect(() => {
    if (firstUpdate.current) {
      firstUpdate.current = false;
    } else {
      if (onPageChange && typeof onPageChange === 'function') {
        onPageChange(currentPage);
      }
    }
  }, [currentPage]);

  const handlePageSizeChange = e => {
    Storage.setRowsPerPageForTable(e.target.value);
    setCurrentPageSize(e.target.value);
  };

  useEffect(() => {
    if (firstUpdateTrackTwo.current) {
      firstUpdateTrackTwo.current = false;
    } else {
      if (onPageSizeChange && typeof onPageSizeChange === 'function') {
        onPageSizeChange(currentPageSize);
      }
    }
  }, [currentPageSize]);

  const paginationText = useMemo(() => {
    const from =
      currentPage * currentPageSize + 1 < totalRows
        ? currentPage * currentPageSize + 1
        : totalRows;
    const to =
      (currentPage + 1) * currentPageSize < totalRows
        ? (currentPage + 1) * currentPageSize
        : totalRows;

    return `${from} - ${to} of ${totalRows}`;
  }, [totalRows, currentPageSize, currentPage, rows]);

  const handleDragEnd = result => {
    if (!allowReorder) return;
    if (!result.destination) return;

    if (demoReorder) {
      const updatedRows = [...data];
      const [draggedRow] = updatedRows.splice(result.source.index, 1);
      updatedRows.splice(result.destination.index, 0, draggedRow);
      if (onOrderChange) {
        onOrderChange(updatedRows);
      }

      setData(updatedRows);
      return;
    }
    const oldIndex = result.source.index;
    const targetIndex = result.destination.index;
    const rowId = result.draggableId;

    if (onReorderComplete && typeof onReorderComplete === 'function') {
      onReorderComplete({ oldIndex, targetIndex, rowId });
    } else {
      console.error(
        'Must provide onReorderComplete prop to DataTable component for reordering to work',
      );
    }
  };

  const handleSort = column => {
    const fieldName = column?.field || '';
    let updatedSortDirection = 'asc'; // Default to ascending

    // If currentSortState is provided, use it to determine current sort state
    const currentField = currentSortState?.field || isSort;
    const currentDirection = currentSortState?.direction || sortDirection;

    // Check if the current sorted field is the same as the clicked one
    if (currentField === fieldName) {
      // Toggle sort direction if the same field is sorted again
      updatedSortDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set sorting direction to ascending and update the sorted field
      updatedSortDirection = 'asc';
    }

    // Update state values (only if currentSortState is not provided)
    if (!currentSortState) {
      setSortDirection(updatedSortDirection);
      setIsSort(fieldName);
    }

    // Invoke onSort callback with the updated sort direction
    if (onSort && typeof onSort === 'function') {
      onSort(fieldName, updatedSortDirection); // Use the updated sort direction
    } else {
      console.error(
        'Must provide onSort prop to DataTable component for sorting',
      );
    }
  };

  const handleExpandRow = async row => {
    const rowId = row?.id || row?.uuid;
    setExpandedRows(prev => ({
      ...prev, // Keep previous expanded state
      [rowId]: !prev[rowId], // Toggle only the clicked row
    }));

    // Only fetch data if we're expanding and don't already have it
    if (!expandedRows?.[rowId] && handleExpandableData) {
      handleExpandableData(
        rows.find(row => row.id === rowId || row.uuid === rowId),
      );
    }
  };

  // Utility functions
  function arraysContainSameObjectsByUuid(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;

    const ids1 = arr1.map(obj => obj.uuid).sort();
    const ids2 = arr2.map(obj => obj.uuid).sort();

    return ids1.every((id, i) => id === ids2[i]);
  }

  function arraysContainSameObjects(arr1, arr2) {
    const objFrequency = {};

    for (const obj of arr1) {
      const key = JSON.stringify(obj);
      objFrequency[key] = (objFrequency[key] || 0) + 1;
    }

    for (const obj of arr2) {
      const key = JSON.stringify(obj);

      if (!objFrequency[key] || objFrequency[key] === 0) {
        return false;
      }

      objFrequency[key]--;
    }

    return true;
  }

  function removeObjectsFromArray(arr1, arr2) {
    const objSet = new Set(arr2?.map(JSON.stringify));

    const filteredArray = arr1?.filter(obj => !objSet.has(JSON.stringify(obj)));

    return filteredArray;
  }

  const tablescrollCheckPoint = () => {
    if (tableRef?.current) {
      const containerwidth = tableRef?.current?.offsetWidth || 0;
      const widthWithcontent = tableRef?.current?.scrollWidth || 0;
      return widthWithcontent > containerwidth ? 1920 : 300;
    } else {
      return 1024;
    }
  };

  const getWidthParams = column => {
    // Special handling for expand_action - always fixed at 50px
    if (column.field === 'expand_action') {
      return {
        width: 50,
        minWidth: 50,
        maxWidth: 50,
      };
    }

    let columnWidth = columnWidths[column.field] || column?.width;
    const columnMaxWidth = column?.maxWidth;
    const columnMinWidth = column?.minWidth;

    // Special handling for date columns - allow them to be flexible
    if (column.isDateColumn) {
      const baseWidth = columnWidth || 100;
      return {
        width: baseWidth,
        minWidth: baseWidth,
        flex: '1 1 auto',
      };
    }

    if (
      ['SR. No.', 'Status', 'Action'].includes(column.headerName) &&
      !column.width
    ) {
      columnWidth = 70;
    }
    if (['Created At'].includes(column.headerName) && !columnWidth) {
      columnWidth = 130;
    }
    if (['Actions'].includes(column.headerName) && !columnWidth) {
      columnWidth = 100;
    }
    if (!columnWidth) {
      columnWidth = columnLength?.[column.field] * 9;

      if (columnMaxWidth && columnWidth > columnMaxWidth) {
        columnWidth = columnMaxWidth;
      }
      if (columnMinWidth && columnWidth < columnMinWidth) {
        columnWidth = columnMinWidth;
      }
      if (!columnWidth) {
        columnWidth = columnMinWidth || 170;
      }
    }

    // NEW: Handle multi-column combine functionality (additional feature)
    if (
      column.is_multi_column_combine &&
      column.multi_column_combine_fields_arr?.length > 0
    ) {
      let combinedWidth = 0;
      column.multi_column_combine_fields_arr.forEach(fieldName => {
        // Special handling for expand_action - always use fixed width of 50
        let fieldWidth;
        if (fieldName === 'expand_action') {
          fieldWidth = 50;
        } else {
          // Get width from current state first, then global state, then default
          fieldWidth =
            columnWidths[fieldName] ||
            window.globalColumnWidths?.[fieldName] ||
            110;
        }
        combinedWidth += fieldWidth;
      });
      columnWidth = combinedWidth;
    }

    return {
      width: columnWidth,
      minWidth: columnWidth,
      maxWidth: columnWidth,
    };
  };

  const baseHeadeOffsetWidth = baseHeaderRef?.current?.offsetWidth || 'auto';
  const effectiveWidth = customExpandTableWidth || baseHeadeOffsetWidth;

  // Watch for multi-column combine field updates
  useEffect(() => {
    if (!IsMultiTableResize || !module_id || !location_list) return;

    const multiColumnCombineFields = columns.filter(
      col =>
        col.is_multi_column_combine &&
        col.multi_column_combine_fields_arr?.length > 0,
    );

    if (multiColumnCombineFields.length > 0) {
      // Check if any multi-column combine field has been updated
      const hasMultiColumnUpdates = multiColumnCombineFields.some(
        col => columnWidths[`${col.field}_update`],
      );

      if (hasMultiColumnUpdates) {
        // Recalculate multi-column combine fields with correct expand_action width
        const updatedWidths = { ...columnWidths };
        multiColumnCombineFields.forEach(column => {
          let combinedWidth = 0;
          column.multi_column_combine_fields_arr.forEach(fieldName => {
            // Special handling for expand_action - always use fixed width of 50
            let fieldWidth;
            if (fieldName === 'expand_action') {
              fieldWidth = 50;
            } else {
              fieldWidth =
                columnWidths[fieldName] ||
                window.globalColumnWidths?.[fieldName] ||
                110;
            }
            combinedWidth += fieldWidth;
          });
          updatedWidths[column.field] = combinedWidth;
        });

        // Filter out temporary update fields and expand_action
        const cleanedWidths = Object.fromEntries(
          Object.entries(updatedWidths).filter(
            ([key]) => !key.endsWith('_update') && key !== 'expand_action',
          ),
        );
      }
    }
  }, [columnWidths, IsMultiTableResize, module_id, location_list, columns]);

  const handleColumnResize = (field, e) => {
    const isActionField =
      ['Action', 'Actions'].includes(field) || field === 'action';
    if (!isActionField && field !== undefined) {
      const startX = e.clientX;
      const startWidthHeader = baseHeaderRef.current.querySelector(
        `.${CSS.escape(field)}`,
      ).offsetWidth;

      const onMouseMove = moveEvent => {
        const newWidth = startWidthHeader + (moveEvent.clientX - startX);
        setColumnWidths(prevWidths => ({
          ...prevWidths,
          [field]: Math.max(newWidth, 110), // Minimum column width set to 50px
        }));

        // Multi-table resize: Update global state and notify other tables
        if (IsMultiTableResize) {
          const finalWidth = Math.max(newWidth, 110);
          window.globalColumnWidths[field] = finalWidth;

          // Dispatch custom event to notify other DataTable instances
          const event = new CustomEvent('globalColumnResize', {
            detail: { field, width: finalWidth },
          });
          window.dispatchEvent(event);
        }

        if (module_id && location_list) {
          const updatedWidths = {
            ...columnWidths,
            [field]: Math.max(newWidth, 110),
          };

          // Filter out expand_action since it's always fixed at 50
          // eslint-disable-next-line no-unused-vars
          const { expand_action, ...apiWidths } = updatedWidths;
        }

        const headerElement = baseHeaderRef.current.querySelector(`.${field}`);
        if (headerElement) {
          headerElement.style.width = `${Math.max(newWidth, 110)}px`; // Apply the resized width to header
        }

        document.querySelectorAll(`.${field}`).forEach(bodyElement => {
          bodyElement.style.width = `${Math.max(newWidth, 110)}px`; // Apply the resized width to body
        });
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mouseleave', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('mouseleave', onMouseUp);
    }
  };

  // Enhanced header checkbox logic
  const handleHeaderCheckboxChange = e => {
    const checked = e.target.checked;

    if (onCheckboxClick) {
      onCheckboxClick(null, checked);
      // If onCheckboxClick is provided, let the parent handle state updates
      return;
    }

    const visibleRows = rows.filter(ele => !ele?.is_checkbox_hide);

    if (!checked) {
      setSelectedRows(prev =>
        _.uniqBy(
          prev.filter(
            selected => !visibleRows.some(row => row.uuid === selected.uuid),
          ),
          'uuid',
        ),
      );
    } else {
      setSelectedRows(prev => _.uniqBy([...prev, ...visibleRows], 'uuid'));
    }
  };

  // Enhanced row checkbox change handler
  const handleRowCheckboxChange = (row, checked) => {
    if (onCheckboxClick) {
      onCheckboxClick(row.uuid || row.id, checked, row);
      // If onCheckboxClick is provided, let the parent handle state updates
      return;
    }

    if (!checked) {
      setSelectedRows(pre => {
        return pre?.filter(val => {
          return JSON.stringify(val) !== JSON.stringify(row);
        });
      });
      return;
    }

    setSelectedRows([...selectedRows, row]);
  };

  // Handle object values in cells
  const renderCellValue = val => {
    if (val && typeof val === 'object' && !React.isValidElement(val)) {
      if (val.text !== undefined) {
        return val.text;
      } else {
        return JSON.stringify(val);
      }
    }
    return val;
  };

  return (
    <Box
      overflow="hidden"
      height={height || '100%'}
      maxHeight={maxHeight}
      display="flex"
      flexDirection="column"
      borderRadius="1rem"
      bg="white"
      border="1px solid #B7C4C9">
      <Box
        ref={tableRef}
        height="calc(100% - 0rem)"
        overflow="auto"
        className="custom_scrollbar"
        position="relative"
        style={{ isolation: 'isolate' }}>
        {loading && (
          <Box
            bg="white"
            left="0"
            top="0"
            position="absolute"
            height="100%"
            width="100%"
            display="flex"
            alignItems="center"
            gap={2}
            justifyContent="center">
            <Spinner />
            <Text>Loading</Text>
          </Box>
        )}
        <Box
          ref={baseHeaderRef}
          className={`${width > tablescrollCheckPoint() ? 'tableBorder' : ''}`}
          display="flex"
          h="3.2rem"
          bg={tableHeaderBg}
          width={'auto'}
          minWidth="fit-content"
          position="sticky"
          top="0"
          zIndex="2"
          alignItems="center"
          justifyContent={'space-between'}>
          {allowReorder && (
            <Box
              px={2}
              borderRight={'1px solid #B7C4C9'}
              width={`${isDropdownTable ? '64px' : '37px'}`}
              minWidth={`${isDropdownTable ? '64px' : '37px'}`}
              maxWidth={`${isDropdownTable ? '64px' : '37px'}`}
              height="3.2rem"
              className={`${
                width <= tablescrollCheckPoint() ? 'tableBorder' : ''
              }`}
            />
          )}
          {isDropdownTable && (
            <Box
              px={2}
              borderRight={'1px solid #B7C4C9'}
              width="37px"
              minWidth="37px"
              maxWidth="37px"
              height="3.2rem"
              className={`${
                width <= tablescrollCheckPoint() ? 'tableBorder' : ''
              }`}
            />
          )}
          {checkboxSelection && (
            <Box
              width="50px"
              className={`${
                width <= tablescrollCheckPoint() ? 'tableBorder' : ''
              }`}
              minWidth={'50px'}
              maxWidth={'50px'}
              display="flex"
              borderRight={'1px solid #B7C4C9'}
              alignItems="center"
              justifyContent="center"
              alignSelf={'stretch'}>
              <Checkbox
                isChecked={
                  rows?.length > 0 &&
                  arraysContainSameObjectsByUuid(
                    selectedRows.filter(row =>
                      rows.some(
                        r => r.uuid === row.uuid && !r.is_checkbox_hide,
                      ),
                    ),
                    rows.filter(r => !r.is_checkbox_hide),
                  )
                }
                onChange={handleHeaderCheckboxChange}
              />
            </Box>
          )}
          {columns?.map((column, index) => {
            const colName = column?.headerName;
            const justifyText = column?.justifyText || 'flex-start';
            const alignText = column?.alignText || 'left';

            // Handle headerName as function or string
            const headerContent =
              typeof colName === 'function' ? colName() : colName;

            // Extract text for comparison (for action column detection)
            const headerText =
              typeof colName === 'function'
                ? headerContent?.props?.children || ''
                : colName || '';

            const isActionColumn = ['Action', 'Actions'].includes(headerText);
            const isFirstColumn = index === 0;
            const isLastColumn = index === columns.length - 1;
            const isColumnLeftSticky =
              isLeftColumnSticky && index === 0 ? true : false;
            const isExpandAction =
              column?.field === 'expand_action' ? true : false;

            return (
              <Box
                bg={tableHeaderBg}
                className={`${
                  width <= tablescrollCheckPoint() ? 'tableBorder' : ''
                } ${column?.field} ${
                  isActionColumn
                    ? 'action_field'
                    : isColumnLeftSticky
                    ? 'sticky_field_left'
                    : ''
                }`}
                {...getWidthParams(column)}
                key={column?.field}
                position={
                  isActionColumn || isColumnLeftSticky ? 'sticky' : 'relative'
                }
                left={isActionColumn || isColumnLeftSticky ? '0' : 'unset'}
                zIndex={isActionColumn || isColumnLeftSticky ? 3 : 1}
                alignSelf="stretch"
                display="flex"
                alignItems="center"
                justifyContent={justifyText}
                style={{
                  whiteSpace: 'normal',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  position:
                    isActionColumn || isColumnLeftSticky
                      ? 'sticky'
                      : 'relative',
                  borderLeft: isFirstColumn
                    ? ''
                    : isActionColumn
                    ? '2px solid #B7C4C9'
                    : '1px solid #B7C4C9',
                }}
                px={2}>
                {typeof colName === 'function' ? (
                  headerContent
                ) : (
                  <Text
                    fontSize="0.9rem"
                    fontWeight="700"
                    color="#191919"
                    textAlign={alignText}>
                    {headerContent || ''}
                  </Text>
                )}
                {column?.sortable && (
                  <Box
                    ml={3}
                    cursor="pointer"
                    onClick={() => {
                      handleSort(column);
                    }}>
                    <SortIcon
                      column={column}
                      currentSortState={currentSortState}
                      isSort={isSort}
                      sortDirection={sortDirection}
                    />
                  </Box>
                )}
                {((!isLastColumn && !isExpandAction) || column?.resizable) && (
                  <Box
                    ml={3}
                    onMouseDown={e => handleColumnResize(column?.field, e)}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '5px',
                      cursor: 'ew-resize',
                      zIndex: 4,
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        {data.length === 0 ? (
          <Text
            my={noRecordMY || 20}
            color="gray.400"
            fontWeight={500}
            textAlign="center">
            {noRecordMessage || messages.NO_RECORD_DISPLAY_NOTE}
          </Text>
        ) : (
          <>
            {allowReorder ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="droppable">
                  {provided => (
                    <Box
                      ref={provided.innerRef}
                      height={`calc(2.8rem * ${data.length})`}
                      width="auto"
                      minWidth="fit-content"
                      {...provided.droppableProps}>
                      {data?.map((row, index) => (
                        <Box
                          key={row?.id || row?.uuid}
                          onMouseEnter={() => setIndexH(index)}
                          onMouseLeave={() => setIndexH(null)}>
                          <Draggable
                            key={row?.id || row?.uuid}
                            draggableId={(row?.id || row?.uuid)?.toString()}
                            index={index}
                            flex={1}>
                            {(prov, snapshot) => (
                              <Box
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                ref={prov.innerRef}
                                display="flex"
                                minWidth={snapshot.isDragging ? 'auto' : '100%'}
                                transition="all 0.1s ease-in"
                                bg={
                                  snapshot.isDragging
                                    ? 'primary.200'
                                    : indexH === index
                                    ? 'primary.50'
                                    : 'white'
                                }
                                boxShadow={snapshot.isDragging ? 'lg' : 'none'}
                                borderRadius={snapshot.isDragging ? 5 : 0}
                                alignItems="center"
                                height="2.8rem"
                                backgroundColor={`${
                                  isDropdownTable && 'primary.200'
                                }`}
                                borderBottom={`${
                                  width > tablescrollCheckPoint()
                                    ? '1px solid #B7C4C9'
                                    : ''
                                }`}
                                justifyContent={'space-between'}>
                                <Box display={'flex'}>
                                  {isDropdownTable && (
                                    <Box
                                      px={2}
                                      borderRight={'1px solid #B7C4C9'}
                                      width="37px"
                                      minWidth="37px"
                                      maxWidth="37px"
                                      height="2.7rem"
                                      display="flex"
                                      alignItems="center">
                                      {isDropdownTable &&
                                      (expandedRows[row.id] ||
                                        expandedRows[row.uuid]) ? (
                                        <IoIosArrowUp
                                          size="1rem"
                                          onClick={() => handleExpandRow(row)}
                                        />
                                      ) : (
                                        <IoIosArrowDown
                                          size="1rem"
                                          onClick={() => handleExpandRow(row)}
                                        />
                                      )}
                                    </Box>
                                  )}
                                  <Box
                                    px={2}
                                    borderRight={'1px solid #B7C4C9'}
                                    width="37px"
                                    minWidth="37px"
                                    maxWidth="37px"
                                    height="2.8rem"
                                    display="flex"
                                    alignItems="center"
                                    className={`${
                                      width <= tablescrollCheckPoint()
                                        ? 'tableBorder'
                                        : ''
                                    }`}>
                                    <RxDragHandleDots2 size="1.4rem" />
                                  </Box>
                                </Box>
                                {checkboxSelection && (
                                  <Box
                                    width="50px"
                                    minWidth={'50px'}
                                    maxWidth={'50px'}
                                    display="flex"
                                    borderRight={'1px solid #B7C4C9'}
                                    alignItems="center"
                                    justifyContent="center"
                                    key={row.id}
                                    className={`${
                                      width <= tablescrollCheckPoint()
                                        ? 'tableBorder'
                                        : ''
                                    }`}
                                    alignSelf={'stretch'}>
                                    <Checkbox
                                      isChecked={
                                        !!selectedRows?.filter(val => {
                                          if (val?.uuid && row?.uuid) {
                                            return val?.uuid === row?.uuid;
                                          } else {
                                            return (
                                              JSON.stringify(val) ===
                                              JSON.stringify(row)
                                            );
                                          }
                                        }).length
                                      }
                                      onChange={e =>
                                        handleRowCheckboxChange(
                                          row,
                                          e.target.checked,
                                        )
                                      }
                                    />
                                  </Box>
                                )}
                                {columns?.map((column, dataIndex) => {
                                  const justifyText =
                                    column?.justifyText || 'flex-start';
                                  const alignText = column?.alignText || 'left';
                                  let val = column.renderCell
                                    ? column.renderCell(
                                        row[column.field],
                                        row,
                                        index,
                                      )
                                    : column.valueGetter
                                    ? column.valueGetter(row, index)
                                    : row[column.field];

                                  // Handle object values
                                  val = renderCellValue(val);

                                  const isExpandRow =
                                    isDropdownTable &&
                                    val &&
                                    val !== '--' &&
                                    column?.isExpandRow
                                      ? true
                                      : false;
                                  const colName = column?.headerName;

                                  // Extract text for comparison (for action column detection)
                                  const headerText =
                                    typeof colName === 'function'
                                      ? colName()?.props?.children || ''
                                      : colName || '';

                                  const isActionColumn = [
                                    'Action',
                                    'Actions',
                                  ].includes(headerText);
                                  const isFirstColumn = dataIndex === 0;
                                  const isColumnLeftSticky =
                                    isLeftColumnSticky && dataIndex === 0
                                      ? true
                                      : false;

                                  return (
                                    <Box
                                      className={`${column?.field} ${
                                        isActionColumn
                                          ? 'action_field'
                                          : isColumnLeftSticky
                                          ? 'sticky_field_left'
                                          : ''
                                      }`}
                                      {...getWidthParams(column)}
                                      overflow="hidden"
                                      fontSize="0.9rem"
                                      key={column.field}
                                      alignSelf="stretch"
                                      display="flex"
                                      alignItems="center"
                                      justifyContent={justifyText}
                                      borderBottom={`${
                                        width <= tablescrollCheckPoint()
                                          ? '1px solid #B7C4C9'
                                          : ''
                                      }`}
                                      style={{
                                        borderLeft: isFirstColumn
                                          ? ''
                                          : isActionColumn
                                          ? '2px solid #B7C4C9'
                                          : '1px solid #B7C4C9',
                                      }}
                                      backgroundColor={
                                        isDropdownTable
                                          ? 'primary.50'
                                          : isActionColumn || isColumnLeftSticky
                                          ? 'white'
                                          : ''
                                      }
                                      px={column.isDateColumn ? 0 : 2}>
                                      {val &&
                                      typeof val === 'string' &&
                                      val !== '--' ? (
                                        <Tooltip hasArrow label={val}>
                                          <Text
                                            cursor="pointer"
                                            style={
                                              column.shouldEllipsis
                                                ? {
                                                    whiteSpace: 'pre',
                                                    overflowWrap: 'break-word',
                                                    wordBreak: 'break-word',
                                                    textOverflow: 'ellipsis',
                                                    overflow: 'hidden',
                                                  }
                                                : {}
                                            }
                                            color={
                                              column?.textColor || 'gray.800'
                                            }
                                            onClick={() =>
                                              isExpandRow
                                                ? handleExpandRow(row)
                                                : undefined
                                            }>
                                            {val}
                                          </Text>
                                        </Tooltip>
                                      ) : (
                                        <Text
                                          style={
                                            column.shouldEllipsis
                                              ? {
                                                  whiteSpace: 'pre',
                                                  overflowWrap: 'break-word',
                                                  wordBreak: 'break-word',
                                                  textOverflow: 'ellipsis',
                                                  overflow: 'hidden',
                                                }
                                              : {}
                                          }
                                          width="100%"
                                          textAlign={alignText}
                                          color={
                                            column?.textColor || 'gray.800'
                                          }
                                          onClick={() =>
                                            isExpandRow
                                              ? handleExpandRow(row)
                                              : undefined
                                          }>
                                          {val || ''}
                                        </Text>
                                      )}
                                    </Box>
                                  );
                                })}
                              </Box>
                            )}
                          </Draggable>
                          {isDropdownTable &&
                            (expandedRows[row.id] ||
                              expandedRows[row.uuid]) && (
                              <Box
                                minW={baseHeadeOffsetWidth}
                                maxW={baseHeadeOffsetWidth}
                                overflow="auto">
                                <ExpandTableComponent
                                  data={
                                    typeof expandalbleTableData === 'function'
                                      ? expandalbleTableData(row)
                                      : expandalbleTableData
                                  }
                                  columns={expandalbleTableColumn}
                                  parentRowData={row}
                                  showCheckboxInExpandable={
                                    typeof showCheckboxInExpandable ===
                                    'function'
                                      ? showCheckboxInExpandable(row)
                                      : showCheckboxInExpandable
                                  }
                                  selectedExpRows={selectedExpRows}
                                  setSelectedExpRows={setSelectedExpRows}
                                  onExpCheckboxClick={onExpCheckboxClick}
                                  setExpAllSelected={setExpAllSelected}
                                  headerBg={expandTableHeaderBg}
                                />
                              </Box>
                            )}
                        </Box>
                      ))}

                      {/* Add Total Row */}
                      {isRenderTotalRow && totalRowData && (
                        <Box
                          display="flex"
                          width="auto"
                          position="sticky"
                          bottom="0"
                          color="#4A5568"
                          minWidth="fit-content"
                          minHeight="2.8rem"
                          height={customRowHeight}
                          borderBottom={`${
                            width > tablescrollCheckPoint()
                              ? '1px solid #B7C4C9'
                              : '0px'
                          }`}
                          justifyContent={'space-between'}
                          bg="gray.50"
                          fontWeight="bold">
                          {/* Spacer for dropdown arrow if needed */}
                          {isDropdownTable && (
                            <Box
                              px={2}
                              width="37px"
                              minWidth="37px"
                              maxWidth="37px"
                              borderRight={'1px solid #B7C4C9'}
                              height="2.7rem"
                            />
                          )}
                          {/* Spacer for checkbox if needed */}
                          {checkboxSelection && (
                            <Box
                              width="50px"
                              minWidth={'50px'}
                              maxWidth={'50px'}
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              alignSelf={'stretch'}
                            />
                          )}
                          {/* Render total row cells */}
                          {columns?.map((column, dataIndex) => {
                            const justifyText =
                              column?.justifyText || 'flex-start';
                            const alignText = column?.alignText || 'left';
                            const alignCell = column?.alignCell || 'center';
                            const val = totalRowData[column.field] || '';
                            const colName = column?.headerName;
                            const isActionColumn =
                              ['Action', 'Actions'].includes(colName) ||
                              column?.field === 'action';
                            const isColumnLeftSticky =
                              isLeftColumnSticky && dataIndex === 0
                                ? true
                                : false;
                            const isFirstColumn = dataIndex === 0;

                            // Dynamic text color setup
                            const textColorKey = `${column.field}_text_color`;
                            const textColorVal =
                              totalRowData?.[textColorKey] ||
                              defaultListTextColorStaticVal;
                            const textRowFontWeight =
                              totalRowData?.fontWeight || 400;

                            return (
                              <Box
                                key={column.field}
                                className={`${column?.field} ${
                                  isActionColumn
                                    ? 'action_field'
                                    : isColumnLeftSticky
                                    ? 'sticky_field_left'
                                    : ''
                                }`}
                                {...getWidthParams(column)}
                                overflow="hidden"
                                fontSize="0.9rem"
                                alignSelf="stretch"
                                display="flex"
                                alignItems={alignCell}
                                justifyContent={justifyText}
                                style={{
                                  borderLeft: isFirstColumn
                                    ? ''
                                    : isActionColumn
                                    ? '2px solid #B7C4C9'
                                    : '1px solid #B7C4C9',
                                }}
                                bg={isActionColumn ? 'white' : 'none'}
                                px={2}>
                                <Text
                                  width="100%"
                                  textAlign={alignText}
                                  color={textColorVal}
                                  fontWeight={textRowFontWeight}>
                                  {val}
                                </Text>
                              </Box>
                            );
                          })}
                        </Box>
                      )}

                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <Box height="calc(100% - 3.2rem)">
                {data?.map((row, index) => (
                  <>
                    <Box
                      key={index}
                      display="flex"
                      width="auto"
                      minWidth="fit-content"
                      minHeight="2.8rem"
                      height={customRowHeight}
                      backgroundColor={
                        row?.customBgRowColor ||
                        (isDropdownTable &&
                          (expandTableAccordionBg || 'primary.50'))
                      }
                      borderBottom={`${
                        width > tablescrollCheckPoint()
                          ? '1px solid #B7C4C9'
                          : '0px'
                      }`}
                      justifyContent={'space-between'}
                      flex={1}>
                      {isDropdownTable && (
                        <Box
                          px={2}
                          backgroundColor={
                            isDropdownTable &&
                            (expandTableAccordionBg || 'primary.50')
                          }
                          width="37px"
                          minWidth="37px"
                          maxWidth="37px"
                          borderRight={'1px solid #B7C4C9'}
                          height="2.7rem"
                          display="flex"
                          alignItems="center"
                          cursor={'pointer'}
                          onClick={() => handleExpandRow(row)}>
                          {isDropdownTable &&
                          (expandedRows[row.id] || expandedRows[row.uuid]) ? (
                            <IoIosArrowUp size="1rem" />
                          ) : (
                            <IoIosArrowDown size="1rem" />
                          )}
                        </Box>
                      )}
                      {checkboxSelection && (
                        <Box
                          width="50px"
                          minWidth={'50px'}
                          maxWidth={'50px'}
                          borderRight={'1px solid #B7C4C9'}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          key={row.id}
                          className={`${
                            width <= tablescrollCheckPoint()
                              ? 'tableBorder'
                              : ''
                          }`}
                          alignSelf={'stretch'}
                          backgroundColor={
                            isDropdownTable &&
                            (expandTableAccordionBg || 'primary.50')
                          }>
                          <Checkbox
                            disabled={row?.is_checkbox_hide}
                            isChecked={
                              !!selectedRows?.filter(val => {
                                if (val?.uuid && row?.uuid) {
                                  return val?.uuid === row?.uuid;
                                } else {
                                  return (
                                    JSON.stringify(val) === JSON.stringify(row)
                                  );
                                }
                              }).length
                            }
                            onChange={e =>
                              handleRowCheckboxChange(row, e.target.checked)
                            }
                          />
                        </Box>
                      )}
                      {columns?.map((column, dataIndex) => {
                        const justifyText = column?.justifyText || 'flex-start';
                        const alignText = column?.alignText || 'left';
                        const alignCell = column?.alignCell || 'center';
                        let val = column.renderCell
                          ? column.renderCell(row[column.field], row, index)
                          : column.valueGetter
                          ? column.valueGetter(row, index)
                          : row[column.field];

                        // Handle object values
                        val = renderCellValue(val);

                        const isExpandRow =
                          isDropdownTable &&
                          val &&
                          val !== '--' &&
                          column?.isExpandRow
                            ? true
                            : false;
                        const colName = column?.headerName;

                        // Extract text for comparison (for action column detection)
                        const headerText =
                          typeof colName === 'function'
                            ? colName()?.props?.children || ''
                            : colName || '';

                        const isActionColumn = ['Action', 'Actions'].includes(
                          headerText,
                        );
                        const isFirstColumn = dataIndex === 0;
                        const isColumnLeftSticky =
                          isLeftColumnSticky && dataIndex === 0 ? true : false;

                        return (
                          <Box
                            className={`${column?.field} ${
                              isActionColumn
                                ? 'action_field'
                                : isColumnLeftSticky
                                ? 'sticky_field_left'
                                : ''
                            }  `}
                            {...getWidthParams(column)}
                            overflow="hidden"
                            fontSize="0.9rem"
                            key={column.field}
                            style={{
                              ...boxStyle,
                              borderLeft: isFirstColumn
                                ? ''
                                : isActionColumn
                                ? '2px solid #B7C4C9'
                                : '1px solid #B7C4C9',
                            }}
                            alignSelf="stretch"
                            display="flex"
                            alignItems={alignCell}
                            justifyContent={justifyText}
                            borderBottom={`${
                              width <= tablescrollCheckPoint()
                                ? '1px solid #B7C4C9'
                                : '0px'
                            }`}
                            backgroundColor={
                              isDropdownTable
                                ? expandTableAccordionBg || 'primary.50'
                                : isActionColumn || isColumnLeftSticky
                                ? 'white'
                                : ''
                            }
                            px={column.isDateColumn ? 0 : 2}>
                            {val && typeof val === 'string' && val !== '--' ? (
                              <Tooltip hasArrow label={val}>
                                <Text
                                  cursor="pointer"
                                  style={
                                    column.shouldEllipsis
                                      ? {
                                          whiteSpace: 'pre',
                                          overflowWrap: 'break-word',
                                          wordBreak: 'break-word',
                                          textOverflow: 'ellipsis',
                                          overflow: 'hidden',
                                        }
                                      : {}
                                  }
                                  color={column?.textColor || 'gray.800'}
                                  onClick={() =>
                                    isExpandRow
                                      ? handleExpandRow(row)
                                      : undefined
                                  }>
                                  {val}
                                </Text>
                              </Tooltip>
                            ) : (
                              <Text
                                style={
                                  column.shouldEllipsis
                                    ? {
                                        whiteSpace: 'pre',
                                        overflowWrap: 'break-word',
                                        wordBreak: 'break-word',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                      }
                                    : {}
                                }
                                width="100%"
                                textAlign={alignText}
                                color={column?.textColor || 'gray.800'}
                                onClick={() =>
                                  isExpandRow ? handleExpandRow(row) : undefined
                                }>
                                {val || ''}
                              </Text>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                    {isDropdownTable && expandedRows[row.id || row.uuid] && (
                      <Box
                        minW={effectiveWidth}
                        maxW={effectiveWidth}
                        overflow="auto">
                        {CustomExpandTableComponent ? (
                          <CustomExpandTableComponent
                            data={row}
                            {...extraPropsForCustomExpandTable}
                          />
                        ) : (
                          <ExpandTableComponent
                            data={
                              typeof expandalbleTableData === 'function'
                                ? expandalbleTableData(row)
                                : expandalbleTableData
                            }
                            columns={expandalbleTableColumn}
                            parentRowData={row}
                            height={expandTableHeight}
                            maxHeight={expandTableMaxHeight}
                            showCheckboxInExpandable={
                              typeof showCheckboxInExpandable === 'function'
                                ? showCheckboxInExpandable(row)
                                : showCheckboxInExpandable
                            }
                            selectedExpRows={selectedExpRows}
                            setSelectedExpRows={setSelectedExpRows}
                            onExpCheckboxClick={onExpCheckboxClick}
                            setExpAllSelected={setExpAllSelected}
                          />
                        )}
                      </Box>
                    )}
                  </>
                ))}

                {/* Add Total Row */}
                {isRenderTotalRow && totalRowData && (
                  <Box
                    display="flex"
                    width="auto"
                    position="sticky"
                    bottom="0"
                    color="#4A5568"
                    minWidth="fit-content"
                    minHeight="2.8rem"
                    height={customRowHeight}
                    borderBottom={`${
                      width > tablescrollCheckPoint()
                        ? '1px solid #B7C4C9'
                        : '0px'
                    }`}
                    justifyContent={'space-between'}
                    bg="gray.50"
                    fontWeight="bold">
                    {/* Spacer for dropdown arrow if needed */}
                    {isDropdownTable && (
                      <Box
                        px={2}
                        width="37px"
                        minWidth="37px"
                        maxWidth="37px"
                        borderRight={'1px solid #B7C4C9'}
                        height="2.7rem"
                      />
                    )}
                    {/* Spacer for checkbox if needed */}
                    {checkboxSelection && (
                      <Box
                        width="50px"
                        minWidth={'50px'}
                        maxWidth={'50px'}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        alignSelf={'stretch'}
                      />
                    )}
                    {/* Render total row cells */}
                    {columns?.map((column, dataIndex) => {
                      const justifyText = column?.justifyText || 'flex-start';
                      const alignText = column?.alignText || 'left';
                      const alignCell = column?.alignCell || 'center';
                      const val = totalRowData[column.field] || '';
                      const colName = column?.headerName;
                      const isActionColumn =
                        ['Action', 'Actions'].includes(colName) ||
                        column?.field === 'action';
                      const isColumnLeftSticky =
                        isLeftColumnSticky && dataIndex === 0 ? true : false;
                      const isFirstColumn = dataIndex === 0;

                      // Dynamic text color setup
                      const textColorKey = `${column.field}_text_color`;
                      const textColorVal =
                        totalRowData?.[textColorKey] ||
                        defaultListTextColorStaticVal;
                      const textRowFontWeight = totalRowData?.fontWeight || 400;

                      return (
                        <Box
                          key={column.field}
                          className={`${column?.field} ${
                            isActionColumn
                              ? 'action_field'
                              : isColumnLeftSticky
                              ? 'sticky_field_left'
                              : ''
                          }`}
                          {...getWidthParams(column)}
                          overflow="hidden"
                          fontSize="0.9rem"
                          alignSelf="stretch"
                          display="flex"
                          alignItems={alignCell}
                          justifyContent={justifyText}
                          style={{
                            borderLeft: isFirstColumn
                              ? ''
                              : isActionColumn
                              ? '2px solid #B7C4C9'
                              : '1px solid #B7C4C9',
                          }}
                          bg={isActionColumn ? 'white' : 'none'}
                          px={2}>
                          <Text
                            width="100%"
                            textAlign={alignText}
                            color={textColorVal}
                            fontWeight={textRowFontWeight}>
                            {val}
                          </Text>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
      {noPagination ? null : (
        <Box
          px="0.5rem"
          mt="auto"
          display="flex"
          alignItems="center"
          bg="white"
          borderTop="1px solid #B7C4C9"
          height="3rem">
          <>
            <Flex ml="auto" alignItems="center" mr={5}>
              <Text fontSize="sm" mr={2}>
                Rows Per Page
              </Text>
              <Select
                size="sm"
                value={currentPageSize}
                onChange={handlePageSizeChange}
                width="auto"
                mr={5}>
                {pageSizeOptions?.map(page => (
                  <option key={page} value={page}>
                    {page}
                  </option>
                ))}
              </Select>
              <Text fontSize="sm" mx={2}>
                {paginationText}
              </Text>
            </Flex>
            <Flex gap={2}>
              <IconButton
                size="sm"
                variant="ghost"
                icon={<ChevronLeftIcon fontSize="xl" />}
                aria-label="Previous Page"
                isDisabled={currentPage === 0 || data?.length === 0}
                onClick={handlePreviousPage}
              />
              <IconButton
                size="sm"
                variant="ghost"
                icon={<ChevronRightIcon fontSize="xl" />}
                aria-label="Next Page"
                isDisabled={currentPage === pageCount - 1 || data?.length === 0}
                onClick={handleNextPage}
              />
            </Flex>
          </>
        </Box>
      )}
    </Box>
  );
};

DataTable.propTypes = {
  columns: PropTypes.array,
  tableHeaderBg: PropTypes.string,
  rows: PropTypes.array,
  page: PropTypes.any,
  pageSize: PropTypes.any,
  height: PropTypes.string,
  maxHeight: PropTypes.string,
  pageSizeOptions: PropTypes.array,
  checkboxSelection: PropTypes.bool,
  allowReorder: PropTypes.bool,
  onReorderComplete: PropTypes.func,
  onPageSizeChange: PropTypes.func,
  onPageChange: PropTypes.func,
  loading: PropTypes.bool,
  noPagination: PropTypes.bool,
  selectedRows: PropTypes.array,
  setSelectedRows: PropTypes.func,
  totalRows: PropTypes.any,
  demoReorder: PropTypes.bool,
  onOrderChange: PropTypes.func,
  onCheckboxClick: PropTypes.func,
  setAllSelected: PropTypes.func,
  boxStyle: PropTypes.object,
  isDropdownTable: PropTypes.bool,
  expandalbleTableColumn: PropTypes.array,
  expandalbleTableData: PropTypes.array,
  handleExpandableData: PropTypes.func,
  expandTableHeight: PropTypes.string,
  expandTableMaxHeight: PropTypes.string,
  expandTableHeaderBg: PropTypes.string,
  expandTableAccordionBg: PropTypes.string,
  onSort: PropTypes.func,
  customRowHeight: PropTypes.string,
  customExpandTableWidth: PropTypes.string,
  noRecordMessage: PropTypes.string,
  currentSortState: PropTypes.object,
  noRecordMY: PropTypes.string,
  showCheckboxInExpandable: PropTypes.bool,
  selectedExpRows: PropTypes.array,
  setSelectedExpRows: PropTypes.func,
  onExpCheckboxClick: PropTypes.func,
  setExpAllSelected: PropTypes.func,
  CustomExpandTableComponent: PropTypes.element,
  extraPropsForCustomExpandTable: PropTypes.object,
  module_id: PropTypes.string,
  location_list: PropTypes.string,
  headerZIndex: PropTypes.number,
  totalRowData: PropTypes.object,
  isRenderTotalRow: PropTypes.bool,
  isLeftColumnSticky: PropTypes.bool,
  isCustomSecondExpandedTable: PropTypes.bool,
  isCustomFirstExpandedTable: PropTypes.bool,
  IsMultiTableResize: PropTypes.bool,
};

export default DataTable;
