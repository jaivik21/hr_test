import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  HStack,
  Flex,
  Radio,
  RadioGroup,
  Box,
  Link,
  Icon,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
} from '@chakra-ui/react';
import { useState, useRef, useEffect } from 'react';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { useDispatch } from 'react-redux';
import {
  themeColor,
  PHONE_CODE_OPTIONS,
} from '../../utils/constants/constants';
import { FiDownload } from 'react-icons/fi';
import { setLoadingState } from '../../redux/slices/loaderSlice';
import TextField from '../TextField/TextField';
import { SingleReactSelect } from '../SingleReactSelect/SingleReactSelect';
import {
  addCandidates,
  checkEmailHistory,
  bulkUploadCandidates,
} from '../../api/InterviewsService';
import { downloadFile } from '../../utils/helper';
import FileUpload from '../FileUpload/FileUpload';
import uploadIcon from '../../assets/images/upload-jd.svg';
import modals from '../../utils/constants/modals';
import { AiFillClockCircle } from 'react-icons/ai';
import { useCallback } from 'react';
import { showToast } from '../Toast/ShowToast';
import {
  TOAST_SUCCESS_STATUS,
  TOAST_ERROR_STATUS,
  TOAST_WARNING_STATUS,
} from '../../utils/constants/titleConstant';
import messages from '../../utils/constants/messages';
import Validation from '../../services/validation';
import PreviouslyAppearedCandidatesTable from './PreviouslyAppearedCandidatesTable';
import PreviewCandidatesTable from './PreviewCandidatesTable';

