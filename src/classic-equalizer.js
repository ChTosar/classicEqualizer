class ClassicEqualizer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.fps = 30;
        this.rows = 40;
        this.cols = 8;
        this.debug = false;

        // On Hz
        this.frequencyRanges = [
            32, 60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000
        ];

        this.barsMarginY = 2.5;
        this.barsMarginX = 2.5;
        this.barBorderRadius = 2;
        const clientWidth = 1200;
        const clientHeight = 800;

        this.barWidth = (clientWidth - (this.barsMarginX*2)*this.cols) / this.cols;
        this.barHeight = (clientHeight - (this.barsMarginY*2)*this.rows) / this.rows;

        this.type = this.getAttribute('type') || 'canvas';

        const colors = JSON.parse(this.getAttribute('colors') || '{"barBgColor": "#222222", "barColor": "#d7f0ff", "barColor2": "#a6c0ba", "barColor3": "#fcb750"}');
        this.barBgColor = colors.barBgColor;
        this.barColor = colors.barColor;
        this.barColor2 = colors.barColor2;
        this.barColor3 = colors.barColor3;
        const src = this.getAttribute('src');

        this.shadowRoot.innerHTML = `
            <canvas id="equalizer" width="${clientWidth}" height="${clientHeight}" style="display: none;"></canvas>
            <div id="domEqualizer" style="display: none;"></div>
            <div class="frequencys"></div>
            <audio id="audio" src="${src}" controls></audio>
            <style>
                canvas {
                    border: 0px solid #000;
                    display: block;
                    margin-bottom: ${this.barsMarginY}px;
                    margin-left: ${this.barsMarginX}px;
                }
                #domEqualizer {
                    width: ${clientWidth}px;
                    height: ${clientHeight}px;
                    background-color: #000;
                    transform: scale(-1, 1);
                }
                #domEqualizer div {
                    display: inline-block;
                    margin: ${this.barsMarginY}px ${this.barsMarginX}px;
                    margin-bottom: ${this.barsMarginY-4}px;
                    opacity: 1;
                    border-radius: ${this.barBorderRadius}px;
                    height: ${this.barHeight}px;
                    width: ${this.barWidth}px;
                }
                audio {
                    width: 100%;
                    margin-top: 20px;
                }
                :host {
                    display: block;
                    padding: 20px;  
                }
            </style>`;

        for (let divs = this.rows*this.cols; divs > 0; divs--) {
            const div = document.createElement('div');
            this.shadowRoot.getElementById('domEqualizer').appendChild(div);
        }
        
        this.audio = this.shadowRoot.getElementById('audio');
        this.canvas = this.shadowRoot.getElementById('equalizer');
        this.domEqualizer = this.shadowRoot.getElementById('domEqualizer');
        this.ctx = this.canvas.getContext('2d');
        this.oldPos = [];
        this.dataArray = [];
        this.stop = false;

        this.audio.addEventListener('play', () => {

            if (this.stop) {
                this.stop = false;
                this.animate();
            }

            if (!this.analyser) {
                this.analyser = new (window.AudioContext || window.webkitAudioContext)().createAnalyser();
                this.source = this.analyser.context.createMediaElementSource(this.audio);
                this.source.connect(this.analyser);
                this.analyser.connect(this.analyser.context.destination);
                this.analyser.fftSize = 1024;
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            }
        });

        this.audio.addEventListener('pause', () => {
            this.stop = true;
        });
    }

    groupedFrequencies(dataArray) {

        if (!this.analyser) {
            return [];
        }

        const bufferLength = this.analyser.frequencyBinCount;
        const sampleRate = this.analyser.context.sampleRate;
        const nyquist = sampleRate / 2;
    
        const numBars = this.frequencyRanges.length;
        const bars = new Array(numBars).fill(0);

        const binRanges = this.frequencyRanges.map(freq => Math.floor((freq / nyquist) * bufferLength));
    
        for (let i = 0; i < bufferLength; i++) {
            for (let j = 0; j < numBars; j++) {
                if (i <= binRanges[j]) {
                    bars[j] += dataArray[i];
                    break;
                }
            }
        }
    
        const binCounts = new Array(numBars).fill(0);
        for (let i = 0; i < bufferLength; i++) {
            for (let j = 0; j < numBars; j++) {
                if (i <= binRanges[j]) {
                    binCounts[j] += 1;
                    break;
                }
            }
        }
    
        for (let i = 0; i < numBars; i++) {
            if (binCounts[i] > 0) {
                bars[i] = Math.floor(bars[i] / binCounts[i]);
            }
        }
    
        return this.columnsTransform(bars);
    }
    
    static get observedAttributes() {
        return ['type', 'colors', 'src'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'type':
                this.type = newValue;
                break;
            case 'src':
                this.audio.src = newValue;
                break;
            case 'colors':
                try {
                    newValue = JSON.parse(newValue);
                    this.barBgColor = newValue.barBgColor;
                    this.barColor = newValue.barColor;
                    this.barColor2 = newValue.barColor2;
                    this.barColor3 = newValue.barColor3;
                } catch (e) {
                    console.error('Error parsing colors config:', e);
                }
                break;
        }

        this.animate();
    }

    connectedCallback() {
       this.animate();
    }

    animate() {
        const interval = 1000 / this.fps;
        let lastTime = 0;

        const loop = (currentTime) => {
            if (!this.stop) {
                const deltaTime = currentTime - lastTime;
                if (deltaTime >= interval) {
                    lastTime = currentTime;
                    if (this.analyser) {
                        this.analyser.getByteFrequencyData(this.dataArray);
                    }

                    if (this.type === 'canvas') {
                        this.draw();
                    } else if (this.type === 'html') {
                        this.htmlDraw();
                    }
                }
            }
            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    columnsTransform(arr, newSize = this.cols) {
        let resultado = [];
        let escala = (arr.length - 1) / (newSize - 1);

        if (escala == 1) {
            return arr;
        }

        for (let i = 0; i < newSize; i++) {
            let pos = i * escala;
            let minIndex = Math.floor(pos);
            let maxIndex = Math.ceil(pos);
    
            if (minIndex === maxIndex) {
                resultado.push(arr[minIndex]);
            } else {
                let pesoSuperior = pos - minIndex;
                let pesoInferior = 1 - pesoSuperior;
                let valorInterpolado = arr[minIndex] * pesoInferior + arr[maxIndex] * pesoSuperior;
                resultado.push(valorInterpolado);
            }
        }
    
        return resultado;
    }
    
    draw() {
        this.canvas.style.display = 'block';
        this.domEqualizer.style.display = 'none';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
        const barWidth = this.barWidth;
        const barHeight = this.barHeight;
    
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                let x = col * (barWidth + this.barsMarginX*2);
                let y = this.canvas.height - (row * (barHeight + this.barsMarginY*2)) - barHeight;
    
                let borderRadius = Math.min(this.barBorderRadius, barWidth / 2, barHeight / 2);
    
                this.ctx.fillStyle = this.getColor(row, col);
                this.ctx.globalAlpha = 1;
    
                this.ctx.beginPath();
                this.ctx.moveTo(x + borderRadius, y);
                this.ctx.lineTo(x + barWidth - borderRadius, y);
                this.ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + borderRadius);
                this.ctx.lineTo(x + barWidth, y + barHeight - borderRadius);
                this.ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth - borderRadius, y + barHeight);
                this.ctx.lineTo(x + borderRadius, y + barHeight);
                this.ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - borderRadius);
                this.ctx.lineTo(x, y + borderRadius);
                this.ctx.quadraticCurveTo(x, y, x + borderRadius, y);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
    
        this.oldPos = [...this.dataArray];
    }    

    htmlDraw() {
       this.domEqualizer.style.display = 'block';
       this.canvas.style.display = 'none';

       let children = this.cols * this.rows;

       for (let row = 0; row < this.rows; row++) {

        for (let col = 0; col < this.cols; col++) {

            const bar = this.domEqualizer.children[--children];

            bar.style.backgroundColor = this.getColor(row, col);
        }
       }

       this.oldPos = [...this.dataArray];
    }

    getColor(row, col) {

        const dataArray = this.groupedFrequencies(this.dataArray);

        if (this.debug) {
            this.shadowRoot.querySelector('.frequencys').innerHTML = dataArray.map(value => Math.floor(value)).join(', ');
        }

        const dataArrayHeight = dataArray[col];
        const oldPosHeight = this.groupedFrequencies(this.oldPos)[col];
        
        if (dataArrayHeight >= (row + 1) * (255 / this.rows)) {

            return this.barColor;

        } else if (oldPosHeight >= (row + 1) * (255 / this.rows)) {

            return this.barColor2;

        } else if ( (oldPosHeight > dataArrayHeight ? oldPosHeight : dataArrayHeight) >= (row) * (255 / this.rows)) {

            return this.barColor3;

        } else {                    
            return this.barBgColor;
        }

    }

}

customElements.define('classic-equalizer', ClassicEqualizer); 