# Naruto WebCam

A real-time webcam app that captures photos and videos while detecting hand signs to trigger anime jutsu effects like Rasengan, Chidori, and Shadow Clone.

## Overview

**Naruto WebCam** turns a live camera feed into an interactive jutsu studio. It tracks hand poses and gestures in real time, maps detected hand signs to visual effects overlaid on the video stream, and lets users snap still photos or record clips with those effects active.

## Planned Features

- **Live Webcam Stream:** Real-time video preview with photo capture and video recording.
- **Hand Sign Detection:** Gesture and hand-pose recognition to trigger specific jutsu states.
- **Jutsu Visual Effects:**
  - **Rasengan:** Spinning energy sphere effect tracked to the hand/palm.
  - **Chidori:** High-voltage lightning/arc effect around the hand.
  - **Multi Shadow Clone:** Cloned/duplicated silhouette or frame effects triggered by the signature hand sign.
- **Media Export:** Save captured snapshots and recorded video clips locally.

## Project Structure

```text
naruto-webcam/
├── src/              # Camera feed, hand-tracking logic, jutsu renderers, UI
├── assets/           # Effect sprites, shaders, audio, or sample media
├── README.md
└── package.json      # or requirements.txt / pyproject.toml depending on stack
