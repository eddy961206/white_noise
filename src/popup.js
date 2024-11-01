// 오디오 컨텍스트 및 노이즈 생성을 위한 클래스
class NoiseGenerator {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
        this.currentSource = null;
        this.isPlaying = false;
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
        }
        return buffer;
    }

    play(type) {
        this.stop();
        
        if (['white', 'pink', 'brown'].includes(type)) {
            const buffer = this.createNoiseBuffer(type);
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.connect(this.gainNode);
            source.start();
            this.currentSource = source;
        } else {
            const audio = new Audio(`src/audio/${type}.mp3`);
            audio.loop = true;
            const source = this.audioContext.createMediaElementSource(audio);
            source.connect(this.gainNode);
            audio.play();
            this.currentSource = { audio, stop: () => audio.pause() };
        }
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
        this.gainNode.gain.value = value / 100;
    }
}

// 메인 앱 로직
$(() => {
    const noiseGenerator = new NoiseGenerator();
    let settings = {
        type: 'white',
        volume: 50,
        isPlaying: false
    };

    // 저장된 설정 로드
    chrome.storage.local.get(['noiseSettings'], (result) => {
        if (result.noiseSettings) {
            settings = { ...settings, ...result.noiseSettings };
            $('#noiseType').val(settings.type);
            $('#volume').val(settings.volume);
            $('#volumeValue').text(`${settings.volume}%`);
            
            if (settings.isPlaying) {
                noiseGenerator.play(settings.type);
                noiseGenerator.setVolume(settings.volume);
                $('.play-icon').text('⏸');
            }
        }
    });

    // 설정 저장 함수
    const saveSettings = () => {
        chrome.storage.local.set({
            noiseSettings: settings
        });
    };

    // 이벤트 핸들러
    $('#playPause').on('click', () => {
        if (settings.isPlaying) {
            noiseGenerator.stop();
            $('.play-icon').text('▶');
            settings.isPlaying = false;
        } else {
            noiseGenerator.play(settings.type);
            noiseGenerator.setVolume(settings.volume);
            $('.play-icon').text('⏸');
            settings.isPlaying = true;
        }
        saveSettings();
    });

    $('#noiseType').on('change', function() {
        settings.type = $(this).val();
        if (settings.isPlaying) {
            noiseGenerator.play(settings.type);
            noiseGenerator.setVolume(settings.volume);
        }
        saveSettings();
    });

    $('#volume').on('input', function() {
        const value = parseInt($(this).val());
        settings.volume = value;
        $('#volumeValue').text(`${value}%`);
        noiseGenerator.setVolume(value);
        saveSettings();
    });
}); 