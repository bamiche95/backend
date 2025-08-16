// components/RadiusSlider.js (or inline in EventFeed)

"use client"
import { Box, Text, Slider } from "@chakra-ui/react"
import { useState, useEffect } from "react"

const RadiusSlider = ({ radiusKm, setRadiusKm }) => {
  const [value, setValue] = useState([radiusKm])

  useEffect(() => {
    setRadiusKm(value[0])
  }, [value, setRadiusKm])

  return (
    <Box maxW="300px" mb={6}>
      <Text mb={2} fontWeight="medium">
        Filter radius (km): {value[0]} km
      </Text>

      <Slider.Root
        value={value}
        min={1}
        max={100}
        step={1}
        onValueChange={(e) => setValue(e.value)}
      >
        <Slider.Control>
          <Slider.Track bg="red.100">
            <Slider.Range bg="tomato" />
          </Slider.Track>
          <Slider.Thumbs />
        </Slider.Control>
      </Slider.Root>
    </Box>
  )
}

export default RadiusSlider
