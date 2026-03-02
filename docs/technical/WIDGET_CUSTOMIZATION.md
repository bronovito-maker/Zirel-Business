# Widget Customization & Configuration

## Overview
Zirèl allows tenants to brand the chat widget directly from their dashboard. This includes changing the title, subtitle, icon, and the overall primary color theme.

## 1. Dashboard UI (`Dashboard.tsx`)
In the **Integrazione** tab, a dedicated "Personalizzazione Widget" card provides:
- **Title Input:** Updates `widget_title` in the `tenants` table.
- **Subtitle Input:** Updates `widget_subtitle` in the `tenants` table.
- **Color Picker:** Manages the primary hex color (`widget_color`).
- **Icon Selector:** Emoji or SVG selection for the `widget_icon`.

### Real-time Preview
The dashboard includes a simplified CSS-only preview of the widget to show changes instantly. 

```tsx
<div style={{ backgroundColor: formData.widget_color }}>
    {formData.widget_icon}
</div>
```

---

## 2. Dynamic Loading (`chat.js`)
The widget is designed to be highly adaptive. When the script loads, it checks for a global configuration object.

### The `ZirelWidgetConfig` Object
A script on the host page (or injected by the platform) populates this object:
```javascript
window.ZirelWidgetConfig = {
    title: "Chiringuito Gino",
    subtitle: "Concierge h24",
    color: "#ff8c42",
    icon: "🍹"
};
```

### Applying Styles
`chat.js` uses this object to modify the DOM at runtime:
- **Colors:** Applied to the header background and the toggle button using inline styles.
- **Shadows:** Box-shadow colors are calculated or statically assigned to match the brand color.
- **Labels:** Text content of `h6` and `p` tags in the chat header are updated.

```javascript
// Example implementation in chat.js
const config = window.ZirelWidgetConfig || {};
headerTitle.innerText = config.title || "Zirèl Assistant";
toggleBtn.style.backgroundColor = config.color || "#FF8C42";
```

---

## 3. Fallback Mechanism
If no custom configuration is provided (e.g., for a new tenant or a generic integration), the widget defaults to:
- **Color:** `#FF8C42` (Zirèl Orange).
- **Icon:** `💬` or the Zirèl SVG Logo.
- **Title:** "Zirèl Assistant".

## 4. Maintenance & Extensions
To add more customization (e.g., custom fonts, different avatar styles):
1. Add the corresponding column to the `tenants` table in Supabase.
2. Add an input field to `Dashboard.tsx`.
3. Update `chat.js` to read and apply the new property from `ZirelWidgetConfig`.
