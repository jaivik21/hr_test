import PropTypes from 'prop-types';
import {
  Badge,
  Box,
  Flex,
  Heading,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiClock,
  FiFileText,
  FiMoreVertical,
  FiUserPlus,
  FiEye,
  FiShare2,
  FiX,
  FiRefreshCw,
} from 'react-icons/fi';
import NiceModal from '@ebay/nice-modal-react';
import {
  themeColor,
  INTERVIEW_CARD_CONSTANTS,
} from '../../utils/constants/constants';
import { EditIcon } from '@chakra-ui/icons';
import { useDispatch } from 'react-redux';
import { toggleInterview } from '../../redux/slices/interviewsSlice';
import modals from '../../utils/constants/modals';
import { getTextDateFullYearFromUTCDateVal } from '../../utils/helper';
import { dateConstants } from '../../utils/constants/dateConstants';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import routePaths from '../../routes/routePaths';
import useInterviewActions from '../../hooks/useInterviewActions';

const formatDuration = duration => {
  if (!duration) return '—';
  const minutes = Number(duration);
  if (Number.isNaN(minutes)) {
    return duration;
  }
  return `${minutes} ${INTERVIEW_CARD_CONSTANTS.MINUTES}`;
};

// Define stats labels array outside component
const STATS_LABELS = [
  { label: INTERVIEW_CARD_CONSTANTS.SENT, key: 'sent' },
  { label: INTERVIEW_CARD_CONSTANTS.GIVEN, key: 'given' },
  { label: INTERVIEW_CARD_CONSTANTS.SHORTLISTED, key: 'shortlisted' },
  { label: INTERVIEW_CARD_CONSTANTS.PENDING, key: 'pending' },
];

