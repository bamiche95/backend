import {
  Field,
  Fieldset,
  NativeSelect,
  Stack,
  Box,
  Text,
} from '@chakra-ui/react';

const RadiusFilter = ({ radius, setRadius }) => {
  return (
    <Fieldset.Root size="md" maxW="xs" mb={4}>
      <Stack spacing={1}>
        <Fieldset.Legend>
          <Text fontWeight="semibold" fontSize="sm">
            Show alerts within
          </Text>
        </Fieldset.Legend>

        <Fieldset.Content>
          <Field.Root>
            <NativeSelect.Root>
              <NativeSelect.Field
                name="radius"
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                aria-label="Select radius"
              >
                {[5, 10, 20, 50].map((km) => (
                  <option key={km} value={km}>
                    {km} km
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
        </Fieldset.Content>
      </Stack>
    </Fieldset.Root>
  );
};

export default RadiusFilter;
