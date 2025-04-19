// WebGL Shader Sources
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
    uniform int fractalType;
    uniform int colorScheme;
    uniform int maxIterations;
    uniform vec2 juliaParam;

    vec2 cMul(vec2 a, vec2 b) {
        return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
    }

    vec2 cConj(vec2 z) {
        return vec2(z.x, -z.y);
    }

    vec3 oceanPalette(float t) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.0, 0.33, 0.67);
        return a + b * cos(6.28318 * (c * t + d));
    }

    vec3 firePalette(float t) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.0, 0.15, 0.2);
        return a + b * cos(6.28318 * (c * t + d));
    }

    vec3 forestPalette(float t) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 0.5);
        vec3 d = vec3(0.3, 0.2, 0.2);
        return a + b * cos(6.28318 * (c * t + d));
    }

    vec3 cosmicPalette(float t) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 0.7, 0.4);
        vec3 d = vec3(0.0, 0.15, 0.2);
        return a + b * cos(6.28318 * (c * t + d));
    }

    vec3 getColor(float t) {
        if (colorScheme == 0) return oceanPalette(t);
        if (colorScheme == 1) return firePalette(t);
        if (colorScheme == 2) return forestPalette(t);
        return cosmicPalette(t);
    }

    vec2 iteratePoint(vec2 z, vec2 c) {
        if (fractalType == 0) { // Julia
            return cMul(z, z) + juliaParam;
        }
        else if (fractalType == 1) { // Mandelbrot
            return cMul(z, z) + c;
        }
        else if (fractalType == 2) { // Burning Ship
            z = vec2(abs(z.x), abs(z.y));
            return cMul(z, z) + c;
        }
        else { // Tricorn
            return cMul(cConj(z), cConj(z)) + c;
        }
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        uv = uv / zoom + center;
        
        vec2 z = fractalType == 0 ? uv : vec2(0.0);
        vec2 c = fractalType == 0 ? juliaParam : uv;
        
        float iter = 0.0;
        
        for(int i = 0; i < 1000; i++) {
            if (i >= maxIterations) break;
            z = iteratePoint(z, c);
            if(dot(z, z) > 4.0) {
                iter = float(i);
                break;
            }
        }
        
        if(iter == 0.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        } else {
            float smooth_iter = iter - log2(log2(dot(z, z))) + 4.0;
            float t = smooth_iter * 0.015 + time * 0.1;
            
            vec3 color = getColor(t);
            float glow = exp(-smooth_iter * 0.03);
            color += vec3(0.2, 0.1, 0.3) * glow;
            
            gl_FragColor = vec4(color, 1.0);
        }
    }
