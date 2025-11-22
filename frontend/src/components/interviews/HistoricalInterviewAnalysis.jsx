import { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Flex, Text, IconButton, HStack } from '@chakra-ui/react';
import {
  FiSearch,
  FiEye,
  FiLink,
  FiMail,
  FiList,
  FiBarChart2,
} from 'react-icons/fi';
import DataTable from '../Datatable/DataTable';
import {
  themeColor,
  STATUS_FILTER_OPTIONS,
} from '../../utils/constants/constants';
import UpdateCandidateStatus from '../UpdateCandidateStatus';
import { getDisplayStatus, getApiStatus } from '../../utils/helper';
import { getOverallAnalysis } from '../../api/InterviewsService';
import { setLoadingState } from '../../redux/slices/loaderSlice';
import { useDispatch } from 'react-redux';
import { showToast } from '../Toast/ShowToast';
import { TOAST_ERROR_STATUS } from '../../utils/constants/titleConstant';
import useInterviewActions from '../../hooks/useInterviewActions';
import { getTextDateFullYearFromUTCDateVal } from '../../utils/helper';
import { dateConstants } from '../../utils/constants/dateConstants';
import { useSelector } from 'react-redux';
import TextField from '../TextField/TextField';
import { SingleReactSelect } from '../SingleReactSelect/SingleReactSelect';
import messages from '../../utils/constants/messages';
import InterviewAnalysisFilter from './InterviewAnalysisFilter';

