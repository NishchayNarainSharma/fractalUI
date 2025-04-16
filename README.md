# RealityFractal.blog

A dynamic web application exploring consciousness through fractals, featuring interactive discussions and visual experiences.

## Features

- Interactive fractal visualization with scroll-based zoom
- Thought sharing and discussion platform
- Real-time voting system
- Comment functionality
- Modern, responsive design

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm (v6 or higher)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd reality-fractal-blog
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/fractal-blog
SESSION_SECRET=your-secret-key-here
NODE_ENV=development
```

4. Start MongoDB service (if not already running)

5. Start the application:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

6. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
reality-fractal-blog/
├── public/
│   ├── js/
│   │   └── main.js
│   ├── styles/
│   │   └── main.css
│   ├── index.html
│   ├── blog.html
│   ├── thoughts.html
│   ├── death.html
│   └── fractals.html
├── server.js
├── package.json
└── .env
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 