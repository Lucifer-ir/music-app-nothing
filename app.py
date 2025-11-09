import base64
import io
import os
import json
from flask import Flask, render_template, jsonify, send_from_directory, request, redirect, url_for, flash
from PIL import Image, ImageDraw, ImageOps, ImageStat
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SECRET_KEY'] = 'a-very-secret-key-that-should-be-changed'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///music_player.db'
app.config['UPLOAD_FOLDER'] = 'uploads'

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(150), nullable=False)
    songs = db.relationship('Song', backref='owner', lazy=True)

class Song(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    artist = db.Column(db.String(150), nullable=False)
    music_file = db.Column(db.String(150), nullable=False)
    art_file = db.Column(db.String(150), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

DOT_FONT = {
    '0': ['111', '101', '101', '101', '111'],
    '1': ['010', '110', '010', '010', '111'],
    '2': ['111', '001', '111', '100', '111'],
    '3': ['111', '001', '111', '001', '111'],
    '4': ['101', '101', '111', '001', '001'],
    '5': ['111', '100', '111', '001', '111'],
    '6': ['111', '100', '111', '101', '111'],
    '7': ['111', '001', '010', '010', '010'],
    '8': ['111', '101', '111', '101', '111'],
    '9': ['111', '101', '111', '001', '111'],
    ':': ['000', '010', '000', '010', '000'],
}

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def get_dot_matrix_from_image(image_path, spacing=8):
    """
    Analyzes an image and returns a matrix of brightness values.
    This matrix will be used by the frontend to render divs.
    """
    try:
        if not os.path.exists(image_path): return None
        img_original = Image.open(image_path).convert('L')
        # Equalize the histogram to improve contrast, especially for dark images
        img = ImageOps.equalize(img_original, mask=None)

        width, height = img.size
        
        # Ensure the output matrix is roughly square with about 40-50 dots per side
        num_dots_wide = 45
        spacing = max(width // num_dots_wide, 1)
        
        dot_matrix = []
        for y in range(0, height - spacing, spacing):
            for x in range(0, width - spacing, spacing):
                # Define a box and calculate the average brightness of that region
                box = (x, y, x + spacing, y + spacing)
                region = img.crop(box)
                stats = ImageStat.Stat(region)
                brightness = stats.mean[0] # mean brightness of the region
                dot_matrix.append(brightness / 255.0) # Normalize brightness to 0.0-1.0
        
        num_cols = len(range(0, width - spacing, spacing))
        return {"matrix": dot_matrix, "cols": num_cols}
    except Exception as e:
        print(f"Error processing image {image_path}: {e}")
        return None
@app.route('/')
def index():
    processed_songs = []
    all_songs = Song.query.all() # Get all songs from all users

    for song in all_songs:
        art_path = os.path.join(app.config['UPLOAD_FOLDER'], 'album_art', song.art_file)
        dot_matrix_data = get_dot_matrix_from_image(art_path)

        processed_songs.append({
            "title": song.title,
            "artist": song.artist,
            "song_id": song.id,
            "owner_id": song.owner.id,
            "file_url": f"/music/{song.music_file}",
            "art_dot_matrix": dot_matrix_data,
            "original_art_url": f"/art/{song.art_file}"
        })
    return render_template(
        'index.html', 
        songs=processed_songs, 
        dot_font_json=json.dumps(DOT_FONT)
    )

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password_hash, password):
            login_user(user, remember=True)
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)
            return redirect(url_for('index'))
        else:
            flash('Invalid username or password')
    return render_template('login.html', dot_font_json=json.dumps(DOT_FONT))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        if user:
            flash('Username already exists.')
            return redirect(url_for('register'))
        
        new_user = User(username=username, password_hash=generate_password_hash(password, method='pbkdf2:sha256'))
        db.session.add(new_user)
        db.session.commit()
        login_user(new_user, remember=True)
        return redirect(url_for('index'))
    return render_template('register.html', dot_font_json=json.dumps(DOT_FONT))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/upload', methods=['GET', 'POST'])
@login_required
def upload():
    if request.method == 'POST':
        if 'music_file' not in request.files or 'art_file' not in request.files:
            flash('No file part')
            return redirect(request.url)
        
        music_file = request.files['music_file']
        art_file = request.files['art_file']
        title = request.form.get('title')
        artist = request.form.get('artist')

        if music_file.filename == '' or art_file.filename == '':
            flash('No selected file')
            return redirect(request.url)

        if music_file and art_file:
            music_filename = secure_filename(f"{current_user.id}_{music_file.filename}")
            art_filename = secure_filename(f"{current_user.id}_{art_file.filename}")
            
            music_file.save(os.path.join(app.config['UPLOAD_FOLDER'], 'music', music_filename))
            art_file.save(os.path.join(app.config['UPLOAD_FOLDER'], 'album_art', art_filename))

            new_song = Song(title=title, artist=artist, music_file=music_filename, art_file=art_filename, owner=current_user)
            db.session.add(new_song)
            db.session.commit()
            flash('Song uploaded successfully!')
            return redirect(url_for('index'))

    return render_template('upload.html', dot_font_json=json.dumps(DOT_FONT))

@app.route('/delete_song/<int:song_id>', methods=['POST'])
@login_required
def delete_song(song_id):
    song = Song.query.get_or_404(song_id)
    if song.owner != current_user:
        return jsonify({'error': 'Permission denied'}), 403

    try:
        # Delete physical files
        os.remove(os.path.join(app.config['UPLOAD_FOLDER'], 'music', song.music_file))
        os.remove(os.path.join(app.config['UPLOAD_FOLDER'], 'album_art', song.art_file))

        # Delete from database
        db.session.delete(song)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/music/<filename>')
def serve_music(filename):
    # This check is important for security, although filenames are already secured.
    if '..' in filename or filename.startswith('/'):
        return "Invalid filename", 400
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], 'music'), filename)

@app.route('/art/<filename>')
def serve_art(filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], 'album_art'), filename)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Create upload directories if they don't exist
        os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'music'), exist_ok=True)
        os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'album_art'), exist_ok=True)
    app.run(debug=True)