const HistoricalInterviewAnalysis = ({
  interviewId,
  viewMode,
  onViewModeChange,
}) => {
  const dispatch = useDispatch();
  const { copyInterviewLink, sendInterviewInvite, getStatusValue } =
    useInterviewActions();
  const timeZone = useSelector(
    state => state.auth.timeZone || dateConstants.TIMEZONE_CONST_ASIA_KOLKATA,
  );
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [period] = useState('weekly');
  // Applied filter values (used for API calls)
  const [dateType, setDateType] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  // Temporary filter values (used in filter UI)
  const [tempDateType, setTempDateType] = useState(null);
  const [tempFromDate, setTempFromDate] = useState('');
  const [tempToDate, setTempToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState({
    value: 'All',
    label: 'All',
  });
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortState, setSortState] = useState({
    sort_field: null,
    sort_order: 'asc',
  });

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchAnalysisData = useCallback(async () => {
    if (!interviewId) return;

    try {
      setLoading(true);
      dispatch(setLoadingState(true));
      // Get status filter value and convert to API format
      const statusFilterValue = statusFilter?.value || statusFilter;
      const statusParam =
        statusFilterValue && statusFilterValue !== 'All'
          ? getApiStatus(statusFilterValue)
          : undefined;

      // Get date filter values
      const dateTypeValue = dateType?.value || dateType;
      const dateTypeParam = dateTypeValue || undefined;
      const fromDateParam = fromDate || undefined;
      const toDateParam = toDate || undefined;

      const response = await getOverallAnalysis(interviewId, {
        period,
        include_candidates: true, // Always true for Historical tab
        page,
        page_size: pageSize,
        search: debouncedSearchTerm.trim() || undefined, // Pass search parameter to API
        sort_field: sortState.sort_field || undefined, // Pass sort field to API
        sort_order: sortState.sort_field ? sortState.sort_order : undefined, // Pass sort order to API
        status: statusParam, // Pass status filter to API
        date_type: dateTypeParam, // Pass date type filter to API
        date_from: fromDateParam, // Pass from date filter to API
        date_to: toDateParam, // Pass to date filter to API
      });

      const data = response?.body;
      if (data && data.ok) {
        setCandidates(data.candidates || []);
        setTotalRows(
          data.pagination?.total_count || data.candidates?.length || 0,
        );
      }
    } catch (error) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.ERROR_LOADING_ANALYSIS,
        error?.error || messages.FAILED_TO_LOAD_INTERVIEW_ANALYSIS,
      );
    } finally {
      setLoading(false);
      dispatch(setLoadingState(false));
    }
  }, [
    interviewId,
    period,
    page,
    pageSize,
    debouncedSearchTerm,
    sortState.sort_field,
    sortState.sort_order,
    statusFilter,
    dateType,
    fromDate,
    toDate,
    dispatch,
    showToast,
  ]);

  useEffect(() => {
    fetchAnalysisData();
  }, [fetchAnalysisData]);

  const handleSearchChange = useCallback(event => {
    setSearchTerm(event.target.value);
  }, []);

  const handleSort = useCallback((field, direction) => {
    setSortState({
      sort_field: field,
      sort_order: direction || 'asc',
    });
    setPage(1); // Reset to first page when sorting changes
  }, []);

  const handlePageChange = useCallback(newPage => {
    setPage(newPage + 1);
  }, []);

  const handlePageSizeChange = useCallback(newPageSize => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  const handleResetFilter = useCallback(() => {
    // Reset both temporary and applied values
    setTempDateType(null);
    setTempFromDate('');
    setTempToDate('');
    setDateType(null);
    setFromDate('');
    setToDate('');
    setPage(1); // Reset to first page when resetting filters
    return true; // Return true to allow popover to close
  }, []);

  const handleStatusFilterChange = useCallback(selectedOption => {
    setStatusFilter(selectedOption || { value: 'All', label: 'All' });
  }, []);

  const handleDateTypeChange = useCallback(selectedOption => {
    setTempDateType(selectedOption);
    // Clear dates when date type changes
    if (!selectedOption) {
      setTempFromDate('');
      setTempToDate('');
    }
  }, []);

  const handleFromDateChange = useCallback(value => {
    setTempFromDate(value);
  }, []);

  const handleToDateChange = useCallback(value => {
    setTempToDate(value);
  }, []);

  const handleApplyFilter = useCallback(() => {
    // Validate: date type must be selected if dates are provided
    if ((tempFromDate || tempToDate) && !tempDateType) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.VALIDATION_ERROR,
        messages.PLEASE_SELECT_DATE_TYPE,
      );
      return false; // Return false to prevent popover from closing
    }

    // Apply temporary values to actual filter values (this will trigger API call via useEffect)
    setDateType(tempDateType);
    setFromDate(tempFromDate);
    setToDate(tempToDate);
    setPage(1); // Reset to first page when applying filters
    return true; // Return true to allow popover to close
  }, [tempDateType, tempFromDate, tempToDate, showToast]);

  const filteredCandidates = useMemo(() => {
    // All filtering (search, status, date) is now handled by API
    return [...candidates];
  }, [candidates]);

  // Reset to page 1 when filters change to avoid being on a non-existent page
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, dateType, fromDate, toDate]);

  const columns = useMemo(
    () => [
      {
        field: 'sr_no',
        headerName: 'Sr no.',
        width: 100,
        sortable: true,
        renderCell: (value, row, index) => {
          return (page - 1) * pageSize + index + 1;
        },
      },
      {
        field: 'name',
        headerName: 'Full Name',
        width: 200,
        sortable: true,
      },
      {
        field: 'sent_date',
        headerName: 'Sent Date',
        width: 150,
        sortable: true,
        renderCell: (value, row) => {
          return (
            getTextDateFullYearFromUTCDateVal(
              row.sent_date,
              timeZone,
              dateConstants.DATE_TIME_CONST_1,
            ) || '—'
          );
        },
      },
      {
        field: 'test_given',
        headerName: 'Test Given',
        width: 180,
        sortable: true,
        renderCell: (value, row) => {
          // If given_date is already a formatted string, use it directly
          if (row.given_date && typeof row.given_date === 'string') {
            return row.given_date;
          }
          // Otherwise, try to format from other date fields
          return (
            getTextDateFullYearFromUTCDateVal(
              row.given_date,
              timeZone,
              dateConstants.DATE_TIME_CONST_1,
            ) || '—'
          );
        },
      },
      {
        field: 'overall_score',
        headerName: 'Overall Score',
        width: 140,
        sortable: true,
        renderCell: (value, row) => {
          return row.overall_score || row.total_score || row.score || '—';
        },
      },
      {
        field: 'communication_score',
        headerName: 'Communication Score',
        width: 180,
        sortable: true,
        renderCell: (value, row) => {
          return row.communication_score || row.communication_rating || '—';
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 150,
        sortable: false,
        renderCell: (value, row) => {
          const apiStatus = row.status || 'no_status';
          const displayStatus = getDisplayStatus(apiStatus);
          const statusColor = {
            Shortlisted: themeColor.SUCCESS_COLOR,
            Shortlist: themeColor.SUCCESS_COLOR,
            Potential: themeColor.WARNING_COLOR,
            Rejected: themeColor.ERROR_COLOR,
            Reject: themeColor.ERROR_COLOR,
            'No Status': themeColor.SECONDARY_TEXT_COLOR,
          };
          return (
            <Text
              color={
                statusColor[displayStatus] || themeColor.SECONDARY_TEXT_COLOR
              }
              fontWeight="medium">
              {displayStatus}
            </Text>
          );
        },
      },
      {
        field: 'summary',
        headerName: 'summary',
        width: 300,
        renderCell: (value, row) => {
          return row.sum || row.summary || '—';
        },
      },
      {
        field: 'Actions',
        headerName: 'Actions',
        width: 200,
        renderCell: (value, row) => {
          // Check if test was given - if given_date is not available, hide three-dot menu
          const isTestGiven =
            row.given_date &&
            row.given_date !== '—' &&
            row.given_date !== null &&
            row.given_date !== undefined &&
            row.given_date !== '';

          const handleStatusUpdate = () => {
            // Refresh the data after status update
            fetchAnalysisData();
          };

          const handleCopyLink = () => {
            const interviewLink =
              row.interview_link || row.candidate_link || row.link;
            copyInterviewLink(interviewLink);
          };

          const handleSendInvite = () => {
            sendInterviewInvite(interviewId, {
              candidate_id: row.candidate_id,
              email: row.email,
              resend: true,
            });
          };

          return (
            <HStack spacing="0.5rem">
              <IconButton
                aria-label="Copy Link"
                icon={<FiLink />}
                size="sm"
                variant="ghost"
                onClick={handleCopyLink}
              />
              <Box position="relative">
                <IconButton
                  aria-label="Email"
                  icon={<FiMail />}
                  size="sm"
                  variant="ghost"
                  onClick={handleSendInvite}
                />
              </Box>
              {/* Only show View icon if test was given */}
              {isTestGiven && (
                <IconButton
                  aria-label="View"
                  icon={<FiEye />}
                  size="sm"
                  variant="ghost"
                />
              )}
              {/* Only show three-dot menu (UpdateCandidateStatus) if test was given */}
              {isTestGiven && (
                <UpdateCandidateStatus
                  responseId={row.id || row.response_id || row.uuid}
                  currentStatus={getStatusValue(row.status)}
                  onStatusUpdate={handleStatusUpdate}
                  size="sm"
                  variant="ghost"
                />
              )}
            </HStack>
          );
        },
      },
    ],
    [
      page,
      pageSize,
      timeZone,
      fetchAnalysisData,
      interviewId,
      copyInterviewLink,
      sendInterviewInvite,
      getStatusValue,
    ],
  );

  const rows = useMemo(() => {
    return filteredCandidates.map((candidate, index) => ({
      id:
        candidate.id ||
        candidate.candidate_id ||
        candidate.response_id ||
        index,
      response_id:
        candidate.response_id ||
        candidate.id ||
        candidate.candidate_id ||
        index,
      candidate_id: candidate.candidate_id || candidate.id,
      uuid:
        candidate.id ||
        candidate.candidate_id ||
        candidate.response_id ||
        index,
      name: candidate.name || candidate.full_name || '—',
      email: candidate.email || '—',
      sent_date: candidate.sent_date,
      given_date: candidate.given_date,
      overall_score:
        candidate.overall_score || candidate.total_score || candidate.score,
      communication_score:
        candidate.communication_score || candidate.communication_rating,
      status: candidate.status || 'No Status',
      sum: candidate.sum || candidate.summary,
      interview_link: candidate.interview_link || candidate.link || null,
    }));
  }, [filteredCandidates]);

  return (
    <Box
      w="100%"
      overflow="hidden"
      bg={themeColor.WHITE_COLOR}
      p="1.5rem"
      borderRadius="lg"
      boxShadow="sm">
      <Flex justify="space-between" align="center" mb="1.5rem">
        <Flex align="center" gap="1rem">
          <Box w="200px">
            <TextField
              name="search"
              type="text"
              value={searchTerm}
              handleChange={handleSearchChange}
              placeholder="Search by Name"
              icon={<FiSearch color={themeColor.SECONDARY_TEXT_COLOR} />}
              noGap={true}
            />
          </Box>
          <InterviewAnalysisFilter
            dateType={tempDateType}
            fromDate={tempFromDate}
            toDate={tempToDate}
            onDateTypeChange={handleDateTypeChange}
            onFromDateChange={handleFromDateChange}
            onToDateChange={handleToDateChange}
            onResetFilter={handleResetFilter}
            onApplyFilter={handleApplyFilter}
            appliedDateType={dateType}
            appliedFromDate={fromDate}
            appliedToDate={toDate}
          />
        </Flex>
        <Flex align="center" gap="1rem">
          <Box w="150px">
            <SingleReactSelect
              name="statusFilter"
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              onChange={handleStatusFilterChange}
              isClearable={false}
            />
          </Box>
          <HStack spacing="0.5rem">
            <IconButton
              aria-label="List view"
              icon={<FiList />}
              variant={viewMode === 'list' ? 'solid' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange && onViewModeChange('list')}
            />
            <IconButton
              aria-label="Chart view"
              icon={<FiBarChart2 />}
              variant={viewMode === 'chart' ? 'solid' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange && onViewModeChange('chart')}
            />
          </HStack>
        </Flex>
      </Flex>

      <Box w="100%" overflow="hidden">
        <DataTable
          columns={columns}
          rows={rows}
          totalRows={totalRows}
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          customRowHeight="60px"
          onSort={handleSort}
          currentSortState={{
            field: sortState.sort_field,
            direction: sortState.sort_order,
          }}
          loading={loading}
          tableHeaderBg={themeColor.TAG_BG_COLOR}
          noRecordMessage="No candidates found."
          height="calc(70vh - 100px)"
        />
      </Box>
    </Box>
  );
};

HistoricalInterviewAnalysis.propTypes = {
  interviewId: PropTypes.string.isRequired,
  viewMode: PropTypes.string,
  onViewModeChange: PropTypes.func,
};

export default HistoricalInterviewAnalysis;
