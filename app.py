import base64
import io
import os
from flask import Flask, render_template, jsonify, send_from_directory
from PIL import Image, ImageDraw
app = Flask(__name__)
SONGS = [
    {
        "id": 1,
        "title": "Sample Track",
        "artist": "Artist Name",
        "file": "music-1.mp3",
        "art": "music-1.webp"
    },
]
def image_to_dots(image_path, dot_size=3, spacing=4):
    try:
        img = Image.open(image_path).convert('L')
        width, height = img.size
        new_img = Image.new('RGB', (width, height), 'black')
        draw = ImageDraw.Draw(new_img)
        for y in range(0, height, spacing):
            for x in range(0, width, spacing):
                brightness = img.getpixel((x, y))
                radius = (brightness / 255) * (dot_size / 2)
                if radius > 0.5:
                    draw.ellipse(
                        (x - radius, y - radius, x + radius, y + radius), 
                        fill='white'
                    )
        return new_img
    except Exception as e:
        print(f"Error processing image {image_path}: {e}")
        return None
@app.route('/')
def index():
    processed_songs = []
    for song in SONGS:
        art_path = os.path.join('static', 'album_art', song['art'])
        processed_image = image_to_dots(art_path)
        img_data = None
        if processed_image:
            buffered = io.BytesIO()
            processed_image.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            img_data = f"data:image/png;base64,{img_str}"
        processed_songs.append({
            "title": song["title"],
            "artist": song["artist"],
            "file_url": f"/music/{song['file']}",
            "art_data": img_data,
            "original_art_url": f"/art/{song['art']}"
        })
    return render_template('index.html', songs=processed_songs)
@app.route('/music/<filename>')
def serve_music(filename):
    return send_from_directory(os.path.join('static', 'music'), filename)

@app.route('/art/<filename>')
def serve_art(filename):
    return send_from_directory(os.path.join('static', 'album_art'), filename)

if __name__ == '__main__':
    app.run(debug=True)