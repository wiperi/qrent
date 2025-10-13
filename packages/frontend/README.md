# BlueEstate Rentals - Frontend V2

A modern, responsive rental property platform built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🏠 Modern property listing interface
- 📱 Responsive design for all devices
- 🔍 Property search functionality
- 🎨 Beautiful UI with custom brand colors
- ⚡ Built with Next.js 14 and TypeScript
- 🎯 Optimized for performance and accessibility

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: React Icons
- **Components**: Custom React components

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run the development server:
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
└── components/            # Reusable components
    ├── Header.tsx         # Navigation header
    ├── HeroSection.tsx    # Hero banner with search
    ├── PropertyCard.tsx   # Property card component
    ├── PropertyGrid.tsx   # Property listings grid
    └── Footer.tsx         # Footer component
```

## Design System

### Colors
- **Brand Primary**: `#1d4ed8` (blue-700)
- **Brand Light**: `#3b82f6` (blue-500) 
- **Brand Dark**: `#1e40af` (blue-800)

### Components
- Responsive grid layout (1-4 columns based on screen size)
- Card hover effects with image scaling
- Mobile-first design approach
- Accessible navigation with ARIA labels

## Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Create production build
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Adding New Properties

Edit the `sampleProperties` array in `src/components/PropertyGrid.tsx` to add or modify property listings.

## Deployment

The project is ready for deployment on Vercel, Netlify, or any other Next.js hosting platform.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.