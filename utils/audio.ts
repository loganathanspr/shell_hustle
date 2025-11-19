
// A simple synthesizer and TTS manager
class SoundManager {
  private ctx: AudioContext | null = null;
  private shuffleSource: AudioBufferSourceNode | null = null;
  private shuffleGain: GainNode | null = null;
  private shuffleFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  // Funny phrases for the game
  public phrases = {
    intro: [
      "Step right up! Try your luck!",
      "Three cups, one ball. It's easy money!",
      "The hand is faster than the eye, my friend.",
      "Don't blink, or you'll miss it!",
      "I hope you brought your wallet today!",
      "Pick a cup, any cup... just pick the right one.",
      "You look like a sharp one. Let's see what you got.",
      "Feeling lucky? Or just confident?",
      "Watch the ball, not my hands.",
      "Round and round she goes, where she stops, nobody knows!",
      "Focus. Total focus. Don't let me distract you.",
      "I've got a mortgage to pay, so lose gracefully, okay?",
      "My hands are slippery today. Or are they?",
      "Don't look at the bird! Focus on the cups!",
      "This ball is worth more than my car. Don't lose it.",
      "I learned this in prison... I mean, boarding school.",
      "Keep your eyes open and your wallet... nearby.",
      "Is that a cop behind you? Just kidding, watch the ball.",
      "Three cups. One ball. Infinite sadness if you lose.",
      "I'm not saying I'm magic, but I'm definitely not honest.",
      "Let's see if you're smarter than a 5th grader.",
      "Pay attention class is in session.",
      "I promise I won't cheat. Much.",
      "I practiced this move for 3 minutes. You're in trouble.",
      "Watch closely. I move faster than my ex-wife's lawyer.",
      "Put your money where your mouth is. Unless you're eating.",
      "No refunds for blinkers. House rules.",
      "I had too much coffee today, so good luck following these hands.",
      "Are you watching the ball? Or are you admiring my cups?",
      "Don't worry, I'm a professional. A professional hustler.",
      "Okay, serious face. Game face. Let's do this.",
      "If you win, I'll tell you a secret. If you lose, I keep your money.",
      "Ready? Set? Wait, I wasn't ready. Okay, now go.",
      "My grandmother plays faster than you. Let's go!",
      "I bet you 5 imaginary dollars you can't find it.",
      "Do you believe in miracles? You're gonna need one.",
      "Don't overthink it. That's how I get you."
    ],
    win: [
      "Beginner's luck! Pure beginner's luck.",
      "Hey, who taught you that? You're a pro!",
      "Winner winner, chicken dinner!",
      "I demand a rematch! Double or nothing?",
      "You got eyes like a hawk, I swear.",
      "Alright, alright, take the money and run.",
      "Unbelievable. Do you have x-ray vision?",
      "You're ruining my business here!",
      "Okay, you got me. Nice catch.",
      "Not bad... for an amateur.",
      "You must be counting cards! Wait, there are no cards.",
      "Beginner's luck is a powerful drug.",
      "Okay, who told you? Was it the bird?",
      "My kids are gonna starve tonight. Thanks a lot.",
      "I'm calling security. You're too good.",
      "Pure skill? Or pure accident? I'm watching you.",
      "You cracked the code! The code was 'look at the cup'.",
      "I hate losing. I really, really hate it.",
      "Take your winnings and get out of here before I cry.",
      "Wow. Just... wow. I need a drink.",
      "Stop taking all my money!",
      "Are you a wizard? You have to tell me if you're a wizard.",
      "You must be cheating. I'm telling mom.",
      "I'm going to go cry in the corner now. Don't follow me.",
      "Did you guess? Be honest, you guessed.",
      "That was luck. Pure, unadulterated luck.",
      "Fine. You win. But do you feel like a winner inside?",
      "I think the wind blew the cup over. That doesn't count.",
      "You're banned. Just kidding. Come back, I need my money back.",
      "Wait, did you use magnets? Everyone uses magnets these days.",
      "I looked away for one second! One second!",
      "Who are you? The Shell Whisperer?",
      "Okay, okay, you're the captain now.",
      "I suspect time travel was involved.",
      "My retirement fund just took a hit.",
      "Stop being so good at this. It's annoying."
    ],
    lose: [
      "Aaaand... it's gone!",
      "Were you even watching the cups?",
      "Donation accepted! No refunds!",
      "Better luck next time, champ.",
      "Too slow! You gotta be faster than that!",
      "Your eyes played tricks on you, didn't they?",
      "Close, but 'close' doesn't pay the rent.",
      "Maybe stick to Tic-Tac-Toe?",
      "I told you, the hand is faster than the eye.",
      "Ouch. That was painful to watch.",
      "Thanks for the contribution to the fund.",
      "And that is why I drive a Mercedes.",
      "Look on the bright side, you made me richer.",
      "Did you blink? I saw you blink.",
      "It's not gambling if you know you're gonna lose.",
      "Faster than a cheetah on rollerblades.",
      "You picked the empty one. It's a metaphor for life.",
      "Don't quit your day job, buddy.",
      "I could do this in my sleep. In fact, I am asleep.",
      "Was the sun in your eyes? In this windowless room?",
      "Gravity is a harsh mistress.",
      "You're making this too easy for me.",
      "Easy come, easy go. Mostly go.",
      "Not even close! Were you watching the ceiling?",
      "Gravity 1, You 0.",
      "Maybe try closing one eye? No, wait, open both.",
      "I saw a squirrel, did you see it? Distracted you, didn't I?",
      "Your wallet looks lighter. It suits you.",
      "It was lag. Must have been the WiFi.",
      "You zigged when you should have zagged.",
      "Are you sure you're wearing your glasses?",
      "That cup was empty yesterday too.",
      "I'd offer you a refund, but I already spent it.",
      "Wrong cup. Right spirit, but wrong cup.",
      "Swing and a miss!",
      "Do you want a map? I can draw you a map.",
      "I felt that loss in my soul. Oof.",
      "Next time, try using The Force."
    ]
  };

  constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initNoiseBuffer();
      
      // Initialize Voices immediately
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        this.loadVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    } catch (e) {
      console.warn("Web Audio API not supported");
    }
  }

  // Wait for voices to load if necessary
  async ensureVoicesLoaded(): Promise<void> {
    if (this.voices.length > 0) return;
    
    return new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
            this.loadVoices();
            if (this.voices.length > 0 || attempts > 10) {
                resolve();
            } else {
                attempts++;
                setTimeout(check, 100);
            }
        };
        check();
    });
  }

  private loadVoices() {
    const allVoices = window.speechSynthesis.getVoices();
    this.voices = allVoices;
  }

  private getContext() {
    if (!this.ctx) return null;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // Create a buffer of noise for the shuffle sliding sound
  private initNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // White noise is cleaner for sliding sounds than pink noise
      data[i] = (Math.random() * 2 - 1) * 0.5; 
    }
    this.noiseBuffer = buffer;
  }

  playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  playLift() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  playWin() {
    const ctx = this.getContext();
    if (!ctx) return;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  playLose() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }

  // --- Shuffle Sounds ---
  startShuffle() {
    const ctx = this.getContext();
    if (!ctx || !this.noiseBuffer) return;
    
    this.stopShuffle();

    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    
    const highPass = ctx.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 500;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.0;
    filter.frequency.value = 400;

    const gain = ctx.createGain();
    gain.gain.value = 0; 

    source.connect(highPass);
    highPass.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();
    
    this.shuffleSource = source;
    this.shuffleFilter = filter;
    this.shuffleGain = gain;
  }

  updateShuffle(speed: number, pulse: number = 1.0) {
    const ctx = this.getContext();
    if (!ctx || !this.shuffleFilter || !this.shuffleGain) return;

    const targetFreq = 400 + (speed * 250);
    const baseVolume = Math.min(speed / 6, 1) * 0.3; 
    const targetGain = baseVolume * (0.2 + 0.8 * pulse);

    this.shuffleFilter.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.05);
    this.shuffleGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.02); 
  }

  stopShuffle() {
    const ctx = this.getContext();
    if (!ctx || !this.shuffleSource || !this.shuffleGain) return;

    this.shuffleGain.gain.cancelScheduledValues(ctx.currentTime);
    this.shuffleGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    
    const source = this.shuffleSource;
    setTimeout(() => {
        try { source.stop(); } catch(e) {} 
        source.disconnect();
    }, 200);

    this.shuffleSource = null;
    this.shuffleFilter = null;
    this.shuffleGain = null;
  }

  // Text to Speech Commentary
  speak(text: string, emotion: 'intro' | 'win' | 'lose' = 'intro', retryCount = 0) {
    if (!window.speechSynthesis) return;
    
    // RETRY LOGIC: If voices aren't loaded yet, wait a bit and try again
    // This fixes the "Female Voice at Start" bug where it defaults before loading male voices
    if (this.voices.length === 0 && retryCount < 5) {
        this.loadVoices(); // Attempt force load
        setTimeout(() => this.speak(text, emotion, retryCount + 1), 100);
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Voice Selection: STRICT MALE PREFERENCE
    // "Google UK English Male" is often the best quality
    const preferredVoice = 
      this.voices.find(v => v.name === 'Google UK English Male') || 
      this.voices.find(v => v.name.includes('Daniel')) || // Mac High Quality
      this.voices.find(v => v.name.includes('David')) || // Windows High Quality
      this.voices.find(v => v.name.includes('Mark')) ||  // Windows
      this.voices.find(v => v.name.includes('Male') && v.lang.includes('en'));

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    // LENTHENED VOICE: Slower rate, slightly deeper pitch
    // 0.85 rate makes it sound more deliberate/lengthened
    const baseRate = 0.85; 
    const basePitch = 0.9;
    const variance = (Math.random() * 0.1) - 0.05; 

    if (emotion === 'win') {
        utterance.rate = baseRate + 0.05; // Slightly faster but still deliberate
        utterance.pitch = basePitch + 0.1 + variance; 
    } else if (emotion === 'lose') {
        utterance.rate = baseRate - 0.05; // Even slower mocking
        utterance.pitch = basePitch - 0.1 + variance;
    } else {
        utterance.rate = baseRate;
        utterance.pitch = basePitch + variance;
    }
    
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  }
  
  getRandomPhrase(type: 'intro' | 'win' | 'lose'): string {
    const list = this.phrases[type];
    return list[Math.floor(Math.random() * list.length)];
  }
}

export const audio = new SoundManager();
