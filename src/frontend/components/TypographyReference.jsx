import React from 'react';
import { Box, Text, VStack, HStack, Divider } from '@chakra-ui/react';

/**
 * Typography Reference Component
 * 
 * This component displays all standardized typography styles for easy reference.
 * You can temporarily add this to any screen to see how the styles look.
 * 
 * Usage:
 * import TypographyReference from './components/TypographyReference';
 * 
 * Then add <TypographyReference /> to any screen
 */
const TypographyReference = () => {
  const styles = [
    { name: 'smallLightWhite', textStyle: 'smallLightWhite', bg: '#0b334d' },
    { name: 'smallHeavyWhite', textStyle: 'smallHeavyWhite', bg: '#0b334d' },
    { name: 'smallLightDark', textStyle: 'smallLightDark', bg: '#DFF3FF' },
    { name: 'smallHeavyDark', textStyle: 'smallHeavyDark', bg: '#DFF3FF' },
    { name: 'largeLightWhite', textStyle: 'largeLightWhite', bg: '#0b334d' },
    { name: 'largeHeavyWhite', textStyle: 'largeHeavyWhite', bg: '#0b334d' },
    { name: 'largeLightDark', textStyle: 'largeLightDark', bg: '#DFF3FF' },
    { name: 'largeHeavyDark', textStyle: 'largeHeavyDark', bg: '#DFF3FF' },
  ];

  return (
    <Box p={8} bg="white" borderRadius="md" boxShadow="lg" maxW="800px" mx="auto" my={8}>
      <Text fontSize="2xl" fontWeight="bold" mb={6} color="#0b334d">
        DooCoins Typography Reference
      </Text>
      
      <VStack spacing={4} align="stretch">
        {styles.map((style) => (
          <Box key={style.name}>
            <HStack spacing={4} align="center">
              <Box 
                flex="0 0 200px" 
                fontSize="sm" 
                fontWeight="600"
                color="gray.600"
              >
                {style.name}
              </Box>
              <Box 
                flex="1" 
                bg={style.bg} 
                p={4} 
                borderRadius="md"
              >
                <Text textStyle={style.textStyle}>
                  The quick brown fox jumps
                </Text>
              </Box>
            </HStack>
            <Divider mt={4} />
          </Box>
        ))}
      </VStack>

      <Box mt={8} p={4} bg="gray.50" borderRadius="md">
        <Text fontSize="sm" color="gray.600" fontWeight="600" mb={2}>
          Design Specs:
        </Text>
        <Text fontSize="sm" color="gray.600">
          • Small: 18px | Large: 24px
        </Text>
        <Text fontSize="sm" color="gray.600">
          • Light: 400 | Heavy: 700
        </Text>
        <Text fontSize="sm" color="gray.600">
          • White: #ffffff | Dark Blue: #0b334d
        </Text>
      </Box>
    </Box>
  );
};

export default TypographyReference;