const InterviewCard = ({ interview }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    id,
    name,
    time_duration: timeDuration,
    question_count: questionCount,
    stats,
    is_open: isOpen,
    created_at: createdAt,
    candidate_link,
    link,
  } = interview;

  const timeZone = useSelector(
    state => state.auth.timeZone || dateConstants.TIMEZONE_CONST_ASIA_KOLKATA,
  );

  const handleToggleStatus = async () => {
    await dispatch(toggleInterview(id));
  };

  const handleAddCandidate = () => {
    NiceModal.show(modals.addCandidateModal, {
      interviewId: id,
      interviewName: name,
    });
  };

  const handleView = () => {
    navigate(routePaths.getInterviewAnalysisPath(id));
  };

  const { copyInterviewLink } = useInterviewActions();

  const handleShare = () => {
    const candidateLink = candidate_link || link;
    copyInterviewLink(candidateLink);
  };

  return (
    <Box
      borderRadius="xl"
      bg="white"
      boxShadow="sm"
      p="1.25rem"
      _hover={{ boxShadow: 'md' }}
      transition="all 0.2s ease">
      <Flex justify="space-between" align="flex-start" mb="1rem">
        <Box>
          <Heading size="md">
            {name || INTERVIEW_CARD_CONSTANTS.UNTITLED_INTERVIEW}
          </Heading>
        </Box>
        <Badge
          bg={isOpen ? themeColor.BG_SUCCESS_COLOR : themeColor.BG_CLOSE_COLOR}
          borderRadius="full"
          px="0.75rem"
          py="0.25rem"
          textTransform="capitalize">
          {isOpen
            ? INTERVIEW_CARD_CONSTANTS.OPEN
            : INTERVIEW_CARD_CONSTANTS.CLOSED}
        </Badge>
      </Flex>

      <HStack spacing="0.75rem" mb="1rem" flexWrap="wrap">
        <Badge
          bg={themeColor.TAG_BG_COLOR}
          color={themeColor.PRIMARY_COLOR}
          borderRadius="md"
          px="0.5rem"
          py="0.25rem">
          <HStack spacing="0.25rem">
            <FiClock size={14} />
            <Text as="span">{formatDuration(timeDuration)}</Text>
          </HStack>
        </Badge>
        <Badge
          bg={themeColor.BG_COLOR_ORANGE}
          color={themeColor.QUESTION_COUNT_COLOR}
          borderRadius="md"
          px="0.5rem"
          py="0.25rem">
          <HStack spacing="0.25rem">
            <FiFileText size={14} />
            <Text as="span">
              {questionCount ?? 0} {INTERVIEW_CARD_CONSTANTS.QUESTIONS}
            </Text>
          </HStack>
        </Badge>
      </HStack>

      <Flex borderRadius="lg" overflow="hidden" mb="1.25rem">
        {STATS_LABELS.map(({ label, key }, idx) => {
          const value = stats?.[key] ?? 0;
          return (
            <Box
              key={label}
              flex="1"
              py="0.75rem"
              px="1rem"
              borderRightWidth={idx < 3 ? '1px' : '0'}
              borderColor={themeColor.STROKE_COLOR}
              textAlign="left">
              <Text
                fontSize="sm"
                color={themeColor.SECONDARY_TEXT_COLOR}
                mb="0.25rem">
                {label}
              </Text>
              <Text fontWeight="bold" fontSize="md" color="black">
                {value}
              </Text>
            </Box>
          );
        })}
      </Flex>

      <Stack
        direction="row"
        align="center"
        justify="space-between"
        borderTopWidth="1px"
        borderColor="gray.200"
        pt="1rem">
        <Text fontSize="sm" color={themeColor.SECONDARY_TEXT_COLOR}>
          {INTERVIEW_CARD_CONSTANTS.CREATED_ON}{' '}
          {getTextDateFullYearFromUTCDateVal(
            createdAt,
            timeZone,
            dateConstants.DATE_CONST_12,
          ) || '—'}
        </Text>
        <HStack spacing="0.5rem">
          <Tooltip label={INTERVIEW_CARD_CONSTANTS.EDIT_INTERVIEW}>
            <IconButton
              aria-label={INTERVIEW_CARD_CONSTANTS.EDIT_INTERVIEW}
              icon={<EditIcon />}
              size="md"
              variant="ghost"
              color={themeColor.PRIMARY_TEXT_COLOR}
            />
          </Tooltip>
          <Tooltip label={INTERVIEW_CARD_CONSTANTS.ADD_CANDIDATES}>
            <IconButton
              aria-label={INTERVIEW_CARD_CONSTANTS.ASSIGN_CANDIDATES}
              icon={<FiUserPlus />}
              size="md"
              variant="ghost"
              color={themeColor.PRIMARY_TEXT_COLOR}
              onClick={handleAddCandidate}
            />
          </Tooltip>
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label={INTERVIEW_CARD_CONSTANTS.MORE_ACTIONS}
              icon={<FiMoreVertical />}
              size="md"
              variant="ghost"
              color={themeColor.PRIMARY_TEXT_COLOR}
            />
            <MenuList>
              {isOpen ? (
                <MenuItem icon={<FiX />} onClick={handleToggleStatus}>
                  {INTERVIEW_CARD_CONSTANTS.CLOSE}
                </MenuItem>
              ) : (
                <MenuItem icon={<FiRefreshCw />} onClick={handleToggleStatus}>
                  {INTERVIEW_CARD_CONSTANTS.REOPEN}
                </MenuItem>
              )}
              <MenuItem icon={<FiEye />} onClick={handleView}>
                {INTERVIEW_CARD_CONSTANTS.VIEW}
              </MenuItem>
              <MenuItem icon={<FiShare2 />} onClick={handleShare}>
                {INTERVIEW_CARD_CONSTANTS.SHARE}
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Stack>
    </Box>
  );
};

InterviewCard.propTypes = {
  interview: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    department: PropTypes.string,
    time_duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    question_count: PropTypes.number,
    stats: PropTypes.shape({
      sent: PropTypes.number,
      given: PropTypes.number,
      shortlisted: PropTypes.number,
      pending: PropTypes.number,
    }),
    is_open: PropTypes.bool,
    created_at: PropTypes.string,
    candidate_link: PropTypes.string,
    link: PropTypes.string,
  }).isRequired,
};

export default InterviewCard;
