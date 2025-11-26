# click&track

A simple web application for manual object tracking in videos. It allows you to load a video, mark the locations of multiple objects at specific frames, and export the tracking data to a CSV file.

> **Note:** This is a learning project focused on web development with TypeScript, React, modern UI/CSS, and deployment practices, but nevertheless, it should be fully functional.

## Features

- **Video Playback**: Load and play local video files.
- **Multi-Object Tracking**: Track multiple objects.
- **Adjustable Sampling Rate**: Define the frequency for logging locations.
- **Visual Trail**: See a configurable trail of recent locations for each object.
- **Navigation**: Jump between recorded locations or frames.
- **Data Import/Export**: Import and export tracking data via CSV files.
- **Keyboard Shortcuts**: Use shortcuts for most operations.

## How to Use

1.  **Load Video**: Click "Open Video File" to load a local video.
2.  **Navigate**: Use the playback controls or keyboard shortcuts to move through the video.
3.  **Log Locations**: Pause the video, then hold `Ctrl` (or `Cmd` on Mac) and click an object to log its location.
4.  **Switch Objects**: Use the object controls or press `Tab` / `Shift+Tab` to cycle between objects.
5.  **Add New Objects**: Click the `+` button in the object controls to track a new object.
6.  **Export Data**: Click "Export CSV" to save the tracking data. The format is `timestamp_ms,object_id,x,y`.

## Controls

### Control Widget

The control widget contains settings and actions for the application.

- **Navigation**: Navigate to first, previous, next, and final recorded locations.
- **Playback Info**: Shows current timestamp, frame, and FPS.
- **Settings**:
    - **Sampling Rate**: Set how often locations are logged.
    - **Trail Length**: Set the length of the on-screen trail.
- **Object Controls**: Switch, add, and see the total number of objects.
- **File I/O**: Load video, import/export CSV.

### Keyboard Shortcuts

| Keys              | Action                                |
| ----------------- | ------------------------------------- |
| **Playback & View** |                                       |
| `Space`           | Start/Pause playback                  |
| `Hold Space`      | Play continuously (while held)        |
| `Mouse Scroll`    | Zoom view                             |
| `Mouse Drag`      | Pan view                              |
| `Ctrl` + `+` / `-`  | Adjust trail length                   |
| `Esc`             | Toggle help dialog                    |
| **Tracking**      |                                       |
| `Ctrl` + `Click`  | Log active object location            |
| `Tab`             | Next object                           |
| `Shift` + `Tab`   | Previous object                       |
| `N`               | Add new object                        |
| `X`               | Delete record at current frame        |
| **Navigation**    |                                       |
| `R`               | Go to previous location                  |
| `Shift` + `R`     | Go to first location                     |
| `F`               | Go to next location                      |
| `Shift` + `F`     | Go to final location                     |


## Run Locally

**Prerequisites:** [Node.js](https://nodejs.org/) installed.

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
3.  Open your browser and navigate to `http://localhost:3000`.
