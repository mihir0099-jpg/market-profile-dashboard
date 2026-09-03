import os
import subprocess
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont
from gtts import gTTS
import static_ffmpeg

# Add ffmpeg to path
static_ffmpeg.add_paths()

# Output folder for temporary assets and final video
output_dir = "C:/Users/mihir/.gemini/antigravity/brain/0d19a8b8-947a-40b3-bff1-c041605b3a93"
os.makedirs(output_dir, exist_ok=True)

# Updated in-depth scenes
scenes = [
    {
        "title": "Welcome to Bhaichara AI Scanner",
        "subtitle": "Candle Charts vs. TPO Market Profile",
        "voiceover": "Welcome, traders. Today, we are opening the hood of the Bhaichara Market Profile Dashboard—a professional system designed to track smart money. Let’s start with the fundamental difference between standard Candle Charts and TPO Market Profiles. Standard candle charts only show what price did at a specific minute. They hide the auction structure. TPO—or Time Price Opportunity—shows how long price spent at each level. This reveals whether a price was accepted by big institutions or quickly rejected. TPO shows the underlying auction health, giving you the real story behind the candles.",
        "bullets": [
            "🕯️ Candle Charts: Show price history (Open, High, Low, Close)",
            "📊 TPO Market Profile: Shows time spent at price (Auction Acceptance)",
            "👁️ The Edge: Spot institutional accumulation vs. retailer traps",
            "📈 Visualizing market value instead of just price noise"
        ]
    },
    {
        "title": "Understanding Value (POC, VAH, VAL)",
        "subtitle": "Value Theory & Practical Examples",
        "voiceover": "To trade like an institution, you must understand Value. The Point of Control—or POC—is the price where the market spent the most time. For example, if Nifty trades between twenty-four thousand and twenty-four thousand one hundred for six hours, but prints most of its letters at twenty-four thousand and fifty, then twenty-four thousand and fifty is the POC. It is the fairest price of the day. The Value Area High and Low—VAH and VAL—bound the seventy percent area of time spent. If price opens outside value, it is in imbalance. If it re-enters yesterday's value area, it has an eighty percent probability of rotating all the way to the opposite side.",
        "bullets": [
            "🔵 Point of Control (POC): The fairest price of the session",
            "🟩 Value Area High & Low: The 70% zone of market acceptance",
            "💡 Imbalance Example: Price trading outside yesterday's VAH/VAL",
            "🎯 The 80% Rule: A rotation trade from one value boundary to the other"
        ]
    },
    {
        "title": "Initial Balance & Day Structures",
        "subtitle": "Defining the Session Playground & Types of Days",
        "voiceover": "The first hour of trading—Period A and Period B—forms the Initial Balance, or I B. The I B defines the session's playground. The size of the I B tells us what type of day is forming. A narrow I B indicates low morning conviction, which often leads to a violent Trend Day or Double Distribution Day as institutions break the boundaries. A wide I B represents high morning conviction, leading to a Rotational Day or Normal Variation Day where price oscillates within the boundaries. By tracking the I B, you know whether to go with breakouts or fade the extremes.",
        "bullets": [
            "⏳ Initial Balance (IB): First 60 minutes of trading (Period A & B)",
            "🏃 Trend Day: Violent one-direction move breaking IB extremes",
            "⚖️ Rotational Day: Chops sideways, respecting VAH and VAL boundaries",
            "📦 Double Distribution: Two distinct value areas separated by single prints"
        ]
    },
    {
        "title": "Market Profile Nuances",
        "subtitle": "Identifying Structural Anomalies & Edge Signals",
        "voiceover": "Nuances are structural anomalies that act as leading indicators of future moves. Single prints are thin areas where price moved so fast that only one period printed. These are institutional vacuums and act as strong support or resistance on a retest. Poor Highs and Poor Lows are flat extremes with no tail rejection. These represent unfinished auctions—the market got cut off and must return to clear those prices. Secure Tails represent strong excess rejection at session limits, showing that smart money stepped in aggressively.",
        "bullets": [
            "🗛 Single Prints: Institutional vacuum zones that act as support/resistance",
            "🎯 Poor High / Low: Unfinished auctions that act as price magnets",
            "🧬 Rejection Tails: 2 or more single TPOs at extremes showing excess",
            "📈 Open Relationship: Open relationship compared to yesterday's value"
        ]
    },
    {
        "title": "How the Live Scanner Works",
        "subtitle": "Real-Time Setup Detection & Win-Rate Badges",
        "voiceover": "During market hours, the Live Scanner actively reads real-time feeds from all symbols. The moment a setup triggers—like Nifty entering the 80% Value Area or a stock printing an afternoon Kangaroo Jump—it instantly flashes on your scanner table. But the scanner doesn't just show the setup. It pulls the exact historical win-rate we calculated for that stock and renders it directly on the badge. This tells you if a setup has a sixty percent or seventy percent historical success rate before you place your trade.",
        "bullets": [
            "⚡ Real-time alerts for 80% Rule, Kangaroo Jumps, and Tails",
            "📈 Win-Rate Badges: Shows calculated success probability per stock",
            "🔍 Direct Navigation: Click a scanner row to auto-load TPO charts",
            "💼 Filters: Sort by setup strength, volume, and balance status"
        ]
    },
    {
        "title": "GEX (Gamma Exposure) Profiles",
        "subtitle": "Mapping Options Hedging Walls",
        "voiceover": "Next, let's look at Options Gamma Exposure, or GEX. Options market makers dominate daily index price action. The Call Wall represents the highest concentration of positive gamma, acting as a magnet but a strong ceiling. The Put Wall represents the largest negative gamma, acting as a hard floor. The Gamma Flip Zone is the inflection point. Above it, volatility is suppressed. Below it, volatility explodes as market makers short futures to hedge their positions.",
        "bullets": [
            "🏰 Call Wall: Magnetic target & major upside resistance strike",
            "🧱 Put Wall: Heavy derivative support floor strike",
            "⚡ Gamma Flip Zone: Zero-gamma inflection point",
            "📉 High Volatility (Negative Gamma) vs. Low Volatility (Positive Gamma)"
        ]
    },
    {
        "title": "PCR Sentiment Reversals",
        "subtitle": "Trading Reversals at Sentiment Extremes",
        "voiceover": "We also track the Put-Call Ratio, or PCR, mapped against our study of twenty-six thousand sessions. Extreme Fear, where the PCR is one point two-five or higher, indicates traders are overloaded on puts. This leads to short-covering rallies, resulting in a green close ninety-seven point three percent of the time. Extreme Greed, where the PCR is zero point six-five or lower, indicates high complacency. Only four point eight percent of these sessions close green, making short plays highly profitable.",
        "bullets": [
            "😨 Extreme Fear (PCR >= 1.25): 97.3% Green Close (Short-Covering)",
            "🤑 Extreme Greed (PCR <= 0.65): 95.2% Red Close (Distribution)",
            "⚖️ Neutral Balance: 60% probability of touching yesterday's POC",
            "📉 Automatically updates stock and index statistics daily"
        ]
    },
    {
        "title": "Pre-Market & Closing Scanners",
        "subtitle": "9:00 AM Preparation & 3:15 PM Closing Setups",
        "voiceover": "Finally, the server runs two automated scan reports. At nine AM, the Pre-Market Scanner flags three-day compressions, where Point of Controls are extremely tight. This gives you your exact breakout bracket levels. It also flags magnet targets at poor highs and lows. At three-fifteen PM, the BTST Scanner runs, identifying gap up and gap down candidates based on where price is closing relative to yesterday's value area high and low.",
        "bullets": [
            "🗜️ 9:00 AM Compressions: Flags tight POCs for breakout brackets",
            "🎯 9:00 AM Magnet Targets: Identifies poor extremes to clear early",
            "🚀 3:15 PM BTST: Detects closing gaps above VAH or below VAL",
            "🧬 3:15 PM Tails: Identifies secure tails for overnight continuation"
        ]
    }
]

