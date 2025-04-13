const canvas = document.getElementById('fractalCanvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    alert('WebGL not supported');
    throw new Error('WebGL not supported');
}

// Compile shader
function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Setup shaders
const vertexShader = compileShader(
    document.getElementById('vertexShader').textContent,
    gl.VERTEX_SHADER
);
const fragmentShader = compileShader(
    document.getElementById('fragmentShader').textContent,
    gl.FRAGMENT_SHADER
);

// Create program
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    throw new Error('Program link error');
}

// Setup rectangle covering entire canvas
const positions = new Float32Array([
    -1.0, -1.0,
     1.0, -1.0,
    -1.0,  1.0,
     1.0,  1.0,
]);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

// Get attribute and uniform locations
const positionLocation = gl.getAttribLocation(program, 'position');
const resolutionLocation = gl.getUniformLocation(program, 'resolution');
const zoomLocation = gl.getUniformLocation(program, 'zoom');
const centerLocation = gl.getUniformLocation(program, 'center');
const timeLocation = gl.getUniformLocation(program, 'time');
const juliaParamLocation = gl.getUniformLocation(program, 'juliaParam');

// State variables
let zoom = 1.0;
let targetZoom = zoom;
let scrollProgress = 0;
let targetScrollProgress = 0;
let center = { x: 0, y: 0 };
let startTime = Date.now();

// Parameters for pattern evolution
const basePatterns = [
    { x: -0.4, y: 0.6 },   // Classic spiral
    { x: 0.285, y: 0.01 }, // Dendrite
    { x: -0.8, y: 0.156 }, // Tentacles
    { x: 0.37, y: -0.2 },  // Galaxies
    { x: -0.123, y: 0.745 } // Snowflakes
];

// Constants for smooth transitions
const PATTERN_TRANSITION_SPEED = 0.015;  // Slower, more stable transition
const SCROLL_SENSITIVITY = 0.0001;      // More controlled scroll response
const MIN_ZOOM = 0.5;                   // Minimum zoom level
const MAX_ZOOM = 3.0;                   // Maximum zoom level
const ZOOM_FACTOR = 1.02;               // Gentler zoom changes

function interpolatePatterns(progress) {
    const normalizedProgress = progress % basePatterns.length;
    const index = Math.floor(normalizedProgress);
    const nextIndex = (index + 1) % basePatterns.length;
    
    // Smooth easing function
    const t = normalizedProgress - index;
    const smoothT = t * t * (3 - 2 * t); // Smoother transition curve
    
    const current = basePatterns[index];
    const next = basePatterns[nextIndex];
    
    return {
        x: current.x + (next.x - current.x) * smoothT,
        y: current.y + (next.y - current.y) * smoothT
    };
}

// Resize handler
function resizeCanvas() {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

// Render function
function render() {
    // Smooth transitions for both zoom and pattern evolution
    zoom += (targetZoom - zoom) * 0.1;
    scrollProgress += (targetScrollProgress - scrollProgress) * PATTERN_TRANSITION_SPEED;
    
    resizeCanvas();
    gl.useProgram(program);

    // Get current Julia set parameter based on scroll progress
    const juliaParam = interpolatePatterns(scrollProgress);

    // Update uniforms
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(zoomLocation, zoom);
    gl.uniform2f(centerLocation, center.x, center.y);
    gl.uniform2f(juliaParamLocation, juliaParam.x, juliaParam.y);
    gl.uniform1f(timeLocation, (Date.now() - startTime) / 15000); // Slower color animation

    // Set up position attribute
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
}

// Scroll handler for continuous pattern evolution
let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
    const delta = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    
    // Update target scroll progress for pattern evolution
    targetScrollProgress += delta * SCROLL_SENSITIVITY;
    
    // Keep zoom within reasonable bounds
    const zoomFactor = 1.03; // Gentler zoom factor
    if (delta > 0) {
        targetZoom *= zoomFactor;
    } else {
        targetZoom /= zoomFactor;
    }
    targetZoom = Math.max(0.5, Math.min(targetZoom, 5.0));
});

// Start rendering
render(); 