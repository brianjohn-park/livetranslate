# Live Translation App - Design Guidelines

## Brand Identity

**Purpose**: A professional translation tool for capturing and translating multi-speaker conversations in real-time with maximum accuracy.

**Aesthetic Direction**: **Editorial/Magazine** - Clean typographic hierarchy with high contrast for maximum readability. Trustworthy, international, and content-focused. Think BBC News or The Economist digital apps - serious, precise, authoritative.

**Memorable Element**: High-contrast speaker color system that makes multi-speaker conversations instantly scannable. Each speaker gets a bold accent color that appears consistently throughout their contributions.

## Color Palette

**Primary**: #1A1A1A (Charcoal) - Used for primary UI elements, headers
**Background**: #FFFFFF (White) - Main surface
**Surface**: #F8F9FA (Light Gray) - Cards, elevated surfaces
**Border**: #E5E7EB (Soft Gray) - Dividers, outlines

**Text Colors**:
- Primary text: #1A1A1A
- Secondary text: #6B7280
- Disabled: #9CA3AF

**Speaker Accent Colors** (rotating palette for multi-speaker):
- Speaker 1: #2563EB (Blue)
- Speaker 2: #DC2626 (Red)
- Speaker 3: #059669 (Green)
- Speaker 4: #7C3AED (Purple)
- Speaker 5: #EA580C (Orange)

**Semantic Colors**:
- Success: #059669
- Warning: #F59E0B
- Error: #DC2626
- Info: #2563EB

**Low Confidence Indicator**: Text opacity at 50% (#6B7280) for words with confidence < 0.7

## Typography

**Font**: System default (SF Pro for iOS, Roboto for Android)
**Type Scale**:
- Header: 28px Bold
- Title: 20px Semibold
- Body: 16px Regular
- Caption: 14px Regular
- Small: 12px Regular

**Translation Display** (live view): 24px Medium with 1.5 line height for maximum readability

## Navigation Architecture

**Root Navigation**: Tab Bar (2 tabs)
- **Record Tab**: Live transcription/translation interface
- **History Tab**: List of saved sessions

**Authentication Flow**: Stack navigation (Login → Signup → Main App)

## Screen Specifications

### 1. Login Screen
**Purpose**: User authentication entry point

**Layout**:
- Header: Transparent, no navigation elements
- Top inset: insets.top + Spacing.xl
- Content: Scrollable form centered vertically

**Components**:
- App icon (96px) centered at top
- "Welcome to LiveTranslate" (Title size)
- Email input field
- Password input field
- "Log In" button (full-width, primary color)
- "Don't have an account? Sign up" link below

**Safe Area**: Top: insets.top + Spacing.xl, Bottom: insets.bottom + Spacing.xl

### 2. Signup Screen
**Purpose**: New user registration

**Layout**: Identical to Login with additional "Name" field at top of form

### 3. Record Screen (Tab 1)
**Purpose**: Active recording and live translation display

**Layout**:
- Header: Transparent with left button (language pair selector) and right button (settings)
- Top inset: headerHeight + Spacing.xl
- Main content: Scrollable container for translation text
- Floating button: Large circular "Stop" button at bottom center

**Components**:
- Language pair badge at top: "Spanish → English" (Surface color, small text)
- Live translation text: Large, high contrast, auto-scrolling as new translations arrive
- Speaker indicators: Colored vertical bars (4px width) on left edge of each speaker's text block
- Floating "Stop Recording" button: 72px circle, Error color, with drop shadow (shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2)

**Safe Area**: Top: headerHeight + Spacing.xl, Bottom: 72px (button) + Spacing.xl + insets.bottom

**Empty State**: "Tap record to start capturing audio" with microphone illustration (microphone-start.png)

### 4. History Screen (Tab 2)
**Purpose**: Browse all saved sessions

**Layout**:
- Header: Default navigation with title "History"
- Main content: List of session cards

**Components**:
- Session cards (Surface color):
  - Language pair badge (e.g., "ES → EN")
  - Session duration and timestamp
  - Speaker count badge
  - First 2 lines of translated text preview
  - Chevron icon indicating expandable
- Pull-to-refresh indicator

**Safe Area**: Top: Spacing.xl, Bottom: tabBarHeight + Spacing.xl + insets.bottom

**Empty State**: "No sessions yet" with illustration (empty-history.png) and "Start recording to see your sessions here"

### 5. Session Detail Screen (Modal)
**Purpose**: Review completed session with both transcription and translation

**Layout**:
- Header: Default with "Close" button (left) and "Export" button (right)
- Main content: Scrollable with two-column layout

**Components**:
- Session metadata header: Date, duration, language pair, speaker count
- Two-column text display:
  - Left column: "Original" label, transcription with speaker colors
  - Right column: "Translation" label, translated text with speaker colors
- Speaker legend at bottom showing color → speaker mapping

**Safe Area**: Top: Spacing.xl, Bottom: insets.bottom + Spacing.xl

### 6. Language Selector Screen (Modal)
**Purpose**: Choose source and target languages

**Layout**:
- Header: Title "Select Languages" with "Done" button
- Two sections: "From" and "To" with searchable language lists

**Safe Area**: Top: Spacing.xl, Bottom: insets.bottom + Spacing.xl

## Visual Design

**Touchable Feedback**: All buttons reduce opacity to 0.7 when pressed

**Speaker Color System**: 
- Each speaker's text has a 4px colored vertical bar on the left edge
- Speaker badge appears as colored circle (16px) with "S1", "S2" labels

**Confidence Indicators**: 
- High confidence (>0.9): Full opacity
- Medium confidence (0.7-0.9): 80% opacity
- Low confidence (<0.7): 50% opacity with subtle gray tint

**Cards**: Surface color background, 12px border radius, no shadow by default

**Floating Stop Button**: Primary visual focal point with subtle shadow

## Assets to Generate

**icon.png** (1024x1024)
- App icon featuring abstract waveform transforming into text lines
- Primary color gradient
- WHERE USED: Device home screen

**splash-icon.png** (1024x1024)
- Simplified version of app icon
- WHERE USED: App launch screen

**microphone-start.png** (256x256)
- Minimalist microphone icon in primary color
- WHERE USED: Record screen empty state

**empty-history.png** (256x256)
- Stack of documents or list icon in soft gray
- WHERE USED: History screen empty state

**avatar-preset.png** (128x128)
- Simple circular avatar with user silhouette
- WHERE USED: Profile/settings screen

All illustrations should use the primary color (#1A1A1A) with soft gray (#E5E7EB) accents, maintaining the editorial aesthetic.