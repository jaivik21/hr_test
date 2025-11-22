import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  Box,
  Text,
} from '@chakra-ui/react';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import DataTable from '../Datatable/DataTable';
import { useMemo } from 'react';
import { getTextDateFullYearFromUTCDateVal } from '../../utils/helper';
import { themeColor } from '../../utils/constants/constants';

const InterviewHistoryModal = NiceModal.create(
  ({ candidateName, interviewHistory = [] }) => {
    const modal = useModal();

    const columns = useMemo(
      () => [
        {
          field: 'interview_name',
          headerName: 'Interview Given',
          width: 350,

          renderCell: (value, row) => {
            return row.interview_name || value || '-';
          },
        },
        {
          field: 'interview_date',
          headerName: 'Interview Date',
          width: 400,
          minWidth: 200,
          renderCell: (value, row) => {
            if (row.given_date) {
              return getTextDateFullYearFromUTCDateVal(row.given_date);
            }
            if (row.date) {
              return getTextDateFullYearFromUTCDateVal(row.date);
            }
            if (row.interview_date) {
              return getTextDateFullYearFromUTCDateVal(row.interview_date);
            }
            return 'Not scheduled';
          },
        },
      ],
      [],
    );

    const rows = useMemo(() => {
      return interviewHistory
        .filter(
          interview =>
            interview.given_date !== null && interview.given_date !== undefined,
        )
        .map((interview, index) => ({
          id: index,
          interview_name:
            interview.interview_name ||
            interview.role ||
            interview.interview_given ||
            interview.position ||
            '-',
          interview_date:
            interview.given_date ||
            interview.date ||
            interview.interview_date ||
            null,
          given_date: interview.given_date,
          date: interview.date,
        }));
    }, [interviewHistory]);

    return (
      <Modal
        isOpen={modal.visible}
        onClose={() => modal.hide()}
        isCentered
        size="lg">
        <ModalOverlay />
        <ModalContent maxW="800px">
          <ModalHeader>
            Previously Interviewed{' '}
            <Text as="span" fontSize="md" fontWeight="normal">
              ({candidateName})
            </Text>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {rows.length > 0 ? (
              <Box w="100%" overflow="hidden">
                <DataTable
                  columns={columns}
                  rows={rows}
                  totalRows={rows.length}
                  noPagination={true}
                  checkboxSelection={false}
                  loading={false}
                  noRecordMessage="No previous interview history found."
                  tableHeaderBg={themeColor.TAG_BG_COLOR}
                />
              </Box>
            ) : (
              <Text>No previous interview history found.</Text>
            )}
          </ModalBody>
          <Box px={6} pb={6} display="flex" justifyContent="flex-end">
            <Button onClick={() => modal.hide()} variant="outline">
              Close
            </Button>
          </Box>
        </ModalContent>
      </Modal>
    );
  },
);

export default InterviewHistoryModal;
