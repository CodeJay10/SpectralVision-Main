# SpectralVision-Main

A comprehensive web application for exploring Earth, Moon, and Mars using NASA's satellite imagery and data. Built for the NASA Space Apps Challenge with real-time collaboration features.

https://img.shields.io/badge/NASA-SpaceApp%2520Challenge-blue?style=for-the-badge&logo=nasa
https://img.shields.io/badge/version-1.0.0-green?style=for-the-badge
https://img.shields.io/badge/license-MIT-blue?style=for-the-badge

🚀 Features
🌍 Multi-Planetary Exploration
Earth: Multiple NASA GIBS imagery layers (True Color, Blue Marble, Temperature)

Moon: Lunar Reconnaissance Orbiter (LRO) high-resolution maps

Mars: Mars Trek Viking data with equatorial views

📍 Advanced Annotation System
Multiple Shape Types: Markers, Circles, and Rectangles

Real-time Collaboration: Live updates across all connected clients

Persistent Storage: SQLite database with automatic backups

Import/Export: JSON support for data portability

🎨 Enhanced User Experience
Dark Cosmic Theme: Beautiful space-inspired interface

Responsive Design: Works on desktop and mobile devices

Keyboard Shortcuts: Efficient navigation (H for sidebar, Escape to cancel)

Toast Notifications: Real-time feedback system

🛠️ Installation & Setup
Prerequisites
Node.js 16+

npm or yarn

Quick Start
Clone and setup:

bash
git clone <repository-url>
cd SpectralVision
npm install
Start the server:

bash
npm start

Access the application:

text
🌍 Earth Explorer: http://localhost:8000

Development Mode
bash
npm run dev  # Auto-restart on file changes
📁 Project Structure
text
SpectralVision/
│
├── server.js                 # Express + Socket.IO backend
├── package.json              # Dependencies and scripts
├── annotations.db            # SQLite database (auto-created)
│
├── public/                   # Frontend static files
│   ├── index.html            # Main Earth explorer
│   ├── moon.html             # Lunar explorer
│   ├── mars.html             # Mars explorer
│   ├── style.css             # Cosmic theme styles
│   └── script.js             # Main application logic
│
└── README.md                 # This file
