import {
  Box,
  Button,
  Flex,
  IconButton,
  SimpleGrid,
  Tab,
  TabList,
  Tabs,
  Text,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiFilter, FiSearch, FiPlus } from 'react-icons/fi';
import InterviewCard from '../components/interviews/InterviewCard';
import {
  themeColor,
  INTERVIEW_TABS,
  INTERVIEW_TAB_LABELS,
  InterviewTabs,
} from '../utils/constants/constants';
import { fetchInterviews } from '../redux/slices/interviewsSlice';
import routePaths from '../routes/routePaths';
import messages from '../utils/constants/messages';
import TextField from '../components/TextField/TextField';

const InterviewDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const interviews = useSelector(state => state.interviews.interviews || []);
  const [activeTab, setActiveTab] = useState(InterviewTabs.ALL);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(fetchInterviews());
  }, [dispatch]);

  const filteredInterviews = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    // Filter by tab
    let filtered = interviews;
    if (activeTab === InterviewTabs.OPEN) {
      filtered = interviews.filter(interview => Boolean(interview?.is_open));
    } else if (activeTab === InterviewTabs.CLOSE) {
      filtered = interviews.filter(interview => !interview?.is_open);
    }

    // Filter by search term
    if (normalizedSearch) {
      filtered = filtered.filter(interview =>
        (interview?.name || '').toLowerCase().includes(normalizedSearch),
      );
    }

    return filtered;
  }, [interviews, activeTab, searchTerm]);

  const handleTabChange = useCallback(index => {
    setActiveTab(INTERVIEW_TABS[index]);
  }, []);

  const handleSearchChange = useCallback(event => {
    setSearchTerm(event.target.value);
  }, []);

  return (
    <Box px={{ base: '1rem', md: '2rem' }} py="2rem">
      <Flex
        direction={{ base: 'column', md: 'row' }}
        align={{ base: 'flex-start', md: 'center' }}
        gap={{ base: '1rem', md: '1.5rem' }}
        mb="2rem"
        w="100%">
        <Tabs
          variant="solid"
          index={INTERVIEW_TABS.indexOf(activeTab)}
          onChange={handleTabChange}
          colorScheme={themeColor.PRIMARY_COLOR}
          bg={themeColor.TAG_BG_COLOR}>
          <TabList gap="0.5rem">
            {INTERVIEW_TAB_LABELS.map(label => (
              <Tab
                key={label}
                _selected={{
                  bg: themeColor.PRIMARY_COLOR,
                  color: themeColor.WHITE_COLOR,
                  boxShadow: 'md',
                }}>
                {label}
              </Tab>
            ))}
          </TabList>
        </Tabs>

        <Flex
          align="center"
          gap={{ base: '0.75rem', md: '1rem' }}
          ml={{ base: 0, md: 'auto' }}
          w={{ base: '100%', md: 'auto' }}>
          <IconButton
            aria-label="Filter interviews"
            icon={<FiFilter />}
            variant="ghost"
            color={themeColor.SECONDARY_TEXT_COLOR}
          />
          <Box w={{ base: '100%', md: '260px' }}>
            <TextField
              name="search"
              type="text"
              value={searchTerm}
              handleChange={handleSearchChange}
              placeholder="Search by Interview Name"
              icon={<FiSearch color={themeColor.SECONDARY_TEXT_COLOR} />}
              noGap={true}
              inputProps={{
                bg: themeColor.INPUT_BG_COLOR || 'white',
              }}
            />
          </Box>
          <Button
            leftIcon={<FiPlus />}
            bg={themeColor.PRIMARY_COLOR}
            color={themeColor.WHITE_COLOR}
            px="1.5rem"
            w={{ base: '100%', sm: 'auto' }}
            _hover={{ bg: themeColor.PRIMARY_COLOR }}
            onClick={() => navigate(routePaths.createInterview)}>
            Create
          </Button>
        </Flex>
      </Flex>

      <Box py="2rem">
        {filteredInterviews.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            minH="200px"
            textAlign="center"
            color="gray.500"
            gap="0.5rem">
            <Text fontSize="sm">{messages.NO_INTERVIEWS_FOUND}</Text>
          </Flex>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing="1.5rem">
            {filteredInterviews.map(interview => (
              <InterviewCard
                key={interview?.id || interview?.name}
                interview={interview}
              />
            ))}
          </SimpleGrid>
        )}
      </Box>
    </Box>
  );
};

export default InterviewDashboard;