// eslint-disable-next-line no-unused-vars
const AddCandidateModal = NiceModal.create(({ interviewId, interviewName }) => {
  const modal = useModal();
  const dispatch = useDispatch();
  const [mode, setMode] = useState('single'); // 'single' or 'bulk'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneCode: '+91',
    phoneNumber: '',
  });
  const [errors, setErrors] = useState({});
  const [bulkCandidates, setBulkCandidates] = useState([]);
  const [previouslyAppearedCandidates, setPreviouslyAppearedCandidates] =
    useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [selectedPreviouslyAppeared, setSelectedPreviouslyAppeared] = useState(
    [],
  );
  const [showPreviouslyInterviewed, setShowPreviouslyInterviewed] =
    useState(false);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [candidateName, setCandidateName] = useState('');
  const emailCheckTimeoutRef = useRef(null);
  const [previewSortField, setPreviewSortField] = useState(null);
  const [previewSortDirection, setPreviewSortDirection] = useState('asc');
  const [previouslyAppearedSortField, setPreviouslyAppearedSortField] =
    useState(null);
  const [previouslyAppearedSortDirection, setPreviouslyAppearedSortDirection] =
    useState('asc');

  // Reset form when modal opens or mode changes
  useEffect(() => {
    if (modal.visible) {
      resetForm();
      setBulkCandidates([]);
      setPreviouslyAppearedCandidates([]);
      setSelectedCandidates([]);
      setSelectedPreviouslyAppeared([]);
      setErrors({});
      setShowPreviouslyInterviewed(false);
      setInterviewHistory([]);
      setCandidateName('');
      setPreviewSortField(null);
      setPreviewSortDirection('asc');
      setPreviouslyAppearedSortField(null);
      setPreviouslyAppearedSortDirection('asc');
    }

    // Cleanup timeout on unmount
    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, [modal.visible, mode]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phoneCode: '+91',
      phoneNumber: '',
    });
    setErrors({});
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }

    // Check if email matches previously appeared candidates
    if (name === 'email' && value) {
      // Clear previous timeout
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
      // Debounce the API call to avoid too many requests
      emailCheckTimeoutRef.current = setTimeout(() => {
        checkPreviouslyInterviewed(value);
      }, 500);
    }
  };

  const handlePhoneCodeChange = selectedOption => {
    setFormData(prev => ({
      ...prev,
      phoneCode: selectedOption ? selectedOption.value : '+91',
    }));
    if (errors.phoneCode) {
      setErrors(prev => ({
        ...prev,
        phoneCode: '',
      }));
    }
  };

  const checkPreviouslyInterviewed = async email => {
    const emailControl = { value: email || '' };
    const validatedControl = Validation.emailValidator(emailControl);
    if (validatedControl.invalidEmail || validatedControl.nullValue) {
      setShowPreviouslyInterviewed(false);
      setInterviewHistory([]);
      return;
    }

    try {
      const response = await checkEmailHistory(email);
      const data = response?.body;

      // Only show if ok is true AND is_given is strictly true AND interviews exist
      if (
        data &&
        data.ok === true &&
        data.is_given === true &&
        data.interviews &&
        data.interviews.length > 0
      ) {
        setShowPreviouslyInterviewed(true);
        // Use the name from form data, not email
        setCandidateName(formData.name || 'Candidate');
        // Map the API response to the format expected by the modal
        setInterviewHistory(
          data.interviews.map(interview => ({
            interview_name: interview.interview_name,
            given_date: interview.given_date,
          })),
        );
      } else {
        setShowPreviouslyInterviewed(false);
        setInterviewHistory([]);
      }
    } catch (error) {
      // If API fails, don't show the previously interviewed message
      setShowPreviouslyInterviewed(false);
      setInterviewHistory([]);
    }
  };

  const handleViewDetails = () => {
    NiceModal.show(modals.interviewHistoryModal, {
      candidateName: candidateName || formData.name || 'Candidate',
      interviewHistory: interviewHistory,
    });
  };

  const handleFileUpload = async file => {
    if (!file) return;

    const fileType = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx'].includes(fileType)) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.INVALID_FILE_FORMAT,
        messages.INVALID_FILE_FORMAT_MESSAGE,
      );
      return;
    }

    try {
      dispatch(setLoadingState(true));

      const response = await bulkUploadCandidates(interviewId, file);
      const data = response?.body;

      if (data && data.ok) {
        // Handle preview_list (can be empty)
        if (
          data.preview_list &&
          Array.isArray(data.preview_list) &&
          data.preview_list.length > 0
        ) {
          // Map preview_list to bulkCandidates format
          const candidates = data.preview_list.map((candidate, index) => ({
            id: index + 1,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone_number || candidate.phone,
            phone_number: candidate.phone_number || candidate.phone,
          }));

          setBulkCandidates(candidates);
          setSelectedCandidates(candidates.map(c => c.id));
        } else {
          // If preview_list is empty, clear bulk candidates
          setBulkCandidates([]);
          setSelectedCandidates([]);
        }

        // Check for previously appeared candidates from the response
        // Only show candidates where is_given is true
        if (
          data.previously_appeared &&
          Array.isArray(data.previously_appeared) &&
          data.previously_appeared.length > 0
        ) {
          const filteredCandidates = data.previously_appeared
            .filter(candidate => candidate.is_given === true)
            .map((candidate, index) => ({
              id: `prev-${index + 1}`,
              name: candidate.name,
              email: candidate.email,
              phone: candidate.phone_number || candidate.phone,
              phone_number: candidate.phone_number || candidate.phone,
              is_given: candidate.is_given,
            }));
          setPreviouslyAppearedCandidates(filteredCandidates);
          setSelectedPreviouslyAppeared(filteredCandidates.map(c => c.id));
        } else {
          setPreviouslyAppearedCandidates([]);
          setSelectedPreviouslyAppeared([]);
        }

        // Show success message
        const previewCount = data.preview_list?.length || 0;
        const previouslyAppearedCount =
          data.previously_appeared?.filter(c => c.is_given === true).length ||
          0;

        if (previewCount > 0) {
          showToast(
            TOAST_SUCCESS_STATUS,
            messages.FILE_UPLOADED_SUCCESSFULLY,
            `${previewCount} ${messages.CANDIDATES_FOUND}`,
          );
        } else if (previouslyAppearedCount > 0) {
          showToast(
            TOAST_SUCCESS_STATUS,
            messages.FILE_UPLOADED_SUCCESSFULLY,
            `${previouslyAppearedCount} previously appeared candidate${
              previouslyAppearedCount !== 1 ? 's' : ''
            } found`,
          );
        } else {
          showToast(
            TOAST_WARNING_STATUS,
            messages.FILE_UPLOADED_SUCCESSFULLY,
            'File uploaded but no candidates found in preview or previously appeared list.',
          );
        }
      } else {
        showToast(
          TOAST_ERROR_STATUS,
          messages.ERROR_UPLOADING_FILE,
          data?.message || messages.INVALID_RESPONSE_FROM_SERVER,
        );
      }
    } catch (error) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.ERROR_UPLOADING_FILE,
        error?.error || messages.PLEASE_CHECK_FILE_FORMAT,
      );
    } finally {
      dispatch(setLoadingState(false));
    }
  };

  // Sort handlers
  const handlePreviewSort = useCallback((field, direction) => {
    setPreviewSortField(field);
    setPreviewSortDirection(direction);
  }, []);

  const handlePreviouslyAppearedSort = useCallback((field, direction) => {
    setPreviouslyAppearedSortField(field);
    setPreviouslyAppearedSortDirection(direction);
  }, []);

  const handleAddCandidate = async () => {
    if (mode === 'single') {
      const newErrors = {};

      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }

      const emailControl = { value: formData.email || '' };
      const validatedEmailControl = Validation.emailValidator(emailControl);
      if (validatedEmailControl.nullValue) {
        newErrors.email = 'Email is required';
      } else if (validatedEmailControl.invalidEmail) {
        newErrors.email = 'Please enter a valid email';
      }

      const phoneControl = { value: formData.phoneNumber || '' };
      const validatedPhoneControl =
        Validation.validatePhoneNumber(phoneControl);
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone number is required';
      } else if (validatedPhoneControl.invalidPhone) {
        newErrors.phoneNumber = 'Please enter a valid 10-digit phone number';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      try {
        dispatch(setLoadingState(true));

        const candidateData = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone_number: `${formData.phoneCode}${formData.phoneNumber.trim()}`,
        };

        await addCandidates(interviewId, [candidateData]);

        showToast(
          TOAST_SUCCESS_STATUS,
          messages.CANDIDATE,
          messages.CANDIDATE_ADDED_SUCCESSFULLY,
        );

        // Reset form for next candidate
        resetForm();
        setShowPreviouslyInterviewed(false);
      } catch (error) {
        showToast(
          TOAST_ERROR_STATUS,
          messages.ERROR_ADDING_CANDIDATE,
          error?.error || messages.FAILED_TO_ADD_CANDIDATE,
        );
      } finally {
        dispatch(setLoadingState(false));
      }
    } else {
      // Check if there are any candidates selected (from preview or previously appeared)
      const hasPreviewSelections = selectedCandidates.length > 0;
      const hasPreviouslyAppearedSelections =
        selectedPreviouslyAppeared.length > 0;

      if (!hasPreviewSelections && !hasPreviouslyAppearedSelections) {
        showToast(
          TOAST_WARNING_STATUS,
          messages.NO_CANDIDATES_SELECTED,
          messages.PLEASE_SELECT_AT_LEAST_ONE_CANDIDATE,
        );
        return;
      }

      try {
        dispatch(setLoadingState(true));

        // Get selected candidates from preview list
        const previewCandidatesData = bulkCandidates
          .filter(candidate => selectedCandidates.includes(candidate.id))
          .map(candidate => {
            // Format phone number - use phone_number if available, otherwise phone
            let phoneNumber = candidate.phone_number || candidate.phone || '';
            // If phone number doesn't start with +, add default country code
            if (phoneNumber && !phoneNumber.startsWith('+')) {
              phoneNumber = `+91${phoneNumber}`; // Default to +91 if no country code
            }
            return {
              name: candidate.name,
              email: candidate.email,
              phone_number: phoneNumber,
            };
          });

        // Get selected candidates from previously appeared list
        const previouslyAppearedCandidatesData = previouslyAppearedCandidates
          .filter(candidate =>
            selectedPreviouslyAppeared.includes(candidate.id),
          )
          .map(candidate => {
            // Format phone number - use phone_number if available, otherwise phone
            let phoneNumber = candidate.phone_number || candidate.phone || '';
            // If phone number doesn't start with +, add default country code
            if (phoneNumber && !phoneNumber.startsWith('+')) {
              phoneNumber = `+91${phoneNumber}`; // Default to +91 if no country code
            }
            return {
              name: candidate.name,
              email: candidate.email,
              phone_number: phoneNumber,
            };
          });

        // Combine both lists
        const allSelectedCandidatesData = [
          ...previewCandidatesData,
          ...previouslyAppearedCandidatesData,
        ];

        if (allSelectedCandidatesData.length === 0) {
          showToast(
            TOAST_ERROR_STATUS,
            messages.ERROR_ADDING_CANDIDATES,
            'No valid candidates selected.',
          );
          return;
        }

        await addCandidates(interviewId, allSelectedCandidatesData);

        const totalCount = allSelectedCandidatesData.length;
        showToast(
          TOAST_SUCCESS_STATUS,
          `${totalCount} ${messages.CANDIDATES_ADDED_SUCCESSFULLY}`,
          messages.CANDIDATE_ADDED_SUCCESSFULLY,
        );

        // Reset bulk data
        setBulkCandidates([]);
        setSelectedCandidates([]);
        setPreviouslyAppearedCandidates([]);
        setSelectedPreviouslyAppeared([]);
        modal.hide();
      } catch (error) {
        showToast(
          TOAST_ERROR_STATUS,
          messages.ERROR_ADDING_CANDIDATES,
          error?.error || messages.FAILED_TO_ADD_CANDIDATES,
        );
      } finally {
        dispatch(setLoadingState(false));
      }
    }
  };

  const downloadSampleFile = () => {
    const csvContent =
      'Name,Email,Phone Number\nAmit Shah,amit.shah@gmail.com,9876543210\nPriya Mehta,priya.mehta@email.com,9123456789';
    downloadFile(csvContent, 'sample_candidates.csv', 'text/csv');
  };

  return (
    <Modal
      isOpen={modal.visible}
      onClose={() => modal.hide()}
      size="xl"
      isCentered
      closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent maxW="900px" maxH="90vh" overflowY="auto">
        <ModalHeader fontSize="xl" fontWeight="semibold">
          Add Candidates
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={6} align="stretch">
            {/* Radio Button Selection */}
            <RadioGroup value={mode} onChange={setMode}>
              <HStack spacing={6}>
                <Box
                  as="label"
                  cursor="pointer"
                  border="2px solid"
                  borderColor={
                    mode === 'single' ? themeColor.PRIMARY_COLOR : 'gray.300'
                  }
                  borderRadius="2xl"
                  p={4}
                  bg={mode === 'single' ? themeColor.TAG_BG_COLOR : 'white'}
                  _hover={{
                    borderColor: themeColor.PRIMARY_COLOR,
                  }}
                  w="100%">
                  <Radio
                    value="single"
                    colorScheme="primary"
                    color={
                      mode === 'single'
                        ? themeColor.WHITE_COLOR
                        : themeColor.PRIMARY_COLOR
                    }
                    variant="solid">
                    <Text
                      fontWeight={mode === 'single' ? 'semibold' : 'normal'}>
                      Add a Single Candidate
                    </Text>
                  </Radio>
                </Box>
                <Box
                  as="label"
                  cursor="pointer"
                  border="2px solid"
                  borderColor={
                    mode === 'bulk' ? themeColor.PRIMARY_COLOR : 'gray.300'
                  }
                  borderRadius="2xl"
                  p={4}
                  bg={mode === 'bulk' ? themeColor.TAG_BG_COLOR : 'white'}
                  _hover={{
                    borderColor: themeColor.PRIMARY_COLOR,
                  }}
                  w="100%">
                  <Radio value="bulk" colorScheme="primary">
                    <Text fontWeight={mode === 'bulk' ? 'semibold' : 'normal'}>
                      Add Candidates in Bulk
                    </Text>
                  </Radio>
                </Box>
              </HStack>
            </RadioGroup>

            {mode === 'single' ? (
              <VStack spacing={4} align="stretch">
                <TextField
                  label="Name"
                  name="name"
                  type="text"
                  value={formData.name}
                  handleChange={handleChange}
                  placeholder="Enter Candidate Name"
                  error={errors.name}
                />

                <FormControl isInvalid={errors.email}>
                  <Flex
                    direction="row"
                    align="center"
                    justify="space-between"
                    mb={2}>
                    <FormLabel fontSize="sm" fontWeight={400} mb={0}>
                      Email
                    </FormLabel>
                    {showPreviouslyInterviewed && (
                      <HStack spacing={2} align="center" flexShrink={0}>
                        <Icon
                          as={AiFillClockCircle}
                          color={themeColor.WARNING_COLOR}
                          boxSize={4}
                        />
                        <Text fontSize="sm" color={themeColor.WARNING_COLOR}>
                          Previously interviewed
                        </Text>
                        <Link
                          color={themeColor.PRIMARY_COLOR}
                          fontSize="sm"
                          fontWeight="semibold"
                          onClick={handleViewDetails}
                          textDecoration="underline"
                          _hover={{ textDecoration: 'underline' }}
                          cursor="pointer">
                          View Details
                        </Link>
                      </HStack>
                    )}
                  </Flex>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter Candidate Email"
                    borderColor={
                      errors.email ? themeColor.ERROR_COLOR : undefined
                    }
                    _focus={{
                      borderColor: errors.email
                        ? themeColor.ERROR_COLOR
                        : themeColor.PRIMARY_COLOR,
                    }}
                  />
                  {errors.email && (
                    <FormErrorMessage>{errors.email}</FormErrorMessage>
                  )}
                </FormControl>

                <Box>
                  <Text fontSize="sm" fontWeight={400} mb={2}>
                    Phone Number
                  </Text>
                  <HStack spacing={0} align="flex-start">
                    <Box w="100px">
                      <SingleReactSelect
                        name="phoneCode"
                        value={PHONE_CODE_OPTIONS.find(
                          opt => opt.value === formData.phoneCode,
                        )}
                        options={PHONE_CODE_OPTIONS}
                        onChange={handlePhoneCodeChange}
                        isClearable={false}
                        error={!!errors.phoneNumber || !!errors.phoneCode}
                        customStyle={{
                          control: (baseStyles, { isDisabled, isFocused }) => ({
                            ...baseStyles,
                            width: 'auto',
                            minHeight: '40px',
                            height: '40px',
                            borderWidth: '1px',
                            borderRadius: '0.375rem 0 0 0.375rem',
                            borderRight: 'none',
                            backgroundColor: themeColor.TAG_BG_COLOR,
                            '&:hover': {
                              borderColor: themeColor.PRIMARY_COLOR,
                            },
                            borderColor:
                              errors.phoneNumber || errors.phoneCode
                                ? themeColor.ERROR_COLOR
                                : isFocused
                                ? themeColor.PRIMARY_COLOR
                                : themeColor.STROKE_COLOR,
                            boxShadow: 'none',
                            opacity: isDisabled ? 0.4 : 1,
                            cursor: isDisabled ? 'not-allowed' : 'default',
                            pointerEvents: 'auto',
                          }),
                          indicatorSeparator: provided => ({
                            ...provided,
                            display: 'none',
                          }),
                          valueContainer: provided => ({
                            ...provided,
                            minHeight: '40px',
                            height: '40px',
                            padding: '0 8px',
                            textOverflow: 'ellipsis',
                          }),
                          indicatorsContainer: provided => ({
                            ...provided,
                            minHeight: '40px',
                            height: '40px',
                            padding: '0 4px',
                          }),
                          menu: provided => ({
                            ...provided,
                            zIndex: 99,
                            width: '250px',
                          }),
                        }}
                      />
                    </Box>
                    <Box flex={1}>
                      <TextField
                        name="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        handleChange={handleChange}
                        placeholder="Phone Number"
                        error=""
                        noGap
                        inputProps={{
                          borderRadius: '0 0.375rem 0.375rem 0',
                          borderLeft: 'none',
                          borderColor: errors.phoneNumber
                            ? themeColor.ERROR_COLOR
                            : undefined,
                          _focus: {
                            borderLeft: 'none',
                            borderColor: errors.phoneNumber
                              ? themeColor.ERROR_COLOR
                              : themeColor.PRIMARY_COLOR,
                          },
                          _hover: {
                            borderLeft: 'none',
                          },
                        }}
                      />
                    </Box>
                  </HStack>
                  {(errors.phoneNumber || errors.phoneCode) && (
                    <Text fontSize="sm" color="red.500" mt={1}>
                      {errors.phoneNumber || errors.phoneCode}
                    </Text>
                  )}
                </Box>
              </VStack>
            ) : (
              <VStack spacing={4} align="stretch">
                {/* File Upload Area */}
                <Box
                  border="2px dashed"
                  borderColor="gray.300"
                  borderRadius="lg"
                  p={10}
                  textAlign="center"
                  bg="white"
                  _hover={{
                    borderColor: themeColor.PRIMARY_COLOR,
                    bg: 'gray.50',
                  }}>
                  <Flex justify="center" align="center" mb={4}>
                    <FileUpload
                      onFileChange={handleFileUpload}
                      acceptedFileType=""
                      fileAccept=".csv,.xlsx"
                      uploadIcon={uploadIcon}
                      iconAlt="Upload candidate file"
                      iconWidth="34px"
                      iconHeight="64px"
                      tooltip="Upload candidate file (CSV or XLSX)"
                      showFileInfo={true}
                      uploadedFile={null}
                      invalidFileTitle={messages.INVALID_FILE_FORMAT}
                      invalidFileMessage={messages.INVALID_FILE_FORMAT_MESSAGE}
                      fileUploadedTitle={messages.FILE_UPLOADED_SUCCESSFULLY}
                      fileUploadedMessage={fileName =>
                        `${fileName} uploaded successfully`
                      }
                      showSuccessToast={false}
                    />
                  </Flex>
                  <Text fontWeight="semibold" fontSize="md" mb={2}>
                    Click to upload your file
                  </Text>
                  <Text fontSize="sm" color="gray.600" mb={3}>
                    Supported formats: .csv, .xlsx
                  </Text>
                </Box>

                <Text fontSize="sm" color="gray.600" textAlign="center" mb={3}>
                  Each row should include: Name, Email, and Phone Number
                </Text>

                <HStack justify="center">
                  <Box
                    as={FiDownload}
                    boxSize={5}
                    color={themeColor.PRIMARY_COLOR}
                  />
                  <Link
                    color={themeColor.PRIMARY_COLOR}
                    onClick={downloadSampleFile}
                    fontSize="sm"
                    _hover={{ textDecoration: 'underline' }}
                    cursor="pointer">
                    Download sample file (.csv)
                  </Link>
                </HStack>

                <PreviewCandidatesTable
                  candidates={bulkCandidates}
                  selectedRows={selectedCandidates}
                  setSelectedRows={setSelectedCandidates}
                  sortField={previewSortField}
                  sortDirection={previewSortDirection}
                  onSort={handlePreviewSort}
                />

                <PreviouslyAppearedCandidatesTable
                  candidates={previouslyAppearedCandidates}
                  selectedRows={selectedPreviouslyAppeared}
                  setSelectedRows={setSelectedPreviouslyAppeared}
                  sortField={previouslyAppearedSortField}
                  sortDirection={previouslyAppearedSortDirection}
                  onSort={handlePreviouslyAppearedSort}
                />
              </VStack>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button
            bg={themeColor.PRIMARY_COLOR}
            color={themeColor.WHITE_COLOR}
            _hover={{ bg: themeColor.PRIMARY_COLOR }}
            onClick={handleAddCandidate}
            isDisabled={
              mode === 'bulk' &&
              bulkCandidates.length === 0 &&
              previouslyAppearedCandidates.length === 0
            }>
            {mode === 'single'
              ? 'Add Candidate'
              : selectedCandidates.length > 0 ||
                selectedPreviouslyAppeared.length > 0
              ? `Add ${
                  selectedCandidates.length + selectedPreviouslyAppeared.length
                } Candidate${
                  selectedCandidates.length +
                    selectedPreviouslyAppeared.length !==
                  1
                    ? 's'
                    : ''
                }`
              : 'Add Candidates'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
});

export default AddCandidateModal;
