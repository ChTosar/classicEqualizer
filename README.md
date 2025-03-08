# Classic Equalizer

The **Classic Equalizer** is a web component that provides a visual representation of audio frequencies in a classic equalizer style. It uses the Web Audio API to analyze audio data and display it in a visually appealing way using either a canvas or HTML elements.

![Preview image](https://github.com/ChTosar/classicEqualizer/blob/main/preview.jpg?raw=true "preview image")

## Features

- **Dynamic Visualization**: Displays audio frequencies in real-time.
- **Customizable Colors**: Allows users to customize the colors of the bars and the background.
- **Multiple Display Types**: Supports both canvas and HTML representations.

### Attributes

- `type`: Specifies the type of display. Options are `"canvas"` or `"html"`.
- `src`: The path to the audio file you want to visualize.
- `colors`: A JSON string that defines the colors for the equalizer bars and background. Example:
  ```json
  {
      "barBgColor": "#222222",
      "barColor": "#d7f0ff",
      "barColor2": "#a6c0ba",
      "barColor3": "#fcb750"
  }
  ```