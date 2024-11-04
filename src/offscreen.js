class NoiseGenerator {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.audioContext.createGain();
        this.currentSource = null;
        this.isPlaying = false;
        this.currentVolume = 20;
        
        // 커스텀 노이즈 설정
        this.customSettings = {
            frequency: 440,
            resonance: 0.5,
            modulation: 0.3,
            filterCutoff: 1000
        };
        
        // 필터 노드 설정 (커스텀 노이즈용)
        this.filterNode = this.audioContext.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = this.customSettings.filterCutoff;
        this.filterNode.Q.value = this.customSettings.resonance;
        
        // 커스텀 노이즈용 게인 노드
        this.customGainNode = this.audioContext.createGain();
        
        // 노드 연결 (커스텀 노이즈 경로)
        this.filterNode.connect(this.customGainNode);
        this.customGainNode.connect(this.audioContext.destination);
        
        // 기본 노이즈 경로
        this.gainNode.connect(this.audioContext.destination);
        
        // 초기 볼륨 설정
        this.gainNode.gain.value = this.currentVolume / 100;
        this.customGainNode.gain.value = this.currentVolume / 100;
    }

    createNoiseBuffer(type) {
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        switch(type) {
            case 'white':
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                break;
            case 'pink':
                let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980;
                    data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                    data[i] *= 0.11;
                }
                break;
            case 'brown':
                let lastOut = 0.0;
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    data[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = data[i];
                    data[i] *= 3.5;
                }
                break;
            case 'violet':
                // 고주파 강조 노이즈
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    data[i] = (Math.random() - Math.random()) * 0.5;
                }
                break;
            case 'grey':
                // 중간 주파수 강조 노이즈
                let lastValue = 0;
                for (let i = 0; i < bufferSize; i++) {
                    lastValue = (lastValue + Math.random() * 2 - 1) / 2;
                    data[i] = lastValue;
                }
                break;
            case 'custom':
                // 커스텀 노이즈 생성
                for (let i = 0; i < bufferSize; i++) {
                    const t = i / this.audioContext.sampleRate;
                    const base = Math.random() * 2 - 1;
                    const modulation = Math.sin(2 * Math.PI * this.customSettings.frequency * t) * this.customSettings.modulation;
                    data[i] = base * (1 + modulation);
                }
                break;
        }
        return buffer;
    }

    play(type) {
        this.stop();

        const buffer = this.createNoiseBuffer(type);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        
        if (type === 'custom') {
            source.connect(this.filterNode);
            this.customGainNode.gain.value = this.currentVolume / 100;
        } else {
            source.connect(this.gainNode);
            this.gainNode.gain.value = this.currentVolume / 100;
        }
        
        source.start();
        this.currentSource = source;
        this.isPlaying = true;
    }

    stop() {
        if (this.currentSource) {
            if (this.currentSource.stop) {
                this.currentSource.stop();
            } else {
                this.currentSource.audio.pause();
            }
            this.currentSource = null;
        }
        this.isPlaying = false;
    }

    setVolume(value) {
        this.currentVolume = value;
        // 두 게인 노드 모두 볼륨 설정
        this.gainNode.gain.value = value / 100;
        this.customGainNode.gain.value = value / 100;
    }

    setCustomParameter(param, value) {
        this.customSettings[param] = value;
        
        switch(param) {
            case 'filterCutoff':
                this.filterNode.frequency.value = value;
                break;
            case 'resonance':
                this.filterNode.Q.value = value;
                break;
        }
        
        // 현재 재생 중이고 커스텀 노이즈인 경우 업데이트
        if (this.isPlaying && this.currentSource) {
            this.play('custom');
        }
    }

    setCustomPreset(preset) {
        Object.keys(preset).forEach(param => {
            if (param !== 'name') {
                this.setCustomParameter(param, preset[param]);
            }
        });
    }
}

const noiseGenerator = new NoiseGenerator();

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    let handled = false;

    switch (request.action) {
        case 'play':
            noiseGenerator.play(request.noiseType);
            handled = true;
            break;
        case 'stop':
            noiseGenerator.stop();
            handled = true;
            break;
        case 'setVolume':
            noiseGenerator.setVolume(request.volume);
            handled = true;
            break;
        case 'getState':
            sendResponse({ isPlaying: noiseGenerator.isPlaying });
            handled = true;
            break;
        case 'setCustomParameter':
            noiseGenerator.setCustomParameter(request.param, request.value);
            handled = true;
            break;
        case 'setCustomPreset':
            noiseGenerator.setCustomPreset(request.preset);
            handled = true;
            break;
    }
});

// Offscreen 문서가 로드되면 background에 알림
chrome.runtime.sendMessage({ action: 'offscreenReady' }).catch(error => {
    console.error('Offscreen ready 메시지 전송 실패:', error);
});