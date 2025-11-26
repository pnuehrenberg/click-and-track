import MediaInfoFactory from 'mediainfo.js';

/**
 * Analyzes a video file client-side using WASM.
 * @param {File} file - The browser File object from <input type="file" />
 * @returns {Promise<string>} - The exact frame rate (e.g., "23.976 fps")
 */
export async function getExactFrameRate(file: File): Promise<string> {
  let mediaInfoHandle: any = null;

  try {
    // 1. Initialize WASM module
    // Use local WASM for production builds, and a CDN for development
    const wasmUrl = import.meta.env.PROD 
      ? './MediaInfoModule.wasm' 
      : 'https://cdn.jsdelivr.net/npm/mediainfo.js@0.3.4/dist/MediaInfoModule.wasm';

    mediaInfoHandle = await MediaInfoFactory({ 
        format: 'object',
        locateFile: () => wasmUrl
    });

    // 2. Define Chunked Reader
    // MediaInfo requests specific byte ranges. We fetch only what is needed.
    const readChunk = (size: number, offset: number): Promise<Uint8Array> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(new Uint8Array(e.target.result as ArrayBuffer));
          } else {
            resolve(new Uint8Array(0));
          }
        };
        reader.onerror = reject;
        // Slice the file to read only the requested bytes
        reader.readAsArrayBuffer(file.slice(offset, offset + size));
      });
    };

    // 3. Analyze
    // Pass the total file size and the chunk loader callback
    const result = await mediaInfoHandle.analyzeData(() => file.size, readChunk);

    // 4. Extract Data
    // 'Video' track contains the specific visual metadata
    // The structure depends on the file, but typically it's under media.track
    const videoTrack = result?.media?.track?.find((t: any) => t['@type'] === 'Video');
    
    return videoTrack?.FrameRate || 'Unknown';

  } catch (err) {
    console.error("Probe failed:", err);
    return 'Error';
  } finally {
    // 5. Cleanup WASM memory
    if (mediaInfoHandle) mediaInfoHandle.close();
  }
}