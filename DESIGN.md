# Design System — CoinTap

## Product Context
- **What this is:** Telegram Mini App idle clicker game — click to earn coins, upgrade Auto Clicker
- **Who it's for:** Telegram casual gamers
- **Space/industry:** Gaming, Telegram Mini Apps
- **Project type:** Web app / Mini App (game UI)

## Aesthetic Direction
- **Direction:** Telegram Native + Game Reward
- **Decoration level:** Minimal — game feedback IS the decoration
- **Mood:** Telegram's clean UI as foundation, with satisfying game reward feedback (click physics, coin animations, upgrade celebrations)
- **Reference sites:** Telegram native UI, classic idle games

## Typography
- **Font Stack:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  — Telegram native font stack, no additional loading required
- **Scale:**
  - Display (coin amount): 36px / 800
  - Button (CLICK): 18px / 700
  - Body: 16px / 400
  - Caption: 12px / 400

## Color
- **Approach:** Balanced — Telegram blue as primary, semantic colors for game states
- **Primary:** #0088CC (Telegram Blue — main button)
- **Coin Gold:** #FFD700 (coins — consistent across light/dark themes)
- **Success:** #4CAF50 (upgrade success feedback)
- **Error:** #E53935 (error states)
- **Light Theme:**
  - Background: #FFFFFF
  - Text Primary: #1a1a1a
  - Text Secondary: #666666
  - Border: #E0E0E0
- **Dark Theme:**
  - Background: #1E1E1E
  - Text Primary: #FFFFFF
  - Text Secondary: #AAAAAA
  - Border: #3A3A3A

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable (games need breathing room, not data-dense dashboards)
- **Scale:** 2(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)

## Layout
- **Approach:** Single column mobile-first (not scaled-down desktop)
- **Max content width:** 480px (centered)
- **Border radius:**
  - sm: 8px
  - md: 12px
  - lg: 16px
  - full: 9999px (pills)

## Motion
- **Approach:** Expressive — game feedback is the core experience
- **Easing:**
  - Enter: ease-out
  - Exit: ease-in
  - Move: ease-in-out
- **Duration:**
  - Micro: 50-100ms (button press)
  - Short: 150ms (scale animations)
  - Medium: 250-400ms (transitions)
  - Long: 400-700ms (page transitions)
- **Click Feedback:** 3D press effect (translateY + shadow change) + spring rebound + coin fly animation
- **Auto Clicker:** Pulsing ⚡ icon (1s cycle) + real-time +N/sec counter
- **Upgrade Success:** Green flash (#4CAF50) + gold particle burst
- **Offline Return:** Modal overlay + coin animation

## Interaction States

### Loading State
- Skeleton screen (gray blocks) for main button area
- Coin display shows "--" or skeleton
- Telegram blue spinner (#0088CC)

### Error State
- Icon + text explaining the error
- "重新加载" (Retry) button
- Degradation hint if localStorage also unavailable

### Empty State (New User / Zero Coins)
- "这是你的第一个金币！" (This is your first coin!) at top
- Blinking CLICK button
- Onboarding tooltip: "点击按钮获得金币" (Tap button to earn coins)
- Warm, encouraging tone

### Success State (Upgrade)
- New level number flashes green (#4CAF50)
- Coin deduction animates (count-down effect)
- Main button area shows brief gold particle burst
- Sound: upgrade success chime (optional)

### Partial State (Auto Clicker Active)
- ⚡ icon pulses (every 1 second)
- "+N/sec" counter updates in real-time
- Each auto coin adds a subtle gold flash in main button area

### Offline Return
- Semi-transparent modal overlay
- "欢迎回来！" (Welcome back!) + offline earnings (gold +N animation)
- Auto Clicker earnings shown separately
- "收下！" (Collect!) button dismisses modal

## Component States

### Main CLICK Button
- **Default:** Primary blue fill (#0088CC), white text, box-shadow for 3D depth
- **Pressed:** translateY(6px), reduced shadow (simulates physical press depth)
- **Haptic:** Light vibration on touch devices

### Upgrade Button
- **Available:** Primary blue fill, white text, hover lifts slightly
- **Unavailable (insufficient coins):** Gray fill (#666), disabled
- **Pressed:** translateY(2px)
- **Success:** Brief green flash

## Accessibility
- Touch targets: minimum 44x44px
- Color contrast: text vs background ≥ 4.5:1
- ARIA labels: "点击获得金币" (Tap to earn coins), "升级 Auto Clicker" (Upgrade Auto Clicker)

## Icons
- **Coin Icon:** CSS-drawn gold circle (#FFD700 fill, #DAA520 border) with "$" text inside — no emoji dependency
- **Auto Clicker Indicator:** CSS-drawn pulsing element (no emoji)
- **Number Format:** 1,234 (comma) / 1.2W (万) / 1.2Y (亿) — ASCII-safe, no emoji

## Sound
- Default: Silent
- Settings toggle for sound effects
- Click sound: light "ding"
- Upgrade sound: success "whoosh"

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-25 | Initial design system created | Created by /design-consultation — Telegram Mini App idle clicker game |
