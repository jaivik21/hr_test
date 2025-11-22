import React from 'react';
import PropTypes from 'prop-types';
import { Flex, Icon, Text } from '@chakra-ui/react';
import { RiLogoutBoxLine } from 'react-icons/ri';
import { SIDEBAR_WIDTH, themeColor } from '../../utils/constants/constants';
import { mockUser } from '../../mocks/user';

const SidebarUserSection = ({ isOpen }) => {
  const userInitials = mockUser.initials;
  const userName = mockUser.name;

  return (
    <Flex
      direction="column"
      w="full"
      bg={isOpen ? themeColor.BG_COLOR : 'primary.500'}
      borderTop={isOpen ? '1px solid' : 'none'}
      borderTopColor={isOpen ? themeColor.STROKE_COLOR : 'transparent'}
      borderBottomLeftRadius={isOpen ? '10px' : 0}
      borderBottomRightRadius={isOpen ? '10px' : 0}
      height={isOpen ? '127px' : '120px'}
      gap="8px"
      align="stretch">
      {/* User Avatar */}
      {isOpen ? (
        <Flex
          w={`calc(${SIDEBAR_WIDTH}px - 32px)`}
          p="12px 16px"
          align="center"
          minH="40px"
          gap="12px"
          cursor="default">
          <Flex w="32px" align="center" justify="center">
            <Flex
              w="32px"
              h="32px"
              bg={themeColor.PRIMARY_COLOR}
              borderRadius="full"
              align="center"
              justify="center"
              border="0">
              <Text fontSize="16px" fontWeight="600" color="white">
                {userInitials}
              </Text>
            </Flex>
          </Flex>
          <Text
            fontSize="16px"
            fontWeight="500"
            lineHeight="24px"
            color={themeColor.PRIMARY_COLOR}>
            {userName}
          </Text>
        </Flex>
      ) : (
        <Flex
          w="60px"
          p="16px"
          align="center"
          justify="center"
          cursor="pointer"
          _hover={{ bg: 'primary.700' }}>
          <Flex
            w="32px"
            h="32px"
            bg="white"
            borderRadius="full"
            align="center"
            justify="center"
            border="2px solid"
            borderColor="white">
            <Text
              fontSize="16px"
              fontWeight="600"
              color={themeColor.PRIMARY_COLOR}>
              {userInitials}
            </Text>
          </Flex>
        </Flex>
      )}

      {/* Logout */}
      {isOpen ? (
        <Flex
          w={`calc(${SIDEBAR_WIDTH}px - 32px)`}
          p="12px 16px"
          align="center"
          minH="40px"
          gap="12px"
          cursor="pointer"
          _hover={{ bg: '#EEF1FF' }}>
          <Flex w="32px" align="center" justify="center">
            <Icon as={RiLogoutBoxLine} fontSize="24px" color="gray.700" />
          </Flex>
          <Text
            fontSize="16px"
            lineHeight="24px"
            fontWeight="500"
            color="gray.700">
            Log Out
          </Text>
        </Flex>
      ) : (
        <Flex
          w="60px"
          p="16px"
          align="center"
          justify="center"
          cursor="pointer"
          _hover={{ bg: 'primary.700' }}>
          <Icon as={RiLogoutBoxLine} fontSize="24px" color="white" />
        </Flex>
      )}
    </Flex>
  );
};

SidebarUserSection.propTypes = {
  isOpen: PropTypes.bool.isRequired,
};

export default React.memo(SidebarUserSection);
