// Shader code
const vertexShaderSource = `
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
    precision highp float;
    
    uniform vec2 resolution;
    uniform float zoom;
    uniform vec2 center;
    uniform float time;
    uniform vec2 juliaParam;

    vec2 cMul(vec2 a, vec2 b) {
        return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
    }

    vec3 palette(float t) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.0, 0.33, 0.67);
        return a + b * cos(6.28318 * (c * t + d));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        
        uv = uv / zoom + center;
        
        vec2 z = uv;
        float iter = 0.0;
        const float MAX_ITER = 360.0;

        for(float i = 0.0; i < MAX_ITER; i++) {
            z = cMul(z, z) + juliaParam;
            if(dot(z, z) > 4.0) {
                iter = i;
                break;
            }
        }
        
        if(iter == 0.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        } else {
            float smooth_iter = iter - log2(log2(dot(z, z))) + 4.0;
            float t = smooth_iter * 0.015 + time * 0.1;
            
            t += length(z) * 0.1;
            
            vec3 color = palette(t);
            
            float glow = exp(-smooth_iter * 0.03);
            color += vec3(0.2, 0.1, 0.3) * glow;
            
            gl_FragColor = vec4(color, 1.0);
        }
    }
`;

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
const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

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
let zoom = 6.0;
let targetZoom = zoom;
let scrollProgress = 0.1;
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

// Function to update fractal zoom from external code
function updateFractalZoom(newZoom) {
    targetZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));
}

// Scroll-based zoom functionality
let lastScrollY = window.scrollY;
let ticking = false;
window.addEventListener('scroll', () => {
    if (!ticking) {
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

        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
        });
    }
});

// Fade out scroll indicator when scrolling starts
window.addEventListener('scroll', () => {
    const indicator = document.querySelector('.scroll-indicator');
    if (indicator) {
        if (window.scrollY > 50) {
            indicator.style.opacity = '0';
            indicator.style.transition = 'opacity 0.5s ease';
        } else {
            indicator.style.opacity = '1';
        }
    }
});

// Start rendering
render(); 