import {
  ListItem,
  UnorderedList,
  createStandaloneToast,
} from '@chakra-ui/react';
import messages from '../../utils/constants/messages';
import {
  TOAST_DURATION_3000,
  TOAST_ERROR_STATUS,
  TOAST_TOP_RIGHT_POSITION,
} from '../../utils/constants/titleConstant';

const { ToastContainer, toast } = createStandaloneToast();

export const Toast = () => {
  return <ToastContainer />;
};

export const showToast = (status, title, message) => {
  const getToastDescription = (status, message) => {
    if (status === TOAST_ERROR_STATUS) {
      if (message?.split('\n')?.length > 1) {
        return (
          <UnorderedList styleType="disc">
            {message?.split('\n')?.map((line, index) => (
              <ListItem key={index}>{line}</ListItem>
            ))}
          </UnorderedList>
        );
      } else {
        return message;
      }
    } else {
      return message || messages.SOMETHING_WENT_WRONG_ERROR;
    }
  };

  toast({
    title: title,
    position: TOAST_TOP_RIGHT_POSITION,
    description: getToastDescription(status, message),
    status: status,
    duration: TOAST_DURATION_3000,
    isClosable: true,
  });
};
