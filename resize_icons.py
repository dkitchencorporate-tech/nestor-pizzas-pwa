import sys
from PIL import Image

try:
    img = Image.open('assets/brand/logo_exact_2k.png')
    
    # 192x192
    img192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    img192.save('assets/brand/icon-192x192.png')
    
    # 512x512
    img512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img512.save('assets/brand/icon-512x512.png')
    
    print("Icons successfully generated!")
except Exception as e:
    print(f"Error: {e}")
