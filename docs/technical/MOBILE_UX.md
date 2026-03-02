# Mobile UX & Fullscreen Chat Expansion

## Overview
To provide a premium experience on mobile devices (where screen real estate is limited), the Zirèl Chat Widget implements a "Fullscreen Overlay" mode. This ensures that the chat interface is readable and interactive without user squinting or horizontal scrolling.

## Fullscreen Logic (`chat.js`)

### 1. Detection
The widget uses a simple viewport check:
```javascript
const isMobile = window.innerWidth <= 768;
```

### 2. Behavioral Shifts
When `isMobile` is true and the chat is opened:
- **Dimensions:** The chat container (`#n8n-chat-widget`) is set to `width: 100%`, `height: 100%`, and `bottom: 0`, `right: 0`.
- **Border Radius:** The premium `2rem` border radius is removed or reduced to provide a full-bleed effect.
- **Toggle Visibility:** The floating toggle button (`#chat-toggle-btn`) is hidden to avoid overlapping the chat UI.
- **Close Button:** A prominent "Chiudi" (Close) button is prioritized in the header.

### 3. Background Scroll Lock
To prevent the underlying page from scrolling while the user interacts with the chat, the following logic is applied:

```javascript
// On Open
if (isMobile) {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
}

// On Close
if (isMobile) {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
}
```

## Performance Considerations
- **Animations:** Subtle `translateY` animations are used to slide the chat from the bottom-up, matching native mobile app patterns.
- **Touch Targets:** Buttons and input fields are enlarged for high-precision tapping.

## Verification
This behavior can be verified using Chrome DevTools' mobile device simulator (e.g., iPhone 12 Pro) and ensuring that:
1. The chat covers 100% of the viewport.
2. The background page does not scroll when swiping on the chat.
3. Closing the chat restores the scroll and the toggle button correctly.
