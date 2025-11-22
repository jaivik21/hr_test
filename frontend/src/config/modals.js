import NiceModal from '@ebay/nice-modal-react';
import modals from '../utils/constants/modals';

// Import your modal components
import AddCandidateModal from '../components/modals/AddCandidateModal';
import InterviewHistoryModal from '../components/modals/InterviewHistoryModal';
// import ChangePasswordModal from '../components/modals/ChangePasswordModal';

const registerModals = () => {
  // Register modals here
  NiceModal.register(modals.addCandidateModal, AddCandidateModal);
  NiceModal.register(modals.interviewHistoryModal, InterviewHistoryModal);
  // NiceModal.register(modals.changePasswordModal, ChangePasswordModal);
};

export default registerModals;
