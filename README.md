# click&track

*click&track* is a web-based application designed for manual object tracking in videos. It provides a simple and efficient interface for loading a video, marking the positions of multiple objects at specific frames, and exporting the tracking data to a CSV file.

## Features

- **Video Playback**: Load and play local video files.
- **Multi-Object Tracking**: Track any number of distinct objects.
- **Adjustable Sampling Rate**: Define how frequently you want to log locations (e.g., every frame, every second).
- **Visual Trail**: See a configurable trail of recent locations for each object.
- **Precise Navigation**: Jump between recorded locations or frames.
- **Data Import/Export**: Import existing tracking data from a CSV file or export your work to a new one.
- **Rich Keyboard Shortcuts**: A comprehensive set of shortcuts for efficient, mouse-free operation.

## How to Use

1.  **Load a Video**: Click the "Open Video File" button to load a video from your local machine.
2.  **Navigate**: Use the playback controls or keyboard shortcuts to move through the video. You can play, pause, and jump to specific frames or recorded locations.
3.  **Log Locations**: Pause the video at a desired frame. Hold `Ctrl` (or `Cmd` on Mac) and click on an object to log its location.
4.  **Switch Objects**: Use the object controls in the control widget or press `Tab` and `Shift+Tab` to cycle between the active objects you are tracking.
5.  **Add New Objects**: Click the `+` button in the object controls to start tracking a new object.
6.  **Export Data**: Once you are finished, click the "Export CSV" button to save the tracking data to your computer. The data is saved in a simple format: `timestamp_ms,object_id,x,y`.

## Controls

### Control Widget

The control widget provides a centralized place for all major actions and settings.

- **Navigation**: Buttons to jump to the first, previous, next, and final recorded locations for the active object.
- **Playback Info**: Displays the current timestamp, frame number, and detected video FPS.
- **Settings**:
    - **Sampling Rate**: Control how often tracking locations are logged. For example, a rate of `1 / 1` means one sample per second.
    - **Trail Length**: Adjust the number of previous locations displayed on screen for context.
- **Object Controls**: Switch between active objects, see the total number of objects, and add new ones.
- **File I/O**: Buttons to load a new video, import tracking data from a CSV, or export the current data to a CSV.

### Keyboard Shortcuts

| Keys              | Action                                      |
| ----------------- | ------------------------------------------- |
| **Playback & View** |                                             |
| `Space`           | Start playback (auto-pauses at next interval) |
| `Hold Space`      | Play continuously                           |
| `Mouse Scroll`    | Zoom in or out on the video                 |
| `Mouse Drag`      | Pan the view when zoomed in                 |
| `Ctrl` + `+` / `-`  | Adjust the length of the visual trail       |
| `Esc`             | Show or hide the shortcuts help dialog      |
| **Tracking**      |                                             |
| `Ctrl` + `Click`  | Log the location of the active object       |
| `Tab`             | Cycle to the next object                    |
| `Shift` + `Tab`   | Cycle to the previous object                |
| `N`               | Add a new object to track                   |
| `X`               | Delete the record at the current frame      |
| **Navigation**    |                                             |
| `R`               | Rewind to the previous recorded point       |
| `Shift` + `R`     | Rewind to the very first recorded point     |
| `F`               | Forward to the next recorded point          |
| `Shift` + `F`     | Forward to the very final recorded point    |


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
