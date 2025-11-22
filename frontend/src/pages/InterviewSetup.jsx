import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import clockIcon from '../assets/Clock.svg';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import {
  selectInterviewDetails,
  selectCandidateEmail,
  selectCandidateName,
  selectStartInterviewResponse,
} from '../redux/slices/candidateSlice';
import {
  startInterviewApi,
  getCurrentQuestionApi,
  submitAnswerApi,
  endInterviewApi,
  updateTabSwitchCountApi,
  uploadCandidateVideoApi,
} from '../api/candidateService';
import { API_URL } from '../config/config';
import Loader from '../components/Loader/Loader';
import ConversationMessage from '../components/candidate/ConversationMessage';
import PreventBack from '../components/PreventBack/PreventBack';
import useCheatDetect from "../hooks/useCheatDetect";
import { showToast } from '../components/Toast/ShowToast';
import { TOAST_ERROR_STATUS } from '../utils/constants/titleConstant';
import messages from '../utils/constants/messages';

const InterviewSetup = () => {
  const navigate = useNavigate();

  // recording refs
  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const micStreamRef = useRef(null);

  // access stored media streams from window (set previously in Instructions)
  const screenStreamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const videoRef = useRef(null);
  const [hasCameraStream, setHasCameraStream] = useState(!!window.__cameraStream);

  // NEW state for interview flow
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const [responseIdState, setResponseIdState] = useState(null); // local copy of response_id
  const interviewIdRef = useRef(null); // store interview_id for reinitializing STT
  const sttSessionActiveRef = useRef(false); // track if STT session is active
  const chunkIndexRef = useRef(0);
  const timerIntervalRef = useRef(null); // Timer interval reference
  const screenRecorderRef = useRef(null);
  const screenChunksRef = useRef([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(null); // Time remaining in seconds
  const [cheatCount, setCheatCount] = useState(0);

  // selectors
  const interviewDetails = useSelector(selectInterviewDetails);
  const candidateEmail = useSelector(selectCandidateEmail);
  const candidateNameFromRedux = useSelector(selectCandidateName);
  const startInterviewResponse = useSelector(selectStartInterviewResponse);

  // Extract interview_id and response_id from startInterviewResponse
  const interviewIdFromResponse = startInterviewResponse?.interview_id || null;
  const responseIdFromResponse = startInterviewResponse?.response_id || null;

  // Get candidate name from Redux, with fallback
  const candidateName = candidateNameFromRedux || 'Candidate';

  // helper: compute initials from name
  const getInitials = name => {
    if (!name || typeof name !== 'string') return 'U';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    const first = parts[0][0];
    const last = parts[parts.length - 1][0];
    return (first + last).toUpperCase();
  };

  const userInitials = getInitials(candidateName);

  useCheatDetect(() => {
    setCheatCount(prev => prev + 1);
  });

  // Initialize streams from window properties
  useEffect(() => {
    if (window.__screenStream) {
      screenStreamRef.current = window.__screenStream;
    }
    if (window.__cameraStream) {
      cameraStreamRef.current = window.__cameraStream;
      setHasCameraStream(true);
      if (videoRef.current) {
        videoRef.current.srcObject = window.__cameraStream;
        videoRef.current.play().catch(() => {
          /* autoplay might be blocked */
        });
      }
    } else {
      setHasCameraStream(false);
    }

    // Cleanup on unmount - we will stop recorders/sockets there
    return () => {
      // do not stop window streams here; cleanup below will handle recorders & socket
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [currentTime, setCurrentTime] = useState('');

  const update = () => {
    const now = new Date();
    const formatted = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    setCurrentTime(formatted);
  };

  useEffect(() => {
    update(); // set immediately
    const interval = setInterval(update, 1000); // update every second

    return () => clearInterval(interval);
  }, []);

  // Helper to get current time string (used when creating conversation entries)
  const getCurrentTimeString = () => {
    const now = new Date();
    return now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format time remaining as MM:SS or HH:MM:SS
  const formatTime = (seconds) => {
    if (seconds === null || seconds < 0) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer countdown effect - auto-end interview when time reaches 0
  useEffect(() => {
    // Initialize timer from Redux duration_minutes
    if (timeRemaining === null && startInterviewResponse?.duration_minutes) {
      const totalSeconds = startInterviewResponse.duration_minutes * 60;
      setTimeRemaining(totalSeconds);
      return;
    }

    // Stop timer if time is up
    if (timeRemaining === null || timeRemaining <= 0) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    // Start countdown timer
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timeRemaining, startInterviewResponse?.duration_minutes]);

  // Auto-end interview when timer reaches 0
  useEffect(() => {
    if (timeRemaining === 0 && responseIdState) {
      // Useful for debugging timer auto-end functionality
      console.log('[TIMER] Time reached 0, ending interview automatically');
      // Clear timer first
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      // End interview
      handleStopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, responseIdState]);

  // ---------- HELPERS ----------

  // Convert blob to base64 - robust method
  const blobToBase64 = blob => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = reader.result;
          if (!result || !(result instanceof ArrayBuffer)) {
            throw new Error(`FileReader returned invalid result type: ${typeof result}`);
          }
          const bytes = new Uint8Array(result);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
            for (let j = 0; j < chunk.length; j++) {
              binary += String.fromCharCode(chunk[j]);
            }
          }
          const base64 = btoa(binary);
          resolve(base64);
        } catch (err) {
          console.error('[ERROR] Error in blobToBase64:', err);
          reject(err);
        }
      };
      reader.onerror = error => {
        console.error('[ERROR] FileReader error:', error);
        reject(new Error(`Failed to read blob: ${error}`));
      };
      reader.readAsArrayBuffer(blob);
    });
  };

  // Play TTS base64 - simplified approach matching working version
  const playTTSAudio = base64Audio => {
    try {
      if (!base64Audio) return;
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = (e) => {
        console.error('[ERROR] Audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
      };
      audio.play().catch(err => {
        console.error('[ERROR] Error playing TTS audio:', err);
      });
    } catch (err) {
      console.error('[ERROR] Error processing TTS audio:', err);
    }
  };

  // ---------- SOCKET + INTERVIEW START LOGIC ----------

  useEffect(() => {
    let mounted = true;

    // Start interview immediately on mount (per your instruction)
    const initInterview = async () => {
      try {
        setLoading(true);

        const interviewId =
          interviewIdFromResponse ||
          interviewDetails?.id;
        if (!interviewId) {
          throw new Error('Interview ID missing from store');
        }

        // Store interviewId in ref for later use
        interviewIdRef.current = interviewId;

        const candidateEmailLocal =
          candidateEmail ||
          (interviewDetails && interviewDetails.candidate_email) ||
          startInterviewResponse?.candidate_email ||
          startInterviewResponse?.email ||
          '';
        const candidateNameLocal = candidateNameFromRedux || candidateEmailLocal || 'Candidate';

        // Call startInterviewApi
        const startResp = await startInterviewApi(interviewId, candidateNameLocal, candidateEmailLocal);

        if (startResp.error) {
          throw new Error(startResp.error || 'Failed to start interview');
        }

        const responseData = startResp.body || startResp;
        const response_id =
          responseIdFromResponse ||
          responseData?.response_id ||
          responseData?.data?.response_id ||
          responseData?.responseId ||
          null;

        if (!response_id) {
          console.warn('startInterviewApi returned:', startResp);
          throw new Error('Failed to start interview (no response_id)');
        }

        // Save into local state (for backward compatibility with existing code)
        setResponseIdState(response_id);

        let socketUrl = API_URL || '';
        const socket = io(socketUrl, {
          transports: ["websocket"],
          path: "/socket.io",
        });

        socketRef.current = socket;

        // Function to establish/re-establish STT session
        // MATCHING WORKING TSX: Only mark active when backend confirms with ack.ok === true
        const establishSTTSession = (resId, intId) => {
          if (!intId || !resId) {
            console.warn('[WARN] Cannot establish STT session: missing interview_id or response_id');
            return;
          }

          // Useful for debugging STT session establishment process
          console.log('[DEBUG] Establishing STT session...', { interview_id: intId, response_id: resId });

          sttSessionActiveRef.current = false;

          // Emit start_interview and wait for ack callback
          socket.emit(
            'start_interview',
            {
              interview_id: intId,
              response_id: resId,
            },
            (ack) => {
              // Useful for debugging start_interview ACK responses
              console.log('[SOCKET] start_interview ack:', ack);
              if (!ack) {
                // If backend doesn't supply an ack object, treat as failure (TSX expects ack.ok true)
                console.error('[ERROR] start_interview ack missing or falsy. Not marking session active.');
                return;
              }
              if (ack.ok === true) {
                sttSessionActiveRef.current = true;
                // Useful for debugging successful STT session establishment
                console.log('[DEBUG] STT session established successfully');

                // Start screen recording ONLY AFTER STT is active
                if (window.__screenStream) {
                  try {
                    startScreenRecording(resId, window.__screenStream);
                  } catch (e) {
                    console.warn('startScreenRecording failed:', e);
                  }
                }
              } else {
                sttSessionActiveRef.current = false;
                console.error('[ERROR] Failed to establish STT session:', ack.error);
              }
            }
          );
        };

        socket.on('connect', () => {
          // Useful for debugging socket connection events
          console.log('[SOCKET] connected', socket.id);
          setSocketConnected(true);

          // On connect (or reconnect) establish / re-establish session
          const resId = responseIdState || response_id;
          const intId = interviewIdRef.current || interviewId;

          if (intId && resId) {
            establishSTTSession(resId, intId);
          } else {
            console.warn('[WARN] Cannot establish STT session on connect: missing IDs', { intId, resId });
          }
        });

        socket.on('disconnect', reason => {
          // Useful for debugging socket disconnection events
          console.log('[SOCKET] disconnected', reason);
          setSocketConnected(false);
          sttSessionActiveRef.current = false; // Session is lost on disconnect
        });

        // Transcript partials
        socket.on('partial_transcript', msg => {
          const text = msg && msg.text ? msg.text : typeof msg === 'string' ? msg : '';
          const is_final = !!(msg && msg.is_final);
          if (is_final) {
            setTranscript(prev => (prev ? prev + ' ' : '') + text);
            setPartialTranscript('');
            setConversation(prev => [
              ...prev,
              {
                id: Date.now(),
                sender: userInitials,
                time: getCurrentTimeString(),
                message: text,
              },
            ]);
          } else {
            setPartialTranscript(text);
          }
        });

        // Final transcript result
        socket.on('transcript_result', msg => {
          const text = msg && msg.text ? msg.text : typeof msg === 'string' ? msg : '';
          setTranscript(prev => (prev ? prev + ' ' : '') + text);
          setPartialTranscript('');
          if (text && text.trim()) {
            setConversation(prev => [
              ...prev,
              {
                id: Date.now(),
                sender: userInitials,
                time: getCurrentTimeString(),
                message: text,
              },
            ]);
          }
        });

        socket.on('video_chunk_saved', msg => {
          // backend acknowledges saved chunk
        });

        socket.on('error', err => {
          console.warn('[SOCKET] error', err);
          if (err && err.error) {
            showToast(
              TOAST_ERROR_STATUS,
              messages.SOMETHING_WENT_WRONG_ERROR,
              err.error,
            );
          }
        });

        // Fetch current question immediately after start
        try {
          const qResp = await getCurrentQuestionApi(response_id);
          if (qResp.error) {
            throw new Error(qResp.error);
          }

          const data = qResp.body || qResp.data || qResp || {};
          if (data.complete === true || data.interview_complete === true) {
            navigate('/ThankYou');
            return;
          }

          const questionText =
            typeof data.current_question === 'string'
              ? data.current_question
              : data.current_question?.question || data.current_question?.text || '';

          if (mounted) {
            setCurrentQuestion(questionText || '');
            setQuestionNumber(data.question_number || 0);
            setTotalQuestions(data.total_questions || 0);

            if (questionText) {
              setConversation([
                {
                  id: 1,
                  sender: 'AI',
                  time: getCurrentTimeString(),
                  message: questionText,
                },
              ]);
            }

            if (data.tts_audio_base64) {
              playTTSAudio(data.tts_audio_base64);
            }
          }
        } catch (e) {
          console.warn('Failed to fetch current question after start:', e);
        }

      } catch (err) {
        console.error('initInterview error', err);
        showToast(
          TOAST_ERROR_STATUS,
          messages.SOMETHING_WENT_WRONG_ERROR,
          err?.message || 'Failed to initialize interview',
        );
      } finally {
        setLoading(false);
      }
    };
    initInterview();

    return () => {
      mounted = false;
      // cleanup: stop timer, mic recorder, screen recorder, socket
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) { }
      try {
        if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
          screenRecorderRef.current.stop();
        }
      } catch (e) { }

      const s = socketRef.current;
      if (s) {
        try {
          s.disconnect();
        } catch (e) { }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- SCREEN RECORDING & CHUNK SEND ----------

  // Uses existing stream (window.__screenStream) and splits into chunks; emits save_video_chunk with base64 chunk
  const startScreenRecording = async (resId, useExistingStream) => {
    try {
      if (!useExistingStream) throw new Error('No screen stream provided');

      // Prevent re-starting if already recording or if recorder exists
      if (screenRecorderRef.current) {
        const state = screenRecorderRef.current.state;
        if (state === 'recording' || state === 'paused') {
          // Useful for debugging screen recorder state
          console.log('Screen recorder already running, skipping start');
          return;
        }
        try {
          if (screenRecorderRef.current.state !== 'inactive') {
            screenRecorderRef.current.stop();
          }
        } catch (e) { }
        screenRecorderRef.current = null;
      }

      const finalStream = useExistingStream;
      const preferred = 'video/webm;codecs=vp9,opus';
      const mime =
        MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(preferred)
          ? preferred
          : 'video/webm';

      const recorder = new MediaRecorder(finalStream, { mimeType: mime });
      screenRecorderRef.current = recorder;
      screenChunksRef.current = [];
      chunkIndexRef.current = 0;

      recorder.ondataavailable = async e => {
        try {
          if (!e.data || e.data.size === 0) return;
          const index = chunkIndexRef.current;
          screenChunksRef.current.push(e.data);

          const socket = socketRef.current;
          if (socket && socket.connected && resId) {
            try {
              const base64 = await blobToBase64(e.data);
              const mimeType = e.data.type || mime;
              const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
              socket.emit(
                'save_video_chunk',
                {
                  response_id: resId,
                  chunk: base64,
                  file_extension: ext,
                  chunk_index: index,
                },
                ack => {
                  // optional ack handler
                }
              );
            } catch (err) {
              console.error('[ERROR] Failed to convert/send video chunk:', err);
            }
          } else {
            console.warn('Socket not connected - queued chunk', index);
          }
          chunkIndexRef.current = index + 1;
        } catch (err) {
          console.error('screen ondataavailable error', err);
        }
      };

      recorder.onstart = () => {
        // Useful for debugging screen recorder start events
        console.log('screen recorder started');
      };

      recorder.onstop = () => {
        // Useful for debugging screen recorder stop events
        console.log('screen recorder stopped');
      };

      // Start with 2s timeslice similar to InterviewSession to get EBML header early
      recorder.start(2000);

      // Request initial data for chunk 0 shortly after start to grab header
      setTimeout(() => {
        try {
          if (recorder.state === 'recording') {
            recorder.requestData();
          }
        } catch (e) {
          // ignore
        }
      }, 500);
    } catch (e) {
      console.error('startScreenRecording error', e);
      throw e;
    }
  };

  // Request any remaining data and wait a bit to ensure chunks are sent
  const sendVideoIfRecording = async resId => {
    try {
      const recorder = screenRecorderRef.current;
      if (!recorder) {
        // Useful for debugging missing recorder when sending video
        console.log('sendVideoIfRecording: No recorder found');
        return;
      }
      if (recorder.state === 'recording') {
        try {
          recorder.requestData();
        } catch (e) { }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      // Useful for debugging video chunk sending completion
      console.log('sendVideoIfRecording: finished waiting for chunks');
    } catch (e) {
      console.error('sendVideoIfRecording error', e);
    }
  };

  // ---------- AUDIO RECORDING (mic) ----------

  const startMicStreaming = async () => {
    if (!socketRef.current || !socketRef.current.connected) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.NETWORK_ERROR,
        'Socket not connected yet. Please wait a moment and try again.',
      );
      return;
    }

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      const mediaRecorder = new MediaRecorder(micStream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async event => {
        try {
          if (!event.data || event.data.size === 0) return;
          if (!socketRef.current || !socketRef.current.connected) {
            console.warn('[WARN] Socket not connected, skipping audio chunk');
            return;
          }

          // Do NOT send audio until STT session is active (TSX behavior)
          if (!sttSessionActiveRef.current) {
            console.warn('[WARN] STT session not active, skipping audio chunk');
            return;
          }

          const arrayBuffer = await event.data.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          socketRef.current.emit('send_audio_chunk', uint8Array, (response) => {
            if (response && !response.ok) {
              console.error('[ERROR] Failed to send audio chunk:', response);
              if (response.error && response.error.includes('No active session')) {
                console.warn('[WARN] STT session lost - marking as inactive');
                sttSessionActiveRef.current = false;
              }
            }
          });
          // Useful for debugging audio chunk sending success
          console.log('[DEBUG] Sent audio chunk to backend, size:', arrayBuffer.byteLength);
        } catch (e) {
          console.error('ondataavailable send audio chunk error', e);
        }
      };

      mediaRecorder.onstop = () => {
        try {
          micStream.getTracks().forEach(t => t.stop());
        } catch (e) {
          /* ignore */
        }
      };

      mediaRecorder.start(250); // small timeslice for low-latency STT
      setIsRecording(true);
      setTranscript('');
      setPartialTranscript('');
    } catch (err) {
      console.error('startMicStreaming error', err);
      showToast(
        TOAST_ERROR_STATUS,
        messages.SOMETHING_WENT_WRONG_ERROR,
        'Could not access microphone. Please check permissions.',
      );
    }
  };

  const stopMicStreaming = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
    } catch (e) {
      console.warn('stopMicStreaming error', e);
    } finally {
      setIsRecording(false);
    }
  };

  // ---------- BUTTON HANDLERS ----------

  const handleStartRecording = async () => {
    // start mic only; STT must already be active (we assume user started after setup)
    if (!sttSessionActiveRef.current) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.NETWORK_ERROR,
        'STT session not active yet. Please wait a moment.',
      );
      return;
    }
    await startMicStreaming();
  };

  const handleSubmitAnswer = async () => {
    if (!responseIdState) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.SOMETHING_WENT_WRONG_ERROR,
        'No response id available.',
      );
      return;
    }
    setLoading(true);
    try {
      // Stop mic (if recording)
      stopMicStreaming();

      // Submit answer via API - send transcript BEFORE clearing it
      const submitResp = await submitAnswerApi(responseIdState, currentQuestion, transcript || '');

      if (submitResp.error) {
        throw new Error(submitResp.error || 'Failed to submit answer');
      }

      setTranscript('');
      setPartialTranscript('');

      const data = submitResp.body || submitResp.data || submitResp || {};
      if (data.complete || data.interview_completed) {
        navigate('/ThankYou');
        return;
      } else {
        // fetch current question again
        try {
          const qResp = await getCurrentQuestionApi(responseIdState);

          if (qResp.error) {
            throw new Error(qResp.error);
          }

          const qData = qResp.body || qResp.data || qResp || {};
          const questionText =
            typeof qData.current_question === 'string'
              ? qData.current_question
              : qData.current_question?.question || qData.current_question?.text || '';
          setCurrentQuestion(questionText || '');
          setQuestionNumber(qData.question_number || 0);
          setTotalQuestions(qData.total_questions || 0);

          if (questionText) {
            setConversation(prev => [
              ...prev,
              {
                id: Date.now(),
                sender: 'AI',
                time: getCurrentTimeString(),
                message: questionText,
              },
            ]);
          }

          if (qData.tts_audio_base64) {
            playTTSAudio(qData.tts_audio_base64);
          }

          // Reinitialize STT for next question — again wait for ack.ok === true
          try {
            if (socketRef.current && socketRef.current.connected && interviewIdRef.current && responseIdState) {
              // Useful for debugging STT session reinitialization
              console.log('[DEBUG] Reinitializing STT session for next question...', {
                interview_id: interviewIdRef.current,
                response_id: responseIdState
              });

              sttSessionActiveRef.current = false;

              socketRef.current.emit('start_interview', {
                interview_id: interviewIdRef.current,
                response_id: responseIdState,
              }, (ack) => {
                // Useful for debugging reinitialize ACK responses
                console.log('[SOCKET] start_interview ack (reinitialize):', ack);
                if (!ack) {
                  console.error('[ERROR] No ACK received for start_interview reinitialize');
                  return;
                }
                if (ack.ok === true) {
                  // Useful for debugging successful STT reinitialization
                  console.log('[DEBUG] ✅ STT session reinitialized for next question');
                  sttSessionActiveRef.current = true;
                } else {
                  console.error('[ERROR] Failed to reinitialize STT session:', ack.error);
                }
              });
            }
          } catch (e) {
            sttSessionActiveRef.current = false;
            console.warn('[WARN] Error reinitializing STT session:', e);
          }
        } catch (e) {
          console.warn('Failed to fetch next question after submit', e);
        }
      }
    } catch (err) {
      console.error('submitAnswer error', err);
      showToast(
        TOAST_ERROR_STATUS,
        messages.SOMETHING_WENT_WRONG_ERROR,
        err?.message || 'Failed to submit answer',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStopRecording = async () => {
    // Clear timer when ending interview
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimeRemaining(null);

    setLoading(true);

    try {
      // Stop mic if active
      stopMicStreaming();

      // Ensure final video chunks sent
      if (responseIdState) {
        await sendVideoIfRecording(responseIdState);
      }

      // Stop screen recorder and collect final chunks
      try {
        if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
          // Request any remaining data before stopping
          screenRecorderRef.current.requestData();
          screenRecorderRef.current.stop();
        }
      } catch (e) { /* ignore */ }

      // Wait a bit for final chunks to be collected
      await new Promise(resolve => setTimeout(resolve, 500));

      // Upload video if we have chunks
      if (responseIdState && screenChunksRef.current && screenChunksRef.current.length > 0) {
        try {
          // Get mime type from the first chunk or default to webm
          const firstChunk = screenChunksRef.current[0];
          const mimeType = firstChunk?.type || 'video/webm';
          
          // Combine all video chunks into a single Blob
          const videoBlob = new Blob(screenChunksRef.current, { type: mimeType });
          
          // Determine file extension based on mime type
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const fileName = `candidate-video.${ext}`;
          
          // Create File from Blob
          const videoFile = new File([videoBlob], fileName, { type: mimeType });
          
          console.log('[DEBUG] Uploading candidate video:', {
            size: videoBlob.size,
            type: mimeType,
            chunks: screenChunksRef.current.length
          });
          
          // Upload video
          const uploadResponse = await uploadCandidateVideoApi(responseIdState, videoFile);
          if (uploadResponse.error) {
            console.warn('[WARN] Failed to upload candidate video:', uploadResponse.error);
          } else {
            console.log('[DEBUG] Candidate video uploaded successfully');
          }
        } catch (e) {
          console.warn('[WARN] Error uploading candidate video (non-fatal):', e);
        }
      }

      // Send tab switch count before ending interview
      if (responseIdState && interviewIdRef.current) {
        try {
          await updateTabSwitchCountApi(interviewIdRef.current, responseIdState, cheatCount);
          console.log('[DEBUG] Tab switch count sent:', cheatCount);
        } catch (e) {
          console.warn('updateTabSwitchCountApi failed (non-fatal)', e);
        }
      }

      // Tell backend STT to finalize & end session (via socket)
      try {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('end_interview', { response_id: responseIdState }, ack => {
            // Useful for debugging end_interview ACK responses
            console.log('end_interview ack', ack);
          });
        }
      } catch (e) {
        console.warn('end_interview emit failed', e);
      }

      // call endInterviewApi to perform finalization on REST side
      if (responseIdState) {
        try {
          await endInterviewApi(responseIdState, 'User ended interview');
        } catch (e) {
          console.warn('endInterviewApi failed (non-fatal)', e);
        }
      }

      // stop all media tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
        window.__screenStream = null;
      }

      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
        window.__cameraStream = null;
      }

      navigate('/ThankYou');
    } catch (e) {
      console.error('handleStopRecording error', e);
      showToast(
        TOAST_ERROR_STATUS,
        messages.SOMETHING_WENT_WRONG_ERROR,
        'Failed to end interview. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI ----------

  return (
    <>
      <PreventBack />
      <Loader isLoading={loading} text="Submitting..." />
      <Box bg="secondary.100" height="100vh">
        <Flex justify="space-between" align="center" direction="row" bg="white" p={6}>
          <Box>
            <Heading size="lg" color="primaryText" fontWeight={700}>
              {interviewDetails?.name} Interview
            </Heading>
          </Box>
          <HStack spacing={2}>
            <Box
              display={cheatCount === 0 ? "none" : "block"}
              border="1px solid"
              borderColor="error.500"
              borderRadius="md"
              px={3}
              py={1}
            >
              <Text color="error.500" fontSize="sm" fontWeight={600}>
                Tab Switched: {cheatCount}
              </Text>
            </Box>
            <Text
              fontWeight={600}
              color="primaryText"
              fontSize="2xl"
              display="flex"
              direction="row"
              alignItems="center"
              minW="120px"
              justifyContent="flex-end"
              gap={2}>
              <Image src={clockIcon} alt={`clock icon`} boxSize="28px" objectFit="contain" />
              {timeRemaining !== null ? formatTime(timeRemaining) : '00:00'}
            </Text>
          </HStack>
        </Flex>
        <Box maxW="1200px" mx="auto" bg="light" p={{ base: 6, md: 8 }}>
          <Flex direction={{ base: 'column', lg: 'row' }} gap={{ base: 6, lg: 6 }}>
            {/* Left column */}

            <VStack flex="1" spacing={6} align="center" justifyContent="space-between">
              <Box position="relative" w="220px" h="220px" mx={{ base: 'auto', lg: 'unset' }}>
                {/* Outer circle */}
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  borderRadius="full"
                  bg="LavendeBlue"
                  w="206px"
                  h="206px"
                />
                {/* Secondary circle */}
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  borderRadius="full"
                  bg="PeriwinkleBlue"
                  w="162px"
                  h="162px"
                />
                {/* Third circle */}
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  borderRadius="full"
                  bg="indigoMedium"
                  w="118px"
                  h="118px"
                />
                {/* Inner circle */}
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  borderRadius="full"
                  bg="indigo.500"
                  w="74px"
                  h="74px"
                />
              </Box>

              <Box
                bg="black"
                borderRadius="xl"
                p={0}
                minH="220px"
                maxH="55%"
                w="100%"
                h="100%"
                position="relative"
                color="white"
                overflow="hidden"
                boxShadow="lg">
                {hasCameraStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      maxHeight: '320px',
                      height: '100%',
                      objectFit: 'cover',
                      background: 'black',
                      display: 'block',
                    }}
                  />
                ) : (
                  <Flex
                    align="center"
                    justify="center"
                    h="100%"
                    bgGradient="linear(135deg, dark.500, darkSecondary)">
                    <Text fontSize="sm" color="whiteAlpha.700">
                      Camera feed would appear here
                    </Text>
                  </Flex>
                )}
                <Box
                  position="absolute"
                  bottom="16px"
                  left="16px"
                  bg="whiteAlpha.200"
                  borderRadius="full"
                  px={4}
                  py={1}>
                  <Text fontSize="sm" fontWeight={600} color="white">
                    {candidateName}
                  </Text>
                </Box>
              </Box>
            </VStack>

            {/* Right column */}
            <Stack
              flex="1"
              spacing={0}
              borderRadius="2xl"
              borderWidth={1}
              borderColor="stroke"
              boxShadow="sm"
              bg="white"
              overflow="hidden">
              <Flex
                justify="space-between"
                align="center"
                direction={{ base: 'column', sm: 'row' }}
                gap={2}
                px={6}
                py={4}
                borderBottomWidth={1}
                borderColor="secondary.200">
                <Text color="primaryText" fontSize="sm" fontWeight={600}>
                  {questionNumber > 0 && totalQuestions > 0
                    ? `Question ${questionNumber} of ${totalQuestions}`
                    : 'Question Number will appear here'}
                </Text>
                <Text color="secondaryText" fontSize="xs">
                  {currentTime}
                </Text>
              </Flex>

              <Box bg="secondary.50" p={4} flex="1">
                <VStack align="stretch" spacing={5} maxH="420px" overflowY="auto" p={1}>
                  {isRecording && (transcript || partialTranscript) && (
                    <Box
                      bg="primary.50"
                      px={4}
                      py={3}
                      borderRadius="md"
                      boxShadow="sm"
                      borderWidth={1}
                      borderColor="primary.200">
                      <Text fontSize="sm" color="primaryText">
                        {transcript}
                        {partialTranscript && (
                          <Text as="span" opacity={0.6}>
                            {' '}
                            {partialTranscript}
                          </Text>
                        )}
                      </Text>
                    </Box>
                  )}

                  {conversation.map(entry => (
                    <ConversationMessage key={entry.id} entry={entry} />
                  ))}
                </VStack>
              </Box>

              <HStack
                spacing={4}
                justify="space-between"
                px={{ base: 4, md: 6 }}
                py={4}
                borderTopWidth={1}
                borderColor="secondary.200"
                bg="white">
                {!isRecording ? (
                  <Button
                    variant="solid"
                    bg="primary.600"
                    color="white"
                    borderWidth="1px"
                    borderColor="primary.700"
                    _hover={{ bg: 'primary.700' }}
                    onClick={handleStartRecording}
                    isDisabled={loading || !socketConnected}>
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    bg="white"
                    borderWidth="1px"
                    borderColor="primary.700"
                    color="primary.700"
                    _hover={{ bg: 'white' }}
                    onClick={handleSubmitAnswer}
                    isDisabled={loading}>
                    Submit Answer
                  </Button>
                )}
                <Button
                  bg="error.500"
                  color="white"
                  _hover={{ bg: 'error.600' }}
                  onClick={handleStopRecording}
                  isDisabled={loading}>
                  End Interview
                </Button>
              </HStack>
            </Stack>
          </Flex>
        </Box>
      </Box>
    </>
  );
};

export default InterviewSetup;