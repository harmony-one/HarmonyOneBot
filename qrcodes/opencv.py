import cv2
import glob
import os
import numpy as np

def read_qr_code(filename):
    """Read an image and read the QR code.

    Args:
        filename (string): Path to file

    Returns:
        qr (string): Value from QR code
    """


    try:
        img = cv2.imread(filename)
        detect = cv2.QRCodeDetector()

#         copy = cv2.copyMakeBorder(img, 50, 50, 50, 50, cv2.BORDER_CONSTANT, None, value = 0)
#         print(a)
        exposure_factor = 1.5
#         cv2.imwrite('result/' + filename, 255 - cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
#         cv2.imwrite('result/' + filename, np.clip(img * exposure_factor, 0, 255).astype(np.uint8))
        gray_image = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresholded_image = cv2.threshold(gray_image, 128, 255, cv2.THRESH_BINARY)

        total_pixels = thresholded_image.size
        black_pixels = cv2.countNonZero(thresholded_image)
        percentage_black = (black_pixels / total_pixels) * 100


        blurred_image = thresholded_image #  cv2.GaussianBlur(thresholded_image, (5, 5), 0)
#         blurred_image = cv2.GaussianBlur(thresholded_image, (5, 5), 0)
        inverted = blurred_image if percentage_black > 40 else 255-blurred_image
        bordered = cv2.copyMakeBorder(inverted, 150, 150, 150, 150, cv2.BORDER_CONSTANT, value=(255, 255, 255))
        resized = cv2.resize(inverted, dsize=(1000, 1000), interpolation=cv2.INTER_CUBIC)

        cv2.imwrite('result/' + filename, inverted)
        value, _ = detect.detect(inverted)
#         value, points, straight_qrcode = detect.detectAndDecode(cv2.resize(img, dsize=(350, 350), interpolation=cv2.INTER_CUBIC))
#         value, points, straight_qrcode = detect.detectAndDecode(copy)
# detect.detect(cv2.resize(img, dsize=(250, 250), interpolation=cv2.INTER_CUBIC))
#         value, points, straight_qrcode = detect.detectAndDecode(cv2.resize(img, dsize=(500, 500), interpolation=cv2.INTER_CUBIC))
#         value, points, straight_qrcode = detect.detectAndDecode(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
        return value
    except Exception as e:
        print(f"An exception occurred: {e}")
        return


directory_path = "./result"

# List all files in the directory
file_list = os.listdir(directory_path)

print(file_list)

for filename in file_list:
    print(filename)


files = glob.glob('images/*.jpg') + glob.glob('images/*.png') + glob.glob('images/*.jpeg')

for file in files:
    print(file)
    qr = read_qr_code(file)
    print(qr)