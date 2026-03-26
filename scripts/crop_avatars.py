"""裁剪玩家立绘为正方形头像"""
from PIL import Image
import os

SRC = r'd:\LX\tl-simulator\knowledge-base\apps\tl-simulator\public\assets\玩家立绘'
DST = r'd:\LX\tl-simulator\knowledge-base\apps\tl-simulator\public\assets\玩家头像'
os.makedirs(DST, exist_ok=True)

AVATAR_SIZE = 256  # 输出尺寸

# 每张图的脸部中心坐标和裁剪半径（基于 2752x1536 的原图）
# 格式: (center_x, center_y, crop_half_size)
CROPS = {
    '主人公橙.png': (1376, 768, 768),   # 满高半身像，包含完整手臂
    '主人公绿.png': (1350, 500, 550),   # 保持不变（用户未要求调整她）
    '主人公蓝.png': (1250, 768, 768),   # 满高半身像，包含完整身体
    '剧作家.png':   (1376, 768, 768),   # 满高半身像，包含完整羽毛笔
}

for filename, (cx, cy, half) in CROPS.items():
    src_path = os.path.join(SRC, filename)
    if not os.path.exists(src_path):
        print(f"Warning: {filename} not found")
        continue
    
    img = Image.open(src_path)
    w, h = img.size
    print(f"{filename}: {w}x{h}")
    
    # 裁剪区域
    left = max(0, cx - half)
    top = max(0, cy - half)
    right = min(w, cx + half)
    bottom = min(h, cy + half)
    
    cropped = img.crop((left, top, right, bottom))
    
    # 缩放到目标尺寸
    avatar = cropped.resize((AVATAR_SIZE, AVATAR_SIZE), Image.LANCZOS)
    
    dst_path = os.path.join(DST, filename)
    avatar.save(dst_path, 'PNG')
    print(f"  -> saved: {dst_path} ({AVATAR_SIZE}x{AVATAR_SIZE})")

print("Done!")
