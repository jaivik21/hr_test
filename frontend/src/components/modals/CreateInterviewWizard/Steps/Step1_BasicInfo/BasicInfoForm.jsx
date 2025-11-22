import { Flex } from '@chakra-ui/react';
import BasicDetailsCard from './BasicDetailsCard';
import DescriptionCard from './DescriptionCard';

const BasicInfoForm = () => {
  return (
    <Flex direction="column" gap="24px" w="full">
      <BasicDetailsCard />
      <DescriptionCard />
    </Flex>
  );
};

export default BasicInfoForm;
