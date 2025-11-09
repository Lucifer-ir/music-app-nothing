import base64
import io
from flask import Flask, render_template, request
from PIL import Image, ImageDraw

app = Flask(__name__)

def image_to_dots(image_stream, dot_size=5, spacing=10):
    """
    تصویر ورودی را به یک تصویر نقطه‌ای تبدیل می‌کند.
    روشنایی هر ناحیه، اندازه نقطه سفید را تعیین می‌کند.
    """
    try:
        # باز کردن تصویر و تبدیل به حالت سیاه‌وسفید (Grayscale)
        img = Image.open(image_stream).convert('L')
        width, height = img.size

        # ساخت یک تصویر جدید با پس‌زمینه سیاه
        new_img = Image.new('RGB', (width, height), 'black')
        draw = ImageDraw.Draw(new_img)

        # پیمایش تصویر با گام‌های مشخص (spacing)
        for y in range(0, height, spacing):
            for x in range(0, width, spacing):
                # دریافت روشنایی پیکسل (0=سیاه, 255=سفید)
                brightness = img.getpixel((x, y))

                # محاسبه اندازه نقطه بر اساس روشنایی
                # هرچه پیکسل اصلی روشن‌تر باشد، نقطه بزرگتر است
                radius = (brightness / 255) * (dot_size / 2)

                if radius > 0:
                    # محاسبه مختصات برای رسم دایره (نقطه)
                    left_up_point = (x - radius, y - radius)
                    right_down_point = (x + radius, y + radius)
                    
                    # رسم یک دایره سفید
                    draw.ellipse([left_up_point, right_down_point], fill='white')
        
        return new_img

    except Exception as e:
        print(f"An error occurred: {e}")
        return None

@app.route('/', methods=['GET'])
def index():
    """صفحه اصلی را نمایش می‌دهد که فرم آپلود در آن قرار دارد."""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """فایل را دریافت، پردازش و نتیجه را نمایش می‌دهد."""
    if 'file' not in request.files:
        return "No file part"
    
    file = request.files['file']
    if file.filename == '':
        return "No selected file"

    if file:
        # خواندن کل فایل در یک بایت استریم در حافظه
        # این کار از بروز خطاهای احتمالی در خواندن استریم جلوگیری می‌کند
        in_memory_file = io.BytesIO(file.read())

        # پردازش تصویر
        processed_image = image_to_dots(in_memory_file)

        if processed_image:
            # تبدیل تصویر پردازش‌شده به فرمتی که بتوان در HTML نمایش داد (Base64)
            buffered = io.BytesIO()
            processed_image.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            # ارسال تصویر به قالب result.html
            return render_template('result.html', image_data=img_str)
        else:
            return "Could not process image"

    return "Something went wrong"

if __name__ == '__main__':
    app.run(debug=True)
