import PropTypes from 'prop-types';
import { Box, Text, Spinner, Tooltip, Checkbox } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import useViewport from '../../hooks/useViewport';
import _ from 'lodash';

const ExpandTableComponent = ({
  data,
  headerBg = 'var(--chakra-colors-primary-50)',
  columns,
  height,
  maxHeight,
  loading,
  parentRowData,
  showCheckboxInExpandable = false,
  selectedExpRows,
  setSelectedExpRows,
  onExpCheckboxClick,
  setExpAllSelected,
  isDropdownTable = false,
  expandTableAccordionBg = 'white',
  isSecondExpandedTable = false,
}) => {
  const tableRef = useRef(null);
  const { width } = useViewport();

  const [columnLength, setColumnLength] = useState({});

  useEffect(() => {
    const columnLength = {};
    if (data) {
      for (let row of data) {
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
  }, [data]);

  useEffect(() => {
    if (!showCheckboxInExpandable) return;
    isHeaderCheckBoxAllSelected();
  }, [selectedExpRows]);

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
    let columnWidth = column?.width;
    const columnMaxWidth = column?.maxWidth;
    const columnMinWidth = column?.minWidth;
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
    return {
      width: columnWidth,
      minWidth: columnWidth,
      maxWidth: columnWidth,
    };
  };

  const handleHeaderCheckboxChange = e => {
    const isChecked = e.target.checked;
    onExpCheckboxClick();

    if (isChecked) {
      // Select all records that are not hidden in the current expandable section
      const newSelectedRows = _.uniqBy(
        [...selectedExpRows, ...data.filter(ele => !ele.is_exp_checkbox_hide)],
        'exp_row_id',
      );
      setSelectedExpRows(newSelectedRows);
    } else {
      // Deselect all records in the current expandable section
      const newSelectedRows = selectedExpRows.filter(
        row => !data.some(d => d.exp_row_id === row.exp_row_id),
      );
      setSelectedExpRows(newSelectedRows);
    }
  };

  // Check if all visible records in the current section are selected
  const isHeaderCheckBoxAllSelected = () => {
    const visibleRecords = data.filter(ele => !ele.is_exp_checkbox_hide);
    return (
      visibleRecords.length > 0 &&
      visibleRecords.every(record =>
        selectedExpRows.some(
          selected => selected.exp_row_id === record.exp_row_id,
        ),
      )
    );
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
      border="1px solid"
      borderColor="#B7C4C9">
      <Box
        ref={tableRef}
        height="calc(100% - 0rem)"
        overflow="auto"
        className="custom_scrollbar"
        position="relative">
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
          className={`${width > tablescrollCheckPoint() ? 'tableBorder' : ''}`}
          display="flex"
          h="3.2rem"
          bg={headerBg}
          width={'auto'}
          minWidth="fit-content"
          // backgroundColor={"red"}
          position="sticky"
          top="0"
          zIndex="1"
          alignItems="center"
          justifyContent={'space-between'}>
          {showCheckboxInExpandable && (
            <Box
              width="50px"
              className={`${
                width <= tablescrollCheckPoint() ? 'tableBorder' : ''
              }`}
              minWidth={'50px'}
              maxWidth={'50px'}
              display="flex"
              alignItems="center"
              justifyContent="center"
              alignSelf={'stretch'}>
              <Checkbox
                isChecked={isHeaderCheckBoxAllSelected()}
                onChange={handleHeaderCheckboxChange}
              />
            </Box>
          )}
          {columns?.map(column => {
            const colName = column?.headerName;
            const justifyText = column?.justifyText || 'flex-start';
            const alignText = column?.alignText || 'left';
            return (
              <Box
                bg={headerBg}
                className={`${
                  width <= tablescrollCheckPoint() ? 'tableBorder' : ''
                }`}
                {...getWidthParams(column)}
                key={column?.field}
                overflow="hidden"
                alignSelf="stretch"
                display="flex"
                alignItems="center"
                justifyContent={justifyText}
                flex={1}
                textOverflow="ellipsis"
                px={2}>
                <Text
                  fontSize="0.8rem"
                  fontWeight="700"
                  color="gray.800"
                  textAlign={alignText}>
                  {colName || ''}
                </Text>
              </Box>
            );
          })}
        </Box>

        {data.length === 0 ? (
          <Text my="20px" color="gray.400" fontWeight={500} textAlign="center">
            No Data
          </Text>
        ) : (
          <Box height="calc(100% - 3.2rem)">
            {data?.map((row, index) => (
              <>
                <Box
                  className="heeeeeloo"
                  key={index}
                  display="flex"
                  width="auto"
                  minWidth="fit-content"
                  alignItems="center"
                  height="2.8rem"
                  backgroundColor={
                    isSecondExpandedTable
                      ? 'white'
                      : isDropdownTable
                      ? expandTableAccordionBg
                      : 'white'
                  }
                  sx={{
                    '&:hover': {
                      backgroundColor: isSecondExpandedTable
                        ? 'var(--chakra-colors-primary-50) !important'
                        : isDropdownTable
                        ? expandTableAccordionBg
                        : 'primary.50',
                      '& > div': {
                        backgroundColor: 'inherit !important',
                      },
                    },
                  }}
                  borderBottom={`${
                    width > tablescrollCheckPoint() ? '1px solid' : '0px'
                  }`}
                  borderBottomColor={`${
                    width > tablescrollCheckPoint() ? '#B7C4C9' : ''
                  }`}
                  justifyContent={'space-between'}
                  flex={1}>
                  {showCheckboxInExpandable && (
                    <Box
                      width="50px"
                      minWidth={'50px'}
                      maxWidth={'50px'}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      key={row.id}
                      className={`${
                        width <= tablescrollCheckPoint() ? 'tableBorder' : ''
                      }`}
                      alignSelf={'stretch'}
                      // backgroundColor='primary.50'
                    >
                      {!row.is_exp_checkbox_hide && (
                        <Checkbox
                          disabled={row?.is_exp_checkbox_hide}
                          isChecked={
                            !!selectedExpRows?.filter(val => {
                              if (val?.uuid && row?.uuid) {
                                return val?.uuid === row?.uuid;
                              } else {
                                return (
                                  JSON.stringify(val) === JSON.stringify(row)
                                );
                              }
                            }).length || setExpAllSelected
                          }
                          onChange={e => {
                            onExpCheckboxClick();
                            if (!e.target.checked) {
                              setSelectedExpRows(pre => {
                                return pre?.filter(val => {
                                  return (
                                    JSON.stringify(val) !== JSON.stringify(row)
                                  );
                                });
                              });
                              return;
                            }

                            setSelectedExpRows([...selectedExpRows, row]);
                          }}
                        />
                      )}
                    </Box>
                  )}
                  {columns?.map(column => {
                    const justifyText = column?.justifyText || 'flex-start';
                    const alignText = column?.alignText || 'left';
                    const val = column.renderCell
                      ? column.renderCell(
                          row[column.field],
                          row,
                          index,
                          parentRowData,
                        )
                      : column.valueGetter
                      ? column.valueGetter(row, index)
                      : row[column.field];
                    return (
                      <Box
                        {...getWidthParams(column)}
                        overflow="hidden"
                        fontSize="0.8rem"
                        whiteSpace="nowrap"
                        textOverflow="ellipsis"
                        key={column.field}
                        alignSelf="stretch"
                        display="flex"
                        alignItems="center"
                        justifyContent={justifyText}
                        borderBottom={`${
                          width <= tablescrollCheckPoint() ? '1px solid' : '0px'
                        }`}
                        borderBottomColor={`${
                          width <= tablescrollCheckPoint()
                            ? '#B7C4C9'
                            : 'transparent'
                        }`}
                        backgroundColor={'inherit'}
                        px={2}>
                        {val && typeof val === 'string' ? (
                          <Tooltip hasArrow label={val}>
                            <Text
                              cursor="pointer"
                              whiteSpace="nowrap"
                              overflow="hidden"
                              textOverflow="ellipsis"
                              display="inline-block">
                              {val}
                            </Text>
                          </Tooltip>
                        ) : (
                          <Text
                            display="inline-block"
                            width="100%"
                            textAlign={alignText}>
                            {val || ''}
                          </Text>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

ExpandTableComponent.propTypes = {
  data: PropTypes.array,
  columns: PropTypes.array,
  height: PropTypes.string,
  maxHeight: PropTypes.string,
  loading: PropTypes.bool,
  parentRowData: PropTypes.obj,
  showCheckboxInExpandable: PropTypes.bool,
  selectedExpRows: PropTypes.array,
  setSelectedExpRows: PropTypes.func,
  onExpCheckboxClick: PropTypes.func,
  setExpAllSelected: PropTypes.func,
  headerBg: PropTypes.string,
  isDropdownTable: PropTypes.bool,
  expandTableAccordionBg: PropTypes.string,
  isSecondExpandedTable: PropTypes.bool,
};

export default ExpandTableComponent;