`;

class FractalRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl');
        if (!this.gl) {
            alert('WebGL not supported');
            return;
        }

        // Initialize properties
        this.fractalType = 'mandelbrot';
        this.colorScheme = 'ocean';
        this.maxIterations = 100;
        this.zoom = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Initialize WebGL
        this.initShaders();
        this.initBuffers();
        this.setupEventListeners();
        this.resizeCanvas();
        this.render();
    }

    initShaders() {
        const vertexShaderSource = `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const fragmentShaderSource = `
            precision highp float;
            uniform vec2 resolution;
            uniform vec2 offset;
            uniform float zoom;
            uniform int maxIterations;
            uniform int fractalType;
            uniform int colorScheme;

            vec3 getColor(float t, int scheme) {
                if (scheme == 0) { // Ocean
                    return vec3(0.1 + 0.5 * sin(3.0 * t),
                              0.2 + 0.5 * sin(3.1 * t),
                              0.3 + 0.5 * sin(3.2 * t));
                } else if (scheme == 1) { // Fire
                    return vec3(0.5 + 0.5 * sin(2.0 * t),
                              0.3 * sin(3.0 * t),
                              0.1 * sin(4.0 * t));
                } else if (scheme == 2) { // Forest
                    return vec3(0.2 * sin(3.0 * t),
                              0.4 + 0.4 * sin(2.0 * t),
                              0.1 * sin(4.0 * t));
                } else { // Cosmic
                    return vec3(0.5 + 0.5 * sin(4.0 * t),
                              0.5 + 0.5 * sin(5.0 * t),
                              0.5 + 0.5 * sin(6.0 * t));
                }
            }

            vec2 complexSquare(vec2 z) {
                return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
            }

            vec2 complexAbs(vec2 z) {
                return vec2(abs(z.x), abs(z.y));
            }

            vec2 complexConj(vec2 z) {
                return vec2(z.x, -z.y);
            }

            void main() {
                vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.x, resolution.y);
                vec2 c = uv * (4.0 / zoom) + offset;
                vec2 z = vec2(0.0);
                
                if (fractalType == 1) { // Julia Set
                    z = c;
                    c = vec2(0.285, 0.01);
                }

                float n = 0.0;
                for(int i = 0; i < 1000; i++) {
                    if (i >= maxIterations) break;
                    
                    if (fractalType == 0 || fractalType == 1) { // Mandelbrot or Julia
                        z = complexSquare(z) + c;
                    } else if (fractalType == 2) { // Burning Ship
                        z = complexSquare(complexAbs(z)) + c;
                    } else if (fractalType == 3) { // Tricorn
                        z = complexSquare(complexConj(z)) + c;
                    }
                    
                    if (dot(z, z) > 4.0) {
                        break;
                    }
                    n += 1.0;
                }

                if (n >= float(maxIterations)) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                } else {
                    float t = n / float(maxIterations);
                    vec3 color = getColor(6.28318 * t, colorScheme);
                    gl_FragColor = vec4(color, 1.0);
                }
            }
        `;

        // Create and compile vertex shader
        const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vertexShader, vertexShaderSource);
        this.gl.compileShader(vertexShader);

        if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
            console.error('Vertex shader compilation failed:', 
                this.gl.getShaderInfoLog(vertexShader));
            return;
        }

        // Create and compile fragment shader
        const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fragmentShader, fragmentShaderSource);
        this.gl.compileShader(fragmentShader);

        if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
            console.error('Fragment shader compilation failed:', 
                this.gl.getShaderInfoLog(fragmentShader));
            return;
        }

        // Create and link program
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Program linking failed:', 
                this.gl.getProgramInfoLog(this.program));
            return;
        }

        this.gl.useProgram(this.program);

        // Get uniform locations
        this.uniforms = {
            resolution: this.gl.getUniformLocation(this.program, 'resolution'),
            offset: this.gl.getUniformLocation(this.program, 'offset'),
            zoom: this.gl.getUniformLocation(this.program, 'zoom'),
            maxIterations: this.gl.getUniformLocation(this.program, 'maxIterations'),
            fractalType: this.gl.getUniformLocation(this.program, 'fractalType'),
            colorScheme: this.gl.getUniformLocation(this.program, 'colorScheme')
        };
    }

    initBuffers() {
        // Create vertex buffer for a full-screen quad
        const vertices = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ]);

        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(this.program, 'position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());

        // Handle mouse wheel for zooming
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom *= zoomFactor;
            this.render();
        });

        // Handle mouse drag for panning
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const dx = (e.clientX - this.lastMouseX) / (this.canvas.width * this.zoom);
            const dy = (e.clientY - this.lastMouseY) / (this.canvas.height * this.zoom);
            
            this.offsetX -= dx * 4;
            this.offsetY += dy * 4;
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            
            this.render();
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        // Handle double click to reset view
        this.canvas.addEventListener('dblclick', () => {
            this.zoom = 1.0;
            this.offsetX = 0;
            this.offsetY = 0;
            this.render();
        });
    }

    resizeCanvas() {
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
        this.render();
    }

    render() {
        // Set uniforms
        this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        this.gl.uniform2f(this.uniforms.offset, this.offsetX, this.offsetY);
        this.gl.uniform1f(this.uniforms.zoom, this.zoom);
        this.gl.uniform1i(this.uniforms.maxIterations, this.maxIterations);
        this.gl.uniform1i(this.uniforms.fractalType, this.getFractalTypeIndex());
        this.gl.uniform1i(this.uniforms.colorScheme, this.getColorSchemeIndex());

        // Draw
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    getFractalTypeIndex() {
        const types = {
            'mandelbrot': 0,
            'julia': 1,
            'burningship': 2,
            'tricorn': 3
        };
        return types[this.fractalType] || 0;
    }

    getColorSchemeIndex() {
        const schemes = {
            'ocean': 0,
            'fire': 1,
            'forest': 2,
            'cosmic': 3
        };
        return schemes[this.colorScheme] || 0;
    }

    setFractalType(type) {
        this.fractalType = type;
        this.render();
    }

    setColorScheme(scheme) {
        this.colorScheme = scheme;
        this.render();
    }

    setMaxIterations(iterations) {
        this.maxIterations = iterations;
        this.render();
    }
}

// Initialize the fractal renderer when the page loads
window.addEventListener('load', () => {
    const canvas = document.getElementById('fractalCanvas');
    const renderer = new FractalRenderer(canvas);

    // Set up UI controls
    document.getElementById('fractalType').addEventListener('change', (e) => {
        renderer.setFractalType(e.target.value);
    });

    document.getElementById('colorScheme').addEventListener('change', (e) => {
        renderer.setColorScheme(e.target.value);
    });

    document.getElementById('iterations').addEventListener('input', (e) => {
        renderer.setMaxIterations(parseInt(e.target.value));
    });
}); 