# Slide drawing configurations
WIDTH, HEIGHT = 1280, 720
FPS = 24

def draw_slide(title, subtitle, bullets):
    # Create dark gradient background
    img = Image.new('RGB', (WIDTH, HEIGHT), color='#09090b')
    draw = ImageDraw.Draw(img)
    
    # Simple background gradient
    for y in range(HEIGHT):
        r = int(9 + (y / HEIGHT) * 15)
        g = int(9 + (y / HEIGHT) * 15)
        b = int(11 + (y / HEIGHT) * 15)
        draw.line([(0, y), (WIDTH, y)], fill=f"#{r:02x}{g:02x}{b:02x}")

    # Load default fonts
    try:
        title_font = ImageFont.truetype("arialbd.ttf", 46)
        sub_font = ImageFont.truetype("arial.ttf", 22)
        bullet_font = ImageFont.truetype("arial.ttf", 26)
        footer_font = ImageFont.truetype("arialbd.ttf", 16)
    except IOError:
        title_font = ImageFont.load_default(40)
        sub_font = ImageFont.load_default(20)
        bullet_font = ImageFont.load_default(24)
        footer_font = ImageFont.load_default(16)

    # Drawing title badge border
    draw.rectangle([50, 50, 1230, 160], outline="#a855f7", width=2)
    
    # Title & Subtitle
    draw.text((80, 65), title, fill="#c084fc", font=title_font)
    draw.text((80, 120), subtitle, fill="#9ca3af", font=sub_font)
    
    # Drawing Bullet Points
    start_y = 230
    for i, bullet in enumerate(bullets):
        draw.text((100, start_y + i * 80), bullet, fill="white", font=bullet_font)

    # Footer
    draw.line([(50, 650), (1230, 650)], fill="#27272a", width=1)
    draw.text((80, 665), "BHAICHARA MARKET PROFILE SCANNER", fill="#60a5fa", font=footer_font)
    draw.text((880, 665), "https://bhaichara-scanner-mihir.serveousercontent.com", fill="#9ca3af", font=footer_font)
    
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

