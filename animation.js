// Background Canvas Animation

(function() {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let mouseParticles = [];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Mouse Move Effect
    let mouse = { x: null, y: null };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        // Add particles on move
        for(let i=0; i<2; i++){
            mouseParticles.push(new Particle('mouseTrail', mouse.x, mouse.y));
        }
    });

    // Click Effect (New Interaction)
    window.addEventListener('click', (e) => {
        // Spawn a burst of hearts and particles
        for(let i=0; i<8; i++){
            mouseParticles.push(new Particle('mouseTrail', e.clientX, e.clientY));
        }
        // Spawn a few temporary hearts that float up
        for(let i=0; i<3; i++){
            const p = new Particle('heart');
            p.x = e.clientX;
            p.y = e.clientY;
            p.vx = (Math.random() - 0.5) * 4;
            p.vy = -2 - Math.random() * 3; // Move up faster
            p.decay = 0.01 + Math.random() * 0.01; // Fade faster
            particles.push(p);
        }
    });

    class Particle {
        constructor(type, x, y) {
            this.type = type;
            this.initialX = x;
            this.initialY = y;
            this.init();
        }

        init() {
            if (this.type === 'heart') {
                this.x = Math.random() * width;
                this.y = height + Math.random() * 100;
                this.vx = (Math.random() - 0.5) * 1;
                this.vy = -1 - Math.random() * 2;
                this.size = 10 + Math.random() * 15;
                this.life = 1;
                this.decay = 0.002 + Math.random() * 0.005;
                this.color = `rgba(255, ${150 + Math.random() * 50}, ${150 + Math.random() * 50},`;
            } else if (this.type === 'firefly') {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = (Math.random() - 0.5) * 0.3;
                this.size = 1 + Math.random() * 2;
                this.alpha = Math.random();
                this.alphaSpeed = 0.005 + Math.random() * 0.01;
            } else if (this.type === 'snow') {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vy = 0.5 + Math.random() * 1; 
                this.vx = (Math.random() - 0.5) * 0.5;
                this.size = 1 + Math.random() * 2;
            } else if (this.type === 'meteor') {
                this.resetMeteor();
            } else if (this.type === 'mouseTrail') {
                this.x = this.initialX;
                this.y = this.initialY;
                this.size = Math.random() * 5 + 2;
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = (Math.random() - 0.5) * 2;
                this.life = 1;
                this.decay = 0.03 + Math.random() * 0.03;
                this.color = `rgba(${200 + Math.random() * 55}, ${150 + Math.random() * 105}, ${200 + Math.random() * 55},`;
            }
        }

        resetMeteor() {
                this.x = Math.random() * width * 1.5 - width * 0.25; // Wide range
                this.y = -100;
                this.vx = -4 - Math.random() * 4; 
                this.vy = 4 + Math.random() * 4; 
                this.size = 2 + Math.random();
                this.len = 50 + Math.random() * 80;
                this.life = 0; // Delay counter
                this.maxLife = Math.random() * 200; // Random delay
                this.active = false;
        }

        update() {
            if (this.type === 'heart') {
                this.x += this.vx;
                this.y += this.vy;
                this.life -= this.decay;
                this.x += Math.sin(this.life * 10) * 0.5;
                if (this.life <= 0) this.init();
            } else if (this.type === 'firefly') {
                this.x += this.vx;
                this.y += this.vy;
                
                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;

                this.alpha += this.alphaSpeed;
                if (this.alpha > 1 || this.alpha < 0) {
                    this.alphaSpeed *= -1;
                }
            } else if (this.type === 'snow') {
                this.y += this.vy;
                this.x += this.vx + Math.sin(this.y * 0.01) * 0.2;
                
                if (this.y > height) {
                    this.y = -10;
                    this.x = Math.random() * width;
                }
            } else if (this.type === 'meteor') {
                if (!this.active) {
                    this.life++;
                    if (this.life > this.maxLife) {
                        this.active = true;
                        this.x = Math.random() * width + 200; // Start mostly right side to move left-down
                        this.y = -100;
                    }
                } else {
                    this.x += this.vx;
                    this.y += this.vy;
                    
                    if (this.x < -this.len || this.y > height + this.len) {
                        this.resetMeteor();
                    }
                }
            } else if (this.type === 'mouseTrail') {
                this.x += this.vx;
                this.y += this.vy;
                this.life -= this.decay;
                this.size *= 0.95; // Shrink
            }
        }

        draw() {
            if (this.type === 'heart') {
                ctx.fillStyle = this.color + this.life + ')';
                ctx.beginPath();
                const s = this.size;
                const x = this.x;
                const y = this.y;
                ctx.moveTo(x, y + s / 4);
                ctx.quadraticCurveTo(x, y, x - s / 2, y);
                ctx.quadraticCurveTo(x - s, y, x - s, y + s / 2);
                ctx.quadraticCurveTo(x - s, y + s, x, y + s * 1.5);
                ctx.quadraticCurveTo(x + s, y + s, x + s, y + s / 2);
                ctx.quadraticCurveTo(x + s, y, x + s / 2, y);
                ctx.quadraticCurveTo(x, y, x, y + s / 4);
                ctx.fill();
            } else if (this.type === 'firefly') {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                // Changed to Gold/Yellow to be visible on light background
                ctx.fillStyle = `rgba(255, 215, 0, ${Math.abs(this.alpha)})`; 
                ctx.shadowBlur = 8;
                ctx.shadowColor = "rgba(255, 215, 0, 0.8)";
                ctx.fill();
                ctx.shadowBlur = 0;
            } else if (this.type === 'snow') {
                    // Changed to Lavender/Blueish to be visible on light background
                    ctx.fillStyle = `rgba(179, 157, 219, 0.8)`;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
            } else if (this.type === 'meteor' && this.active) {
                ctx.beginPath();
                const gradient = ctx.createLinearGradient(this.x, this.y, this.x - this.vx * 10, this.y - this.vy * 10);
                // Changed to Purple/Pink gradient
                gradient.addColorStop(0, "rgba(255, 105, 180, 1)"); // HotPink
                gradient.addColorStop(1, "rgba(255, 105, 180, 0)");
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2;
                ctx.lineCap = "round";
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x - this.vx * (this.len/5), this.y - this.vy * (this.len/5));
                ctx.stroke();
            } else if (this.type === 'mouseTrail') {
                ctx.fillStyle = this.color + this.life + ')';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    for (let i = 0; i < 15; i++) particles.push(new Particle('heart'));
    for (let i = 0; i < 30; i++) particles.push(new Particle('firefly'));
    for (let i = 0; i < 40; i++) particles.push(new Particle('snow'));
    for (let i = 0; i < 3; i++) particles.push(new Particle('meteor'));

    function animate() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => p.update());
        particles.forEach(p => p.draw());

        // Handle mouse particles
        for (let i = 0; i < mouseParticles.length; i++) {
            mouseParticles[i].update();
            mouseParticles[i].draw();
            if (mouseParticles[i].life <= 0) {
                mouseParticles.splice(i, 1);
                i--;
            }
        }

        requestAnimationFrame(animate);
    }
    animate();
})();
