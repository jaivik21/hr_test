import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  Checkbox,
  Heading,
  HStack,
  Stack,
  Text,
  VStack,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Icon,
} from '@chakra-ui/react';
import { MdCameraAlt } from 'react-icons/md';
import screenSharingIcon from '../assets/Screen Sharing.svg';
import cameraAudioIcon from '../assets/Camera & Audio Setup.svg';
import identityVerificationIcon from '../assets/Identity Verification.svg';
import activityMonitoringIcon from '../assets/Activity Monitoring.svg';
import interviewEnvironmentIcon from '../assets/Interview Environment Rules.svg';
import connectionPerformanceIcon from '../assets/Connection & Performance.svg';
import systemCheckIcon from '../assets/System Check.svg';
import IconBox from '../components/candidate/IconBox';
import PreventBack from '../components/PreventBack/PreventBack';
import { uploadCandidateImageApi } from '../api/candidateService';
import { selectStartInterviewResponse } from '../redux/slices/candidateSlice';
import { showToast } from '../components/Toast/ShowToast';
import { TOAST_ERROR_STATUS, TOAST_SUCCESS_STATUS } from '../utils/constants/titleConstant';
import messages from '../utils/constants/messages';

const Instructions = () => {
  const [screenSharingChecked, setScreenSharingChecked] = useState(false);
  const [cameraChecked, setCameraChecked] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturingImage, setCapturingImage] = useState(false);
  const [imageCaptured, setImageCaptured] = useState(false);
  const [canRecapture, setCanRecapture] = useState(false);
  const [capturedImageFile, setCapturedImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const navigate = useNavigate();
  const videoRef = useRef(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Get response_id from Redux
  const startInterviewResponse = useSelector(selectStartInterviewResponse);
  const responseId = startInterviewResponse?.response_id || null;

  // 🖥 Screen Share Permission Logic
  const handleScreenShare = async (checked) => {
    if (checked) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "monitor" }, // request entire screen
          audio: true, // request system audio
        });

        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        const settings = videoTrack.getSettings();

        // Check for ENTIRE SCREEN (monitor)
        if (settings.displaySurface !== "monitor") {
          stream.getTracks().forEach((t) => t.stop());
          showToast(
            TOAST_ERROR_STATUS,
            messages.VALIDATION_ERROR,
            "You must choose **Entire Screen** (not Window/Tab).",
          );
          setScreenSharingChecked(false);
          return;
        }

        // Check for SYSTEM AUDIO
        if (!audioTrack) {
          stream.getTracks().forEach((t) => t.stop());
          showToast(
            TOAST_ERROR_STATUS,
            messages.VALIDATION_ERROR,
            "You must enable **System Audio** when sharing your screen.",
          );
          setScreenSharingChecked(false);
          return;
        }

        // If both are valid
        setScreenStream(stream);
        setScreenSharingChecked(true);

      } catch (err) {
        console.error(err);
        showToast(
          TOAST_ERROR_STATUS,
          messages.SOMETHING_WENT_WRONG_ERROR,
          "Screen sharing permission denied.",
        );
        setScreenSharingChecked(false);
      }
    } else {
      // If unchecked — stop tracks
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setScreenSharingChecked(false);
    }
  };


  // 🎥 Camera & Audio Permission Logic
  const handleCameraAudio = async (checked) => {
    if (checked) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setCameraStream(stream);
        setCameraChecked(true);
        // Open modal to capture image
        onOpen();
      } catch (err) {
        console.error(err);
        showToast(
          TOAST_ERROR_STATUS,
          messages.SOMETHING_WENT_WRONG_ERROR,
          'Camera or microphone permission denied.',
        );
        setCameraChecked(false);
      }
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }
      setCameraChecked(false);
      setImageCaptured(false);
      setCapturedImageFile(null);
      setCanRecapture(false);
      onClose();
    }
  };

  // Set video source when modal opens
  useEffect(() => {
    if (!isOpen || !cameraStream) {
      return;
    }

    // Delay ensures videoRef is mounted before we touch it
    setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;

      video.srcObject = cameraStream;
      video.muted = true; // required for autoplay permissions

      // Retry autoplay until it works
      const attemptPlay = () => {
        video.play().catch(() => {
          setTimeout(attemptPlay, 100);
        });
      };
      attemptPlay();
    }, 50);

    return () => {
      // Cleanup: clear video source when modal closes
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isOpen, cameraStream]);

  // Capture candidate image (without uploading)
  const handleCaptureImage = async () => {
    if (!videoRef.current || !responseId) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.SOMETHING_WENT_WRONG_ERROR,
        'Unable to capture image. Please try again.',
      );
      return;
    }

    // Prevent capturing if still in cooldown
    if (!canRecapture && imageCaptured) {
      return;
    }

    try {
      setCapturingImage(true);
      setCanRecapture(false);

      const video = videoRef.current;

      // Wait for video to be ready
      if (video.readyState < 2) {
        await new Promise((resolve) => {
          const onLoadedData = () => {
            video.removeEventListener('loadeddata', onLoadedData);
            resolve();
          };
          video.addEventListener('loadeddata', onLoadedData);
          setTimeout(() => {
            video.removeEventListener('loadeddata', onLoadedData);
            resolve();
          }, 2000);
        });
      }

      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;
      const ctx = canvas.getContext('2d');

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast(
            TOAST_ERROR_STATUS,
            messages.SOMETHING_WENT_WRONG_ERROR,
            'Failed to capture image. Please try again.',
          );
          setCapturingImage(false);
          return;
        }

        // Convert blob to File
        const imageFile = new File([blob], 'candidate-image.jpg', { type: 'image/jpeg' });
        
        // Store captured image
        setCapturedImageFile(imageFile);
        setImageCaptured(true);
        setCapturingImage(false);
        
        showToast(
          TOAST_SUCCESS_STATUS,
          'Success',
          'Image captured successfully!',
        );

        // Enable recapture after 3 seconds
        setTimeout(() => {
          setCanRecapture(true);
        }, 3000);
      }, 'image/jpeg', 0.95); // 95% quality
    } catch (err) {
      console.error('[ERROR] Error capturing candidate image:', err);
      showToast(
        TOAST_ERROR_STATUS,
        messages.SOMETHING_WENT_WRONG_ERROR,
        'Failed to capture image. Please try again.',
      );
      setCapturingImage(false);
    }
  };

  // Handle upload button click
  const handleUploadImage = async () => {
    if (!capturedImageFile || !responseId) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.SOMETHING_WENT_WRONG_ERROR,
        'No image captured. Please capture an image first.',
      );
      return;
    }

    try {
      setIsUploading(true);

      // Upload image using uploadCandidateImageApi
      const uploadResponse = await uploadCandidateImageApi(responseId, capturedImageFile);
      
      if (uploadResponse.error) {
        showToast(
          TOAST_ERROR_STATUS,
          messages.SOMETHING_WENT_WRONG_ERROR,
          uploadResponse.error || 'Failed to upload image. Please try again.',
        );
        setIsUploading(false);
      } else {
        showToast(
          TOAST_SUCCESS_STATUS,
          'Success',
          'Image uploaded successfully!',
        );
        setIsUploading(false);
        // Close modal after successful upload
        onClose();
      }
    } catch (err) {
      console.error('[ERROR] Error uploading candidate image:', err);
      showToast(
        TOAST_ERROR_STATUS,
        messages.SOMETHING_WENT_WRONG_ERROR,
        'Failed to upload image. Please try again.',
      );
      setIsUploading(false);
    }
  };

  // 🚀 Proceed Button Logic — start recording both
  const handleNavigate = async () => {
    if (!screenStream || !cameraStream) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.VALIDATION_ERROR,
        'Please allow both screen and camera access.',
      );
      return;
    }

    // Store streams in window for InterviewSetup to access
    // MediaStream objects cannot be serialized in React Router state
    window.__screenStream = screenStream;
    window.__cameraStream = cameraStream;

    // Navigate to interview setup
    navigate('/interviewSetup');
  };

  const isButtonEnabled = screenSharingChecked && cameraChecked;

  const requiredSteps = useMemo(
    () => [
      {
        id: 'screen',
        title: 'Screen Sharing',
        description:
          'You must share your full screen. Partial or window sharing will not be accepted.',
        icon: screenSharingIcon,
        isChecked: screenSharingChecked,
        onChange: handleScreenShare,
      },
      {
        id: 'camera',
        title: 'Camera & Audio Setup',
        description:
          'Ensure your face is clearly visible and centered. Keep your microphone on so the AI interviewer can hear you.',
        icon: cameraAudioIcon,
        isChecked: cameraChecked,
        onChange: handleCameraAudio,
      },
    ],
    [cameraChecked, screenSharingChecked]
  );


  const instructionsList = useMemo(
    () => [
      {
        id: 'identity',
        title: 'Identity Verification',
        description:
          'Your webcam will capture a photo for verification before starting the interview.',
        icon: identityVerificationIcon,
      },
      {
        id: 'monitoring',
        title: 'Activity Monitoring',
        description:
          'Avoid switching tabs or minimizing your window. Any suspicious activity may end your interview automatically.',
        icon: activityMonitoringIcon,
      },
      {
        id: 'environment',
        title: 'Interview Environment Rules',
        description:
          'Find a quiet, well-lit place. Maintain steady eye contact and respond naturally for best results.',
        icon: interviewEnvironmentIcon,
      },
      {
        id: 'connection',
        title: 'Connection & Performance',
        description:
          'Make sure you have a stable internet connection (at least 2 Mbps). Unstable connections may interrupt the session.',
        icon: connectionPerformanceIcon,
      },
      {
        id: 'system',
        title: 'System Check',
        description:
          'Run a quick test of your video, microphone, and permissions before clicking “Start Interview.”',
        icon: systemCheckIcon,
      },
    ],
    []
  );

  return (
    <>
      <PreventBack />

      {/* Image Capture Modal */}
      <Modal isOpen={isOpen} onClose={imageCaptured ? onClose : undefined} isCentered size="md" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent borderRadius="xl" p={0}>
          <VStack spacing={0} align="stretch">
            {/* Header Section */}
            <Box px={6} pt={6} align="center">
              <Heading size="md" color="primaryText" mb={1} fontWeight={600}>
                Profile Photo Capture
              </Heading>
              <Text color="secondaryText" fontSize="sm">
                Take a photo to continue with your interview
              </Text>
            </Box>

            {/* Camera Preview Section */}
            <ModalBody px={6} py={6}>
              <VStack spacing={4}>
                <Box
                  bg="white"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="stroke"
                  w="100%"
                  position="relative"
                  minH="400px"
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  overflow="hidden">
                  {/* Camera Preview Content */}
                  {cameraStream ? (
                    <Box
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      w="100%"
                      h="100%"
                      bg="black">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </Box>
                  ) : (
                    <VStack spacing={4} align="center" justify="center" flex="1" p={8}>
                      <Icon
                        as={MdCameraAlt}
                        w="64px"
                        h="64px"
                        color="primary.500"
                      />
                      <VStack spacing={1} align="center">
                        <Text color="primaryText" fontSize="md" fontWeight={600}>
                          Camera Preview
                        </Text>
                        <Text color="secondaryText" fontSize="sm" textAlign="center">
                          Position yourself in the frame
                        </Text>
                      </VStack>
                    </VStack>
                  )}
                </Box>
              </VStack>
            </ModalBody>

            {/* Footer Buttons */}
            <ModalFooter px={6} pb={6} pt={0}>
              <HStack spacing={3} w="100%">
                <Button
                  flex={1}
                  colorScheme="primary"
                  onClick={handleCaptureImage}
                  isLoading={capturingImage}
                  loadingText="Capturing..."
                  isDisabled={(!canRecapture && imageCaptured) || !responseId}
                  size="md"
                  height="40px">
                  {canRecapture && imageCaptured ? 'Recapture' : 'Capture'}
                </Button>
                <Button
                  flex={1}
                  variant="outline"
                  colorScheme="gray"
                  onClick={handleUploadImage}
                  isLoading={isUploading}
                  loadingText="Uploading..."
                  isDisabled={!imageCaptured || isUploading}
                  size="md"
                  height="40px"
                  borderColor="gray.300"
                  color="gray.700"
                  _hover={{
                    bg: 'gray.50',
                    borderColor: 'gray.400',
                  }}>
                  Upload
                </Button>
              </HStack>
            </ModalFooter>
          </VStack>
        </ModalContent>
      </Modal>

      <Box bg="secondary.100" minH="100vh" py={8} px={4}>
        <Box maxW="900px" mx="auto">
          <VStack spacing={3} textAlign="center" mb={8}>
            <Heading size="xl" color="primaryText" fontWeight={700}>
              Instructions for AI Interview
            </Heading>
            <Text color="secondaryText" fontSize="md">
              Please read all the instructions carefully and check each box before proceeding to your interview.
            </Text>
          </VStack>

          <Box
            bg="white"
            borderRadius="xl"
            borderWidth={1}
            borderColor="stroke"
            boxShadow="sm"
            p={{ base: 6, md: 8 }}>
            <VStack align="stretch" spacing={8}>
              <Box>
                <Heading size="md" color="primaryText" mb={4} fontWeight={600}>
                  Required Steps
                </Heading>
                <Stack spacing={4}>
                  {requiredSteps.map((step) => (
                    <Box
                      key={step.id}
                      borderWidth={1}
                      borderColor="stroke"
                      borderRadius="lg"
                      p={4}
                      gap="4px">
                      <Checkbox
                        colorScheme="primary"
                        isChecked={step.isChecked}
                        onChange={(e) => step.onChange(e.target.checked)}
                        alignItems="center">
                        <HStack spacing={3} align="center">
                          <IconBox
                            icon={step.icon}
                            alt={`${step.title} icon`}
                            size="48px"
                            iconSize="24px"
                            marginLeft={1.5}
                          />
                          <Box>
                            <Text fontWeight={600} color="primaryText">
                              {step.title}
                            </Text>
                            <Text color="secondaryText" fontSize="sm">
                              {step.description}
                            </Text>
                          </Box>
                        </HStack>
                      </Checkbox>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Box>
                <Heading size="md" color="primaryText" mb={4} fontWeight={600}>
                  Instructions
                </Heading>
                <VStack align="stretch" spacing={4}>
                  {instructionsList.map((item) => (
                    <Box
                      key={item.id}
                      borderWidth={1}
                      borderColor="stroke"
                      borderRadius="lg"
                      p={4}>
                      <HStack spacing={4} align="center">
                        <IconBox
                          icon={item.icon}
                          alt={`${item.title} icon`}
                          size="48px"
                          iconSize="24px"
                        />
                        <Box>
                          <Text fontWeight={600} color="primaryText" mb={1}>
                            {item.title}
                          </Text>
                          <Text color="secondaryText" fontSize="sm" lineHeight="1.6">
                            {item.description}
                          </Text>
                        </Box>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </Box>

              <Divider color="grayDisabled" height="2px" />

              <VStack spacing={3}>
                <Button
                  width="100%"
                  size="lg"
                  height="56px"
                  fontSize="md"
                  fontWeight={600}
                  color="white"
                  onClick={handleNavigate}
                  bg={isButtonEnabled ? 'primary.500' : 'grayDisabled'}
                  _hover={{
                    bg: isButtonEnabled ? 'primary.600' : 'grayDisabled',
                  }}
                  _active={{
                    bg: isButtonEnabled ? 'primary.700' : 'grayDisabled',
                  }}
                  isDisabled={!isButtonEnabled}>
                  Proceed to Interview
                </Button>
                <Text color="secondaryText" fontSize="xs" textAlign="center">
                  By proceeding, you agree to our AI interview terms and privacy policy.
                </Text>
              </VStack>
            </VStack>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Instructions;