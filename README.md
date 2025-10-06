# 🌌 SpectralVision
### “Explore, Annotate, and Learn from NASA’s Gigapixel Earth, Moon, and Mars Imagery”

---

## 🚀 About the Project
**SpectralVision** is a full-stack web application built for the **NASA Space Apps Challenge**.  
It enables users to explore **Earth**, **Moon**, and **Mars** through NASA’s high-resolution imagery, annotate features in real time, and collaborate with others in an interactive 3D-inspired environment.

---

## 🌍 Key Features

### 🪐 Multi-Planetary Exploration
- Explore **Earth**, **Moon**, and **Mars** with real NASA datasets  
- High-resolution imagery via NASA GIBS and Lunar/Mars Treks  
- Seamless switching between celestial bodies

### 🗺️ Earth Features
- 5 different NASA imagery layers:
  - VIIRS SNPP True Color  
  - MODIS Terra True Color  
  - VIIRS NOAA-20 True Color  
  - Land Surface Temperature  
  - Blue Marble Global Mosaic  
- Date-based imagery selection for temporal analysis

### 🌕 Moon & ♂️ Mars Features
- Lunar Reconnaissance Orbiter (LRO) and Viking datasets  
- Surface feature visualization and crater mapping  
- Equatorial and polar exploration modes

### 📍 Annotation System
- Add markers, circles, and rectangles  
- Real-time multi-user collaboration with **Socket.IO**  
- Import/Export JSON annotation data  
- Persistent storage with **SQLite** backend  
- Delete or edit annotations instantly

### 💬 Real-time Collaboration
- Live annotation updates across users  
- Instant notifications and status feedback  
- Conflict-free multi-user synchronization  

### 🎨 User Interface
- Elegant **dark cosmic theme**  
- Fully responsive design (mobile + desktop)  
- Animated landing page with floating particles  
- Toast notification system for feedback  

### ⌨️ User Experience
- Keyboard shortcuts (`H` for sidebar, `Esc` to cancel)  
- Right-click quick annotation creation  
- Coordinate HUD display  
- Search by coordinates or place name  
- “Home” button to reset map view  

### 🔧 Technical Stack
| Layer | Technology |
|--------|-------------|
| **Frontend** | HTML5, CSS3, JavaScript, Leaflet.js |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite |
| **Real-time** | Socket.IO |
| **APIs** | NASA GIBS, LRO, Mars Trek |
| **Deployment** | Render (Free Hosting) |

---

## 💾 Data Management
- Persistent annotation storage (SQLite)
- Automatic backup and merging  
- Import/Export `.json` project files  
- Cross-session sync for collaboration  

---

## 🌐 Deployment
**Live Demo:**  
🔗 [https://spectralvision-main.onrender.com/](https://spectralvision-main.onrender.com/)

---

## 🧭 Run Locally

```bash
# 1️⃣ Download or clone this repository
git clone https://github.com/<yourusername>/SpectralVision.git

# 2️⃣ Navigate into the project
cd SpectralVision-Main

# 3️⃣ Install dependencies
npm install

# 4️⃣ (Optional) Fix any audit issues
npm audit fix --force

# 5️⃣ Start the server
npm start

# 6️⃣ Visit
http://localhost:8000
