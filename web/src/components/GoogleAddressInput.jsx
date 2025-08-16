// AddressInput.jsx
import React from 'react';
import { Field, Input, Stack } from "@chakra-ui/react";

// initialAddress will now come pre-populated from Google's place object
function AddressInput({ initialAddress = {}, readOnly = false, onManualChange }) {
  // Use local state if we want to allow manual edits, otherwise just display props
  const [addressLine1, setAddressLine1] = React.useState(initialAddress.addressLine1 || '');
  const [addressLine2, setAddressLine2] = React.useState(initialAddress.addressLine2 || '');
  const [city, setCity] = React.useState(initialAddress.city || '');
  const [postcode, setPostcode] = React.useState(initialAddress.postcode || '');
  const [country, setCountry] = React.useState(initialAddress.country || '');

  // Update local state when initialAddress prop changes (e.g., after autocomplete selection)
  React.useEffect(() => {
    setAddressLine1(initialAddress.addressLine1 || '');
    setAddressLine2(initialAddress.addressLine2 || '');
    setCity(initialAddress.city || '');
    setPostcode(initialAddress.postcode || '');
    setCountry(initialAddress.country || '');
  }, [initialAddress]);

  // Handle local changes and propagate if not readOnly
  const handleChange = (e, setter) => {
    if (!readOnly) {
      setter(e.target.value);
      if (onManualChange) {
        onManualChange({
          addressLine1,
          addressLine2,
          city,
          postcode,
          country,
          [e.target.name]: e.target.value // Update the specific changed field
        });
      }
    }
  };

  return (
    <Stack spacing={4}>
      <Field.Root>
        <Field.Label>Address Line 1</Field.Label>
        <Input
          name="addressLine1"
          placeholder="e.g. 123 Main St"
          value={addressLine1}
          onChange={(e) => handleChange(e, setAddressLine1)}
          readOnly={readOnly}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Address Line 2 (Optional)</Field.Label>
        <Input
          name="addressLine2"
          placeholder="Apartment, suite, unit, etc."
          value={addressLine2}
          onChange={(e) => handleChange(e, setAddressLine2)}
          readOnly={readOnly}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>City</Field.Label>
        <Input
          name="city"
          placeholder="City"
          value={city}
          onChange={(e) => handleChange(e, setCity)}
          readOnly={readOnly}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Postcode</Field.Label>
        <Input
          name="postcode"
          placeholder="Postcode"
          value={postcode}
          onChange={(e) => handleChange(e, setPostcode)}
          readOnly={readOnly}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Country</Field.Label>
        <Input
          name="country"
          placeholder="Country"
          value={country}
          onChange={(e) => handleChange(e, setCountry)}
          readOnly={readOnly}
        />
      </Field.Root>
    </Stack>
  );
}

export default AddressInput;