# Step 1: Generate slide images & audio tracks
temp_video_path = os.path.join(output_dir, "temp_video.mp4")
temp_audio_path = os.path.join(output_dir, "temp_audio.mp3")

audio_files = []
video_writer = cv2.VideoWriter(
    temp_video_path,
    cv2.VideoWriter_fourcc(*'mp4v'),
    FPS,
    (WIDTH, HEIGHT)
)

print("[Video Gen] Generating clean slides and speech audio...")
for idx, scene in enumerate(scenes):
    # Generate Voiceover MP3
    tts = gTTS(text=scene["voiceover"], lang='en', tld='co.uk')
    scene_audio_path = os.path.join(output_dir, f"scene_{idx}.mp3")
    tts.save(scene_audio_path)
    audio_files.append(scene_audio_path)
    
    # Get audio duration
    cmd = [
        'ffprobe', '-v', 'error', 
        '-show_entries', 'format=duration', 
        '-of', 'default=noprint_wrappers=1:nokey=1', 
        scene_audio_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, text=True)
    duration = float(res.stdout.strip())
    print(f"Scene {idx+1} audio duration: {duration:.2f} seconds")
    
    # Draw slide & write frames
    slide_frame = draw_slide(scene["title"], scene["subtitle"], scene["bullets"])
    frame_count = int(duration * FPS)
    for _ in range(frame_count):
        video_writer.write(slide_frame)

video_writer.release()
print("[Video Gen] Finished writing silent video frames.")

# Step 2: Combine all scene audio files into one single track
concat_list_path = os.path.join(output_dir, "audio_concat.txt")
with open(concat_list_path, 'w', encoding='utf-8') as f:
    for audio_path in audio_files:
        f.write(f"file '{os.path.basename(audio_path)}'\n")

print("[Video Gen] Concatenating audio scenes...")
cmd = [
    'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
    '-i', concat_list_path, '-c', 'copy', temp_audio_path
]
subprocess.run(cmd, cwd=output_dir)

# Step 3: Merge silent video and concatenated audio
final_video_path = os.path.join(output_dir, "bhaichara_walkthrough.mp4")
print("[Video Gen] Merging audio and video tracks...")
cmd = [
    'ffmpeg', '-y',
    '-i', temp_video_path,
    '-i', temp_audio_path,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-shortest',
    final_video_path
]
subprocess.run(cmd)

# Step 4: Clean up temporary files
print("[Video Gen] Cleaning up temporary assets...")
for path in audio_files:
    if os.path.exists(path):
        os.remove(path)
if os.path.exists(temp_video_path):
    os.remove(temp_video_path)
if os.path.exists(temp_audio_path):
    os.remove(temp_audio_path)
if os.path.exists(concat_list_path):
    os.remove(concat_list_path)

print(f"[Video Gen] Clean video walkthrough generated successfully at {final_video_path}